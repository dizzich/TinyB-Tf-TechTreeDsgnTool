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
        const mx = (prev.x + cur.x) / 2;
        d += ` L ${mx} ${prev.y} L ${mx} ${cur.y} L ${cur.x} ${cur.y}`;
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
        const mx = (prev.x + cur.x) / 2;
        const r = Math.min(radius, dx / 2, dy / 2);
        if (r > 0.5) {
          const toRight = cur.x > prev.x, toDown = cur.y > prev.y;
          d += ` L ${mx + (toRight ? -r : r)} ${prev.y}`;
          d += ` Q ${mx} ${prev.y} ${mx} ${prev.y + (toDown ? r : -r)}`;
          d += ` L ${mx} ${cur.y + (toDown ? -r : r)}`;
          d += ` Q ${mx} ${cur.y} ${mx + (toRight ? r : -r)} ${cur.y}`;
          d += ` L ${cur.x} ${cur.y}`;
        } else {
          d += ` L ${mx} ${prev.y} L ${mx} ${cur.y} L ${cur.x} ${cur.y}`;
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

/** Get polyline segments for orthogonal/smoothstep path (matches actual rendered path). */
function getOrthogonalPolylineSegments(pts: EdgeWaypoint[]): PolylineSegment[] {
  const n = normalizePtsForOrthogonal(pts);
  const segments: PolylineSegment[] = [];
  for (let i = 1; i < n.length; i++) {
    const prev = n[i - 1], cur = n[i];
    const dx = Math.abs(prev.x - cur.x), dy = Math.abs(prev.y - cur.y);
    if (dx < 0.5 || dy < 0.5) {
      segments.push({ ax: prev.x, ay: prev.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
    } else {
      const mx = (prev.x + cur.x) / 2;
      segments.push({ ax: prev.x, ay: prev.y, bx: mx, by: prev.y, insertIdx: i - 1 });
      segments.push({ ax: mx, ay: prev.y, bx: mx, by: cur.y, insertIdx: i - 1 });
      segments.push({ ax: mx, ay: cur.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
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
function getDefaultCornerWaypoints(sx: number, sy: number, tx: number, ty: number): EdgeWaypoint[] {
  if (Math.abs(sy - ty) < 0.5 || Math.abs(sx - tx) < 0.5) return [];
  const mx = Math.round((sx + tx) / 2);
  return [{ x: mx, y: Math.round(sy) }, { x: mx, y: Math.round(ty) }];
}

interface CornerHandle {
  x: number;
  y: number;
  kind: 'existing' | 'virtual' | 'bend';
  waypointIdx: number;
  defaultCorners: EdgeWaypoint[];
  /** For bend handles: x of neighbor point for formula wp.x = 2*pos.x - neighborX */
  neighborX?: number;
}

function getAllCornerHandles(
  sx: number, sy: number, tx: number, ty: number, waypoints: EdgeWaypoint[]
): CornerHandle[] {
  if (waypoints.length === 0) {
    const defaults = getDefaultCornerWaypoints(sx, sy, tx, ty);
    return defaults.map((c, i) => ({
      x: c.x, y: c.y,
      kind: 'virtual' as const,
      waypointIdx: i,
      defaultCorners: defaults,
    }));
  }
  // Use same normalized pts as path building so handles match path geometry
  const pts = normalizePtsForOrthogonal([{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }]);
  const handles: CornerHandle[] = [];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const dx = Math.abs(prev.x - cur.x), dy = Math.abs(prev.y - cur.y);
    if (dx < 0.5 || dy < 0.5) continue;
    const mx = (prev.x + cur.x) / 2;
    // First bend (mx, prev.y): update cur -> waypointIdx = i-1
    if (i < pts.length - 1) {
      handles.push({
        x: mx, y: prev.y,
        kind: 'bend',
        waypointIdx: i - 1,
        defaultCorners: [],
        neighborX: prev.x,
      });
    }
    // Second bend (mx, cur.y): update prev -> waypointIdx = i-2
    if (i > 1) {
      handles.push({
        x: mx, y: cur.y,
        kind: 'bend',
        waypointIdx: i - 2,
        defaultCorners: [],
        neighborX: cur.x,
      });
    }
  }
  // Dedupe: two bends can share the same waypointIdx when segment has one waypoint
  const seen = new Set<string>();
  return handles.filter((h) => {
    const key = `${h.x.toFixed(0)},${h.y.toFixed(0)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const { screenToFlowPosition } = useReactFlow();

  const [hoveredWp, setHoveredWp] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [lineDrag, setLineDrag] = useState<{ idx: number } | null>(null);
  const [draggingCornerIdx, setDraggingCornerIdx] = useState<number | null>(null);
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
      return getDefaultCornerWaypoints(sourceX, sourceY, targetX, targetY);
    }
    return waypoints;
  }, [hasSquareCorners, waypoints, sourceX, sourceY, targetX, targetY]);

  const svgPath = useMemo(() => {
    if (effectiveWaypoints.length === 0 && waypoints.length === 0) {
      if (edgeType === 'straight') return getStraightPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })[0];
      if (edgeType === 'default') return getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })[0];
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }
    return buildSvgPathWithWaypoints(sourceX, sourceY, targetX, targetY, effectiveWaypoints, pathStyle);
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, effectiveWaypoints, waypoints.length, edgeType, pathStyle]);

  const allPoints = useMemo(
    () => [{ x: sourceX, y: sourceY }, ...effectiveWaypoints, { x: targetX, y: targetY }],
    [sourceX, sourceY, effectiveWaypoints, targetX, targetY]
  );

  const cornerHandles = useMemo(() => {
    if (!hasSquareCorners) return [];
    return getAllCornerHandles(sourceX, sourceY, targetX, targetY, waypoints);
  }, [hasSquareCorners, sourceX, sourceY, targetX, targetY, waypoints]);

  // ---- Drag existing waypoint ----
  const handleWpPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation(); e.preventDefault();
    pushSnapshot();
    setDragging(idx);
    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const next = [...waypoints];
      next[idx] = { x: Math.round(pos.x), y: Math.round(pos.y) };
      updateEdgeWaypoints(id, next, true);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setDragging(null);
      updateEdgeWaypoints(id, useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [], false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [id, waypoints, updateEdgeWaypoints, screenToFlowPosition, pushSnapshot]);

  // ---- Double-click waypoint to remove ----
  const handleWpDoubleClick = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    removeEdgeWaypoint(id, idx);
  }, [id, removeEdgeWaypoint]);

  // ---- Drag corner handle (orthogonal/smoothstep) ----
  const handleCornerPointerDown = useCallback((e: React.PointerEvent, h: CornerHandle, handleIdx: number) => {
    e.stopPropagation(); e.preventDefault();
    pushSnapshot();
    setDraggingCornerIdx(handleIdx);

    const wpIdx = h.waypointIdx;
    if (h.kind === 'virtual') {
      updateEdgeWaypoints(id, [...h.defaultCorners], true);
    }

    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const currentWps = useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [];
      const next = [...currentWps];
      if (wpIdx >= 0 && wpIdx < next.length) {
        if (h.kind === 'bend' && h.neighborX != null) {
          const wp = next[wpIdx];
          next[wpIdx] = { x: Math.round(2 * pos.x - h.neighborX), y: wp.y };
        } else {
          next[wpIdx] = { x: Math.round(pos.x), y: Math.round(pos.y) };
        }
        updateEdgeWaypoints(id, next, true);
      }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setDraggingCornerIdx(null);
      updateEdgeWaypoints(id, useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [], false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [id, updateEdgeWaypoints, screenToFlowPosition, pushSnapshot]);

  // ---- Click "+" to add waypoint at segment midpoint ----
  const handleAddWaypoint = useCallback((e: React.MouseEvent, segmentIdx: number) => {
    e.stopPropagation();
    addEdgeWaypoint(id, segmentIdx, mid(allPoints[segmentIdx], allPoints[segmentIdx + 1]));
  }, [id, allPoints, addEdgeWaypoint]);

  // ---- Drag on connector line to insert + immediately drag new waypoint ----
  const handleLineDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    pushSnapshot();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const wp: EdgeWaypoint = { x: Math.round(flowPos.x), y: Math.round(flowPos.y) };
    const segIdx = findNearestSegment(wp, allPoints, pathStyle);
    addEdgeWaypoint(id, segIdx, wp);
    const newIdx = segIdx;
    setLineDrag({ idx: newIdx });

    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const currentWps = useStore.getState().edges.find((e) => e.id === id)?.waypoints ?? [];
      const next = [...currentWps];
      if (next[newIdx]) {
        next[newIdx] = { x: Math.round(pos.x), y: Math.round(pos.y) };
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
  }, [id, allPoints, addEdgeWaypoint, updateEdgeWaypoints, screenToFlowPosition, pushSnapshot, pathStyle]);

  // ---- Right-click on edge line ----
  const handleEdgeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'edge', flowPos });
  }, [screenToFlowPosition]);

  // ---- Right-click on waypoint ----
  const handleWpContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'waypoint', waypointIdx: idx, flowPos });
  }, [screenToFlowPosition]);

  // ---- Context menu actions ----
  const ctxAddWaypoint = useCallback(() => {
    if (!ctxMenu) return;
    const segIdx = findNearestSegment(ctxMenu.flowPos, allPoints, pathStyle);
    addEdgeWaypoint(id, segIdx, { x: Math.round(ctxMenu.flowPos.x), y: Math.round(ctxMenu.flowPos.y) });
    setCtxMenu(null);
  }, [ctxMenu, allPoints, id, addEdgeWaypoint, pathStyle]);

  const ctxClearWaypoints = useCallback(() => {
    updateEdgeWaypoints(id, []);
    setCtxMenu(null);
  }, [id, updateEdgeWaypoints]);

  const ctxRemoveWaypoint = useCallback(() => {
    if (ctxMenu?.waypointIdx != null) removeEdgeWaypoint(id, ctxMenu.waypointIdx);
    setCtxMenu(null);
  }, [ctxMenu, id, removeEdgeWaypoint]);

  const showControls = selected || dragging !== null || lineDrag !== null || draggingCornerIdx !== null;

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
            {/* Step/smoothstep: corner handles at all bend points */}
            {hasSquareCorners && cornerHandles.map((h, idx) => (
              <div
                key={`corner-${idx}`}
                className="editable-edge-waypoint editable-edge-bend"
                data-dragging={draggingCornerIdx === idx || undefined}
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${h.x}px, ${h.y}px)`,
                  pointerEvents: 'all',
                }}
                onPointerDown={(e) => handleCornerPointerDown(e, h, idx)}
                onDoubleClick={(h.kind === 'existing' || h.kind === 'bend') ? (e) => handleWpDoubleClick(e, h.waypointIdx) : undefined}
                onContextMenu={(h.kind === 'existing' || h.kind === 'bend') ? (e) => handleWpContextMenu(e, h.waypointIdx) : undefined}
              />
            ))}
            {/* Waypoint drag handles (circles) only for bezier/straight — orthogonal uses corner handles */}
            {!hasSquareCorners && waypoints.map((wp, idx) => (
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
