import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  Position,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { useStore } from '../store/useStore';
import { snapToGrid } from '../utils/snapToGrid';
import type { EdgeWaypoint } from '../types';
import type { EdgeType } from '../types';

interface EditableEdgeData {
  waypoints?: EdgeWaypoint[];
  edgeType?: EdgeType;
  edgeStrokeWidth?: number;
  edgeAnimated?: boolean;
  [key: string]: unknown;
}

type Props = EdgeProps & { data?: EditableEdgeData };

type PathStyle = 'bezier' | 'straight' | 'orthogonal' | 'smoothstep';

function edgeTypeToPathStyle(et: EdgeType): PathStyle {
  switch (et) {
    case 'straight': return 'straight';
    case 'step': return 'orthogonal';
    case 'smoothstep': return 'smoothstep';
    default: return 'bezier';
  }
}

function buildSvgPathWithWaypoints(
  sx: number, sy: number, tx: number, ty: number,
  waypoints: EdgeWaypoint[], pathStyle: PathStyle
): string {
  const pts: EdgeWaypoint[] = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];

  if (pathStyle === 'straight') {
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  if (pathStyle === 'orthogonal') {
    const n = normalizePtsForOrthogonal(pts);
    let d = `M ${n[0].x} ${n[0].y}`;
    for (let i = 1; i < n.length; i++) {
      const prev = n[i - 1], cur = n[i];
      const dx = Math.abs(prev.x - cur.x), dy = Math.abs(prev.y - cur.y);
      if (dx < 0.5 || dy < 0.5) {
        d += ` L ${cur.x} ${cur.y}`;
      } else {
        d += ` L ${cur.x} ${prev.y} L ${cur.x} ${cur.y}`;
      }
    }
    return d;
  }

  if (pathStyle === 'smoothstep') {
    const radius = 5;
    const n = normalizePtsForOrthogonal(pts);
    let d = `M ${n[0].x} ${n[0].y}`;
    for (let i = 1; i < n.length; i++) {
      const prev = n[i - 1], cur = n[i];
      const dx = Math.abs(prev.x - cur.x), dy = Math.abs(prev.y - cur.y);
      if (dx < 0.5 || dy < 0.5) {
        d += ` L ${cur.x} ${cur.y}`;
      } else {
        const r = Math.min(radius, dx, dy);
        if (r > 0.5) {
          const toRight = cur.x > prev.x, toDown = cur.y > prev.y;
          d += ` L ${cur.x + (toRight ? -r : r)} ${prev.y}`;
          d += ` Q ${cur.x} ${prev.y} ${cur.x} ${prev.y + (toDown ? r : -r)}`;
          d += ` L ${cur.x} ${cur.y + (toDown ? -r : r)}`;
          d += ` Q ${cur.x} ${cur.y} ${cur.x + (toRight ? r : -r)} ${cur.y}`;
          d += ` L ${cur.x} ${cur.y}`;
        } else {
          d += ` L ${cur.x} ${prev.y} L ${cur.x} ${cur.y}`;
        }
      }
    }
    return d;
  }

  if (pts.length === 2) {
    const dx = Math.abs(tx - sx) * 0.25;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function mid(a: EdgeWaypoint, b: EdgeWaypoint): EdgeWaypoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Segment with insert index for waypoint addition. */
interface PolylineSegment {
  ax: number; ay: number; bx: number; by: number;
  insertIdx: number;
}

/** Get polyline segments for orthogonal/smoothstep path (H-first, matches actual rendered path). */
function getOrthogonalPolylineSegments(pts: EdgeWaypoint[]): PolylineSegment[] {
  const n = normalizePtsForOrthogonal(pts);
  const segments: PolylineSegment[] = [];
  for (let i = 1; i < n.length; i++) {
    const prev = n[i - 1], cur = n[i];
    const dx = Math.abs(prev.x - cur.x), dy = Math.abs(prev.y - cur.y);
    if (dx < 0.5 || dy < 0.5) {
      segments.push({ ax: prev.x, ay: prev.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
    } else {
      segments.push({ ax: prev.x, ay: prev.y, bx: cur.x, by: prev.y, insertIdx: i - 1 });
      segments.push({ ax: cur.x, ay: prev.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
    }
  }
  return segments;
}

function findNearestSegment(pt: EdgeWaypoint, allPts: EdgeWaypoint[], pathStyle?: PathStyle): number {
  const pts: EdgeWaypoint[] = allPts;
  if (pathStyle === 'orthogonal' || pathStyle === 'smoothstep') {
    const segments = getOrthogonalPolylineSegments(pts);
    let bestInsertIdx = 0, bestDist = Infinity;
    for (const seg of segments) {
      const d = distToSegment(pt.x, pt.y, seg.ax, seg.ay, seg.bx, seg.by);
      if (d < bestDist) { bestDist = d; bestInsertIdx = seg.insertIdx; }
    }
    return bestInsertIdx;
  }
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(pt.x, pt.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/** Normalize pts for orthogonal/smoothstep: snap nearly axis-aligned segments
 *  so path and corner handles stay consistent (no last-drift). */
function normalizePtsForOrthogonal(pts: EdgeWaypoint[]): EdgeWaypoint[] {
  if (pts.length <= 1) return [...pts];
  const out: EdgeWaypoint[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const last = out[i - 1];
    const cur = pts[i];
    const dx = Math.abs(last.x - cur.x), dy = Math.abs(last.y - cur.y);
    if (dx < 0.5) {
      out.push({ x: last.x, y: cur.y });
    } else if (dy < 0.5) {
      out.push({ x: cur.x, y: last.y });
    } else {
      out.push({ x: cur.x, y: cur.y });
    }
  }
  return out;
}

/** Default corner waypoints for step/smoothstep with no user waypoints.
 *  Returns two axis-aligned corners that form a clean L-shape. */
function getDefaultCornerWaypoints(
  sx: number, sy: number, tx: number, ty: number, gridSize = 8
): EdgeWaypoint[] {
  if (Math.abs(sy - ty) < 0.5 || Math.abs(sx - tx) < 0.5) return [];
  const mxVal = (sx + tx) / 2;
  const { x: mx } = snapToGrid(mxVal, sy, gridSize);
  const { y: y0 } = snapToGrid(sx, sy, gridSize);
  const { y: y1 } = snapToGrid(sx, ty, gridSize);
  return [{ x: mx, y: y0 }, { x: mx, y: y1 }];
}

// ---- Context menu state ----
interface CtxMenu {
  x: number;
  y: number;
  type: 'edge' | 'waypoint';
  waypointIdx?: number;
  flowPos: EdgeWaypoint;
}

const EditableEdge: React.FC<Props> = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition = Position.Right, targetPosition = Position.Left,
  data, selected, style, markerEnd, animated,
}) => {
  const waypoints = data?.waypoints ?? [];
  const edgeType = data?.edgeType ?? 'default';
  const pathStyle = edgeTypeToPathStyle(edgeType);
  const updateEdgeWaypoints = useStore((s) => s.updateEdgeWaypoints);
  const addEdgeWaypoint = useStore((s) => s.addEdgeWaypoint);
  const removeEdgeWaypoint = useStore((s) => s.removeEdgeWaypoint);
  const pushSnapshot = useStore((s) => s._pushSnapshot);
  const snapEnabled = useStore((s) => s.settings.snapEnabled ?? true);
  const gridSize = useStore((s) => s.settings.snapGridSize ?? 8);
  const effectiveGridSize = snapEnabled && gridSize > 0 ? gridSize : 0;
  const { screenToFlowPosition } = useReactFlow();

  const [hoveredWp, setHoveredWp] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [lineDrag, setLineDrag] = useState<{ idx: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [ctxMenu]);

  const hasSquareCorners = pathStyle === 'orthogonal' || pathStyle === 'smoothstep';

  const effectiveWaypoints = useMemo(() => {
    if (hasSquareCorners && waypoints.length === 0) {
      return getDefaultCornerWaypoints(sourceX, sourceY, targetX, targetY, effectiveGridSize);
    }
    return waypoints;
  }, [hasSquareCorners, waypoints, sourceX, sourceY, targetX, targetY, effectiveGridSize]);

  const svgPath = useMemo(() => {
    if (effectiveWaypoints.length === 0 && waypoints.length === 0) {
      if (edgeType === 'straight') return getStraightPath({ sourceX, sourceY, targetX, targetY })[0];
      if (edgeType === 'default') return getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })[0];
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }
    return buildSvgPathWithWaypoints(sourceX, sourceY, targetX, targetY, effectiveWaypoints, pathStyle);
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, effectiveWaypoints, waypoints.length, edgeType, pathStyle]);

  const allPoints = useMemo(
    () => [{ x: sourceX, y: sourceY }, ...effectiveWaypoints, { x: targetX, y: targetY }],
    [sourceX, sourceY, effectiveWaypoints, targetX, targetY]
  );

  // ---- Drag existing waypoint ----
  const handleWpPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation(); e.preventDefault();
    pushSnapshot();
    if (hasSquareCorners && waypoints.length === 0) {
      updateEdgeWaypoints(id, [...getDefaultCornerWaypoints(sourceX, sourceY, targetX, targetY, effectiveGridSize)], true);
    }
    setDragging(idx);
    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const currentWps = useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [];
      const next = [...currentWps];
      if (idx >= 0 && idx < next.length) {
        let snappedPt = effectiveGridSize > 0 ? snapToGrid(pos.x, pos.y, effectiveGridSize) : { x: pos.x, y: pos.y };

        // Smart snapping to source/target handles
        if (effectiveGridSize > 0) {
          const snapThreshold = effectiveGridSize;
          if (Math.abs(pos.x - sourceX) < snapThreshold) snappedPt.x = sourceX;
          else if (Math.abs(pos.x - targetX) < snapThreshold) snappedPt.x = targetX;

          if (Math.abs(pos.y - sourceY) < snapThreshold) snappedPt.y = sourceY;
          else if (Math.abs(pos.y - targetY) < snapThreshold) snappedPt.y = targetY;
        }

        next[idx] = snappedPt;
        updateEdgeWaypoints(id, next, true);
      }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setDragging(null);
      updateEdgeWaypoints(id, useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [], false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [id, waypoints, updateEdgeWaypoints, screenToFlowPosition, pushSnapshot, hasSquareCorners, sourceX, sourceY, targetX, targetY, effectiveGridSize]);

  // ---- Double-click waypoint to remove ----
  const handleWpDoubleClick = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (hasSquareCorners && waypoints.length === 0) {
      updateEdgeWaypoints(id, [...getDefaultCornerWaypoints(sourceX, sourceY, targetX, targetY, effectiveGridSize)], true);
    }
    removeEdgeWaypoint(id, idx);
  }, [id, removeEdgeWaypoint, hasSquareCorners, waypoints.length, updateEdgeWaypoints, sourceX, sourceY, targetX, targetY, effectiveGridSize]);

  // ---- Click "+" to add waypoint at segment midpoint ----
  const handleAddWaypoint = useCallback((e: React.MouseEvent, segmentIdx: number) => {
    e.stopPropagation();
    const mp = mid(allPoints[segmentIdx], allPoints[segmentIdx + 1]);
    let pt = effectiveGridSize > 0 ? snapToGrid(mp.x, mp.y, effectiveGridSize) : { x: mp.x, y: mp.y };

    // Smart snapping to source/target handles
    if (effectiveGridSize > 0) {
      const snapThreshold = effectiveGridSize;
      if (Math.abs(mp.x - sourceX) < snapThreshold) pt.x = sourceX;
      else if (Math.abs(mp.x - targetX) < snapThreshold) pt.x = targetX;

      if (Math.abs(mp.y - sourceY) < snapThreshold) pt.y = sourceY;
      else if (Math.abs(mp.y - targetY) < snapThreshold) pt.y = targetY;
    }

    addEdgeWaypoint(id, segmentIdx, pt);
  }, [id, allPoints, addEdgeWaypoint, effectiveGridSize]);

  // ---- Drag on connector line to insert + immediately drag new waypoint ----
  const handleLineDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    pushSnapshot();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    let wp = effectiveGridSize > 0 ? snapToGrid(flowPos.x, flowPos.y, effectiveGridSize) : { x: flowPos.x, y: flowPos.y };
    // Smart snapping to source/target handles
    if (effectiveGridSize > 0) {
      const snapThreshold = effectiveGridSize;
      if (Math.abs(flowPos.x - sourceX) < snapThreshold) wp.x = sourceX;
      else if (Math.abs(flowPos.x - targetX) < snapThreshold) wp.x = targetX;

      if (Math.abs(flowPos.y - sourceY) < snapThreshold) wp.y = sourceY;
      else if (Math.abs(flowPos.y - targetY) < snapThreshold) wp.y = targetY;
    }
    const segIdx = findNearestSegment(wp, allPoints, pathStyle);
    addEdgeWaypoint(id, segIdx, wp);
    const newIdx = segIdx;
    setLineDrag({ idx: newIdx });

    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const currentWps = useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [];
      const next = [...currentWps];
      if (next[newIdx]) {
        let snappedPt = effectiveGridSize > 0 ? snapToGrid(pos.x, pos.y, effectiveGridSize) : { x: pos.x, y: pos.y };

        // Smart snapping to source/target handles
        if (effectiveGridSize > 0) {
          const snapThreshold = effectiveGridSize;
          if (Math.abs(pos.x - sourceX) < snapThreshold) snappedPt.x = sourceX;
          else if (Math.abs(pos.x - targetX) < snapThreshold) snappedPt.x = targetX;

          if (Math.abs(pos.y - sourceY) < snapThreshold) snappedPt.y = sourceY;
          else if (Math.abs(pos.y - targetY) < snapThreshold) snappedPt.y = targetY;
        }

        next[newIdx] = snappedPt;
        updateEdgeWaypoints(id, next, true);
      }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setLineDrag(null);
      updateEdgeWaypoints(id, useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [], false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [id, allPoints, addEdgeWaypoint, updateEdgeWaypoints, screenToFlowPosition, pushSnapshot, pathStyle, effectiveGridSize]);

  // ---- Right-click on edge line ----
  const handleEdgeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'edge', flowPos });
  }, [screenToFlowPosition]);

  // ---- Right-click on waypoint ----
  const handleWpContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    if (hasSquareCorners && waypoints.length === 0) {
      updateEdgeWaypoints(id, [...getDefaultCornerWaypoints(sourceX, sourceY, targetX, targetY, effectiveGridSize)], true);
    }
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'waypoint', waypointIdx: idx, flowPos });
  }, [screenToFlowPosition, hasSquareCorners, waypoints.length, updateEdgeWaypoints, id, sourceX, sourceY, targetX, targetY, effectiveGridSize]);

  // ---- Context menu actions ----
  const ctxAddWaypoint = useCallback(() => {
    if (!ctxMenu) return;
    const segIdx = findNearestSegment(ctxMenu.flowPos, allPoints, pathStyle);
    let pt = effectiveGridSize > 0 ? snapToGrid(ctxMenu.flowPos.x, ctxMenu.flowPos.y, effectiveGridSize) : { x: ctxMenu.flowPos.x, y: ctxMenu.flowPos.y };

    // Smart snapping to source/target handles
    if (effectiveGridSize > 0) {
      const snapThreshold = effectiveGridSize;
      if (Math.abs(ctxMenu.flowPos.x - sourceX) < snapThreshold) pt.x = sourceX;
      else if (Math.abs(ctxMenu.flowPos.x - targetX) < snapThreshold) pt.x = targetX;

      if (Math.abs(ctxMenu.flowPos.y - sourceY) < snapThreshold) pt.y = sourceY;
      else if (Math.abs(ctxMenu.flowPos.y - targetY) < snapThreshold) pt.y = targetY;
    }

    addEdgeWaypoint(id, segIdx, pt);
    setCtxMenu(null);
  }, [ctxMenu, allPoints, id, addEdgeWaypoint, pathStyle, effectiveGridSize]);

  const ctxClearWaypoints = useCallback(() => {
    updateEdgeWaypoints(id, []);
    setCtxMenu(null);
  }, [id, updateEdgeWaypoints]);

  const ctxRemoveWaypoint = useCallback(() => {
    if (ctxMenu?.waypointIdx != null) removeEdgeWaypoint(id, ctxMenu.waypointIdx);
    setCtxMenu(null);
  }, [ctxMenu, id, removeEdgeWaypoint]);

  const showControls = selected || dragging !== null || lineDrag !== null;

  return (
    <>
      <g className={animated ? 'editable-edge-animated' : undefined}>
        <BaseEdge id={id} path={svgPath} style={style} markerEnd={markerEnd} />
      </g>
      {/* Invisible wide hit area: drag to add waypoint, right-click for context menu */}
      <path
        d={svgPath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
        style={{ cursor: selected ? 'crosshair' : undefined }}
        onPointerDown={selected ? handleLineDragStart : undefined}
        onContextMenu={handleEdgeContextMenu}
      />
      {showControls && (
        <EdgeLabelRenderer>
          <div style={{ pointerEvents: 'none' }}>
            {/* Waypoint drag handles for all path styles including orthogonal/smoothstep */}
            {effectiveWaypoints.map((wp, idx) => (
              <div
                key={`wp-${idx}`}
                className="editable-edge-waypoint"
                data-hovered={hoveredWp === idx || undefined}
                data-dragging={dragging === idx || lineDrag?.idx === idx || undefined}
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${wp.x}px, ${wp.y}px)`,
                  pointerEvents: 'all',
                }}
                onPointerDown={(e) => handleWpPointerDown(e, idx)}
                onPointerEnter={() => setHoveredWp(idx)}
                onPointerLeave={() => setHoveredWp(null)}
                onDoubleClick={(e) => handleWpDoubleClick(e, idx)}
                onContextMenu={(e) => handleWpContextMenu(e, idx)}
              />
            ))}
            {/* "+" buttons at segment midpoints */}
            {allPoints.slice(0, -1).map((pt, idx) => {
              const mp = mid(pt, allPoints[idx + 1]);
              return (
                <div
                  key={`add-${idx}`}
                  className="editable-edge-add-wp"
                  style={{
                    position: 'absolute',
                    transform: `translate(-50%, -50%) translate(${mp.x}px, ${mp.y}px)`,
                    pointerEvents: 'all',
                    opacity: 0.85,
                  }}
                  onClick={(e) => handleAddWaypoint(e, idx)}
                />
              );
            })}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Context menu (rendered in EdgeLabelRenderer to stay in flow viewport) */}
      {ctxMenu && (
        <EdgeLabelRenderer>
          <div
            ref={ctxRef}
            className="edge-context-menu"
            style={{
              position: 'fixed',
              left: ctxMenu.x,
              top: ctxMenu.y,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
          >
            {ctxMenu.type === 'waypoint' ? (
              <button type="button" className="edge-ctx-item" onClick={ctxRemoveWaypoint}>
                Удалить точку
              </button>
            ) : (
              <>
                <button type="button" className="edge-ctx-item" onClick={ctxAddWaypoint}>
                  Добавить точку
                </button>
                <button
                  type="button"
                  className="edge-ctx-item"
                  onClick={ctxClearWaypoints}
                  disabled={waypoints.length === 0}
                >
                  Очистить все точки
                </button>
              </>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default React.memo(EditableEdge);
