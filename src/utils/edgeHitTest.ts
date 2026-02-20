import { normalizePtsForOrthogonal } from './orthogonalNormalize';
import type { Point } from './orthogonalNormalize';

export type PathStyle = 'bezier' | 'straight' | 'orthogonal' | 'smoothstep';

/** Distance from point (px,py) to line segment a-b */
export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Segment with insert index for waypoint addition */
export interface PolylineSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  insertIdx: number;
}

/** Get polyline segments for orthogonal/smoothstep path (H-first, matches actual rendered path) */
export function getOrthogonalPolylineSegments(pts: Point[]): PolylineSegment[] {
  const n = normalizePtsForOrthogonal(pts);
  const segments: PolylineSegment[] = [];
  for (let i = 1; i < n.length; i++) {
    const prev = n[i - 1];
    const cur = n[i];
    const dx = Math.abs(prev.x - cur.x);
    const dy = Math.abs(prev.y - cur.y);
    if (dx < 0.5 || dy < 0.5) {
      segments.push({ ax: prev.x, ay: prev.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
    } else {
      segments.push({ ax: prev.x, ay: prev.y, bx: cur.x, by: prev.y, insertIdx: i - 1 });
      segments.push({ ax: cur.x, ay: prev.y, bx: cur.x, by: cur.y, insertIdx: i - 1 });
    }
  }
  return segments;
}

/** Find segment index for inserting a waypoint. For orthogonal/smoothstep uses polyline segments. */
export function findNearestSegment(
  pt: Point,
  allPts: Point[],
  pathStyle?: PathStyle
): number {
  if (pathStyle === 'orthogonal' || pathStyle === 'smoothstep') {
    const segments = getOrthogonalPolylineSegments(allPts);
    let bestInsertIdx = 0;
    let bestDist = Infinity;
    for (const seg of segments) {
      const d = distToSegment(pt.x, pt.y, seg.ax, seg.ay, seg.bx, seg.by);
      if (d < bestDist) {
        bestDist = d;
        bestInsertIdx = seg.insertIdx;
      }
    }
    return bestInsertIdx;
  }
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < allPts.length - 1; i++) {
    const d = distToSegment(
      pt.x,
      pt.y,
      allPts[i].x,
      allPts[i].y,
      allPts[i + 1].x,
      allPts[i + 1].y
    );
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export type HitResult =
  | { type: 'segment'; segmentIndex: number }
  | { type: 'waypoint'; index: number }
  | { type: 'endpoint'; index: 0 | 1 }
  | null;

const HANDLE_THRESHOLD = 8;
const SEGMENT_THRESHOLD = 12;

/**
 * Hit-test edge at flow position. Priority: waypoint > endpoint > segment.
 */
export function hitTestEdge(
  flowPos: Point,
  absolutePoints: Point[],
  pathStyle: PathStyle = 'orthogonal',
  options?: { handleThreshold?: number; segmentThreshold?: number }
): HitResult {
  const handleThreshold = options?.handleThreshold ?? HANDLE_THRESHOLD;
  const segmentThreshold = options?.segmentThreshold ?? SEGMENT_THRESHOLD;

  if (absolutePoints.length < 2) return null;

  const px = flowPos.x;
  const py = flowPos.y;

  for (let i = 1; i < absolutePoints.length - 1; i++) {
    const p = absolutePoints[i];
    if (Math.hypot(px - p.x, py - p.y) <= handleThreshold) {
      return { type: 'waypoint', index: i - 1 };
    }
  }

  if (Math.hypot(px - absolutePoints[0].x, py - absolutePoints[0].y) <= handleThreshold) {
    return { type: 'endpoint', index: 0 };
  }
  if (
    Math.hypot(
      px - absolutePoints[absolutePoints.length - 1].x,
      py - absolutePoints[absolutePoints.length - 1].y
    ) <= handleThreshold
  ) {
    return { type: 'endpoint', index: 1 };
  }

  const segments =
    pathStyle === 'orthogonal' || pathStyle === 'smoothstep'
      ? getOrthogonalPolylineSegments(absolutePoints)
      : absolutePoints.slice(0, -1).map((p, i) => ({
          ax: p.x,
          ay: p.y,
          bx: absolutePoints[i + 1].x,
          by: absolutePoints[i + 1].y,
          insertIdx: i,
        }));

  let bestSegIdx = -1;
  let bestDist = segmentThreshold;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const d = distToSegment(px, py, seg.ax, seg.ay, seg.bx, seg.by);
    if (d < bestDist) {
      bestDist = d;
      bestSegIdx = seg.insertIdx;
    }
  }

  if (bestSegIdx >= 0) {
    return { type: 'segment', segmentIndex: bestSegIdx };
  }

  return null;
}
