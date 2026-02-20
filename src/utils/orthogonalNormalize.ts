/** Point used in polyline routing */
export interface Point {
  x: number;
  y: number;
}

const AXIS_EPSILON = 0.5;

/**
 * Normalize points for orthogonal routing: snap nearly axis-aligned segments
 * so path and corner handles stay consistent (no drift).
 */
export function normalizePtsForOrthogonal(pts: Point[]): Point[] {
  if (pts.length <= 1) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: Point[] = [{ x: pts[0].x, y: pts[0].y }];
  for (let i = 1; i < pts.length; i++) {
    const last = out[out.length - 1];
    const cur = pts[i];
    const dx = Math.abs(last.x - cur.x);
    const dy = Math.abs(last.y - cur.y);
    if (dx < AXIS_EPSILON) {
      out.push({ x: last.x, y: cur.y });
    } else if (dy < AXIS_EPSILON) {
      out.push({ x: cur.x, y: last.y });
    } else {
      out.push({ x: cur.x, y: cur.y });
    }
  }
  return out;
}

/**
 * Ensure points form orthogonal segments: snap near-horizontal/vertical to axis-aligned.
 * Alias for normalizePtsForOrthogonal for API consistency.
 */
export function ensureOrthogonal(pts: Point[]): Point[] {
  return normalizePtsForOrthogonal(pts);
}

/**
 * Check if three points are colinear (point q lies on segment p-r) within epsilon.
 */
function areColinear(p: Point, q: Point, r: Point, epsilon: number): boolean {
  const cross = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  if (Math.abs(cross) > epsilon * Math.hypot(r.x - p.x, r.y - p.y)) return false;
  const dot = (q.x - p.x) * (r.x - p.x) + (q.y - p.y) * (r.y - p.y);
  const lenSq = (r.x - p.x) ** 2 + (r.y - p.y) ** 2;
  return dot >= 0 && dot <= lenSq + epsilon * epsilon;
}

/**
 * Remove intermediate points that lie on the line between their neighbors.
 * Keeps endpoints. Right angles are preserved.
 */
export function removeColinearPoints(pts: Point[], epsilon = 0.5): Point[] {
  if (pts.length <= 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    if (!areColinear(prev, cur, next, epsilon)) {
      out.push({ x: cur.x, y: cur.y });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Merge segments shorter than minLength while preserving orthogonality.
 * Collapses consecutive axis-aligned segments that are too short.
 */
export function mergeTinySegments(pts: Point[], minLength = 2): Point[] {
  if (pts.length <= 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const normalized = normalizePtsForOrthogonal(pts);
  const out: Point[] = [normalized[0]];

  for (let i = 1; i < normalized.length; i++) {
    const prev = out[out.length - 1];
    const cur = normalized[i];
    const len = Math.hypot(cur.x - prev.x, cur.y - prev.y);

    if (len >= minLength) {
      out.push({ x: cur.x, y: cur.y });
    } else if (i < normalized.length - 1) {
      const next = normalized[i + 1];
      const dx1 = cur.x - prev.x;
      const dy1 = cur.y - prev.y;
      const dx2 = next.x - cur.x;
      const dy2 = next.y - cur.y;
      const sameDir =
        (Math.abs(dx1) < 0.5 && Math.abs(dx2) < 0.5) || (Math.abs(dy1) < 0.5 && Math.abs(dy2) < 0.5);
      if (sameDir) {
        continue;
      }
      out.push({ x: cur.x, y: cur.y });
    } else {
      out.push({ x: cur.x, y: cur.y });
    }
  }

  return removeColinearPoints(out, 0.5);
}

const SIMPLIFY_EPS = 0.5;

function removeDuplicatePoints(pts: Point[], epsilon = SIMPLIFY_EPS): Point[] {
  if (pts.length <= 1) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    const cur = pts[i];
    if (Math.hypot(cur.x - prev.x, cur.y - prev.y) >= epsilon) {
      out.push({ x: cur.x, y: cur.y });
    }
  }
  return out;
}

function removeZeroLengthSegments(pts: Point[], epsilon = SIMPLIFY_EPS): Point[] {
  if (pts.length <= 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    const cur = pts[i];
    const len = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (len >= epsilon) out.push({ x: cur.x, y: cur.y });
  }
  const last = pts[pts.length - 1];
  if (out[out.length - 1].x !== last.x || out[out.length - 1].y !== last.y) {
    out.push({ x: last.x, y: last.y });
  }
  return out;
}

/** Detect if segment i is horizontal (true) or vertical (false). */
function isSegmentHorizontal(pts: Point[], i: number): boolean {
  if (i < 0 || i >= pts.length - 1) return false;
  const a = pts[i];
  const b = pts[i + 1];
  return Math.abs(a.y - b.y) < SIMPLIFY_EPS;
}

/** Direction: +1 = right/down, -1 = left/up, 0 = neutral */
function segmentDirection(pts: Point[], i: number): number {
  if (i < 0 || i >= pts.length - 1) return 0;
  const a = pts[i];
  const b = pts[i + 1];
  if (Math.abs(a.y - b.y) < SIMPLIFY_EPS) return b.x > a.x ? 1 : b.x < a.x ? -1 : 0;
  return b.y > a.y ? 1 : b.y < a.y ? -1 : 0;
}

function hasBacktracking(pts: Point[]): boolean {
  for (let i = 0; i < pts.length - 2; i++) {
    const h1 = isSegmentHorizontal(pts, i);
    const h2 = isSegmentHorizontal(pts, i + 1);
    if (h1 === h2) {
      const d1 = segmentDirection(pts, i);
      const d2 = segmentDirection(pts, i + 1);
      if (d1 !== 0 && d2 !== 0 && d1 === -d2) return true;
    }
  }
  return false;
}

function collapseBacktracking(pts: Point[]): Point[] {
  if (pts.length <= 3) return pts.map((p) => ({ x: p.x, y: p.y }));
  let changed = true;
  let out: Point[] = pts.map((p) => ({ x: p.x, y: p.y }));
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length - 2; i++) {
      const a = out[i];
      const b = out[i + 1];
      const c = out[i + 2];
      const seg1H = Math.abs(a.y - b.y) < SIMPLIFY_EPS;
      const seg2H = Math.abs(b.y - c.y) < SIMPLIFY_EPS;
      if (seg1H && seg2H) {
        const d1 = b.x - a.x;
        const d2 = c.x - b.x;
        if (d1 !== 0 && d2 !== 0 && (d1 > 0) !== (d2 > 0)) {
          out.splice(i + 1, 1);
          changed = true;
          break;
        }
      }
      if (!seg1H && !seg2H) {
        const d1 = b.y - a.y;
        const d2 = c.y - b.y;
        if (d1 !== 0 && d2 !== 0 && (d1 > 0) !== (d2 > 0)) {
          out.splice(i + 1, 1);
          changed = true;
          break;
        }
      }
    }
  }
  return out;
}

function minimalRoute(src: Point, tgt: Point): Point[] {
  if (Math.abs(src.x - tgt.x) < SIMPLIFY_EPS || Math.abs(src.y - tgt.y) < SIMPLIFY_EPS) {
    return [{ x: src.x, y: src.y }, { x: tgt.x, y: tgt.y }];
  }
  const hv: Point[] = [
    { x: src.x, y: src.y },
    { x: tgt.x, y: src.y },
    { x: tgt.x, y: tgt.y },
  ];
  const vh: Point[] = [
    { x: src.x, y: src.y },
    { x: src.x, y: tgt.y },
    { x: tgt.x, y: tgt.y },
  ];
  const lenHV =
    Math.abs(hv[1].x - hv[0].x) +
    Math.abs(hv[1].y - hv[0].y) +
    Math.abs(hv[2].x - hv[1].x) +
    Math.abs(hv[2].y - hv[1].y);
  const lenVH =
    Math.abs(vh[1].x - vh[0].x) +
    Math.abs(vh[1].y - vh[0].y) +
    Math.abs(vh[2].x - vh[1].x) +
    Math.abs(vh[2].y - vh[1].y);
  return lenHV <= lenVH ? hv : vh;
}

/**
 * Simplify orthogonal polyline: remove duplicates, colinear points, zero-length
 * segments, collapse U-turns. If backtracking or too many points in free space,
 * return minimal HV/VH route.
 */
export function simplifyOrthogonalPolyline(
  pts: Point[],
  src: Point,
  tgt: Point
): Point[] {
  if (pts.length <= 2) return pts.map((p) => ({ x: p.x, y: p.y }));

  let out = removeDuplicatePoints(pts);
  out = removeColinearPoints(out, SIMPLIFY_EPS);
  out = removeZeroLengthSegments(out);
  out = collapseBacktracking(out);

  if (out.length > 4 || hasBacktracking(out)) {
    return minimalRoute(src, tgt);
  }

  return normalizePtsForOrthogonal(out);
}
