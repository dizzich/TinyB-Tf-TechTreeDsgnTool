import {
  normalizePtsForOrthogonal,
  removeColinearPoints,
  mergeTinySegments,
  type Point,
} from './orthogonalNormalize';

export type { Point } from './orthogonalNormalize';

export interface RouteOptions {
  rounded?: boolean;
  cornerRadius?: number;
  minSegmentLength?: number;
}

/**
 * Route an orthogonal polyline from source to target through control points.
 * Returns absolute points for the rendered path (source, ...waypoints, target).
 */
export function routeOrthogonal(
  sourceAnchor: Point,
  targetAnchor: Point,
  controlPoints: Point[],
  options: RouteOptions = {}
): Point[] {
  const { minSegmentLength = 2 } = options;
  let pts: Point[] = [
    { x: sourceAnchor.x, y: sourceAnchor.y },
    ...controlPoints.map((p) => ({ x: p.x, y: p.y })),
    { x: targetAnchor.x, y: targetAnchor.y },
  ];

  if (pts.length === 2) {
    const corners = getDefaultCornerWaypoints(
      sourceAnchor.x,
      sourceAnchor.y,
      targetAnchor.x,
      targetAnchor.y
    );
    if (corners.length > 0) {
      pts = [pts[0], ...corners, pts[1]];
    }
  }

  const normalized = normalizePtsForOrthogonal(pts);
  const noColinear = removeColinearPoints(normalized, 0.5);
  const merged = mergeTinySegments(noColinear, minSegmentLength);

  return merged;
}

/**
 * Minimal orthogonal route: 2 points if aligned, else 3 points (HV or VH).
 * Chooses the shorter of HV and VH by total path length.
 */
export function minimalOrthogonalRoute(src: Point, tgt: Point): Point[] {
  const eps = 0.5;
  if (Math.abs(src.x - tgt.x) < eps || Math.abs(src.y - tgt.y) < eps) {
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
    Math.abs(hv[1].x - hv[0].x) + Math.abs(hv[1].y - hv[0].y) +
    Math.abs(hv[2].x - hv[1].x) + Math.abs(hv[2].y - hv[1].y);
  const lenVH =
    Math.abs(vh[1].x - vh[0].x) + Math.abs(vh[1].y - vh[0].y) +
    Math.abs(vh[2].x - vh[1].x) + Math.abs(vh[2].y - vh[1].y);
  return lenHV <= lenVH ? hv : vh;
}

/**
 * Default corner waypoints for step/smoothstep with no user waypoints.
 * Returns two axis-aligned corners that form a clean L-shape.
 */
export function getDefaultCornerWaypoints(
  sx: number,
  sy: number,
  tx: number,
  ty: number
): Point[] {
  if (Math.abs(sy - ty) < 0.5 || Math.abs(sx - tx) < 0.5) return [];
  const mx = Math.round((sx + tx) / 2);
  return [
    { x: mx, y: Math.round(sy) },
    { x: mx, y: Math.round(ty) },
  ];
}

/**
 * Build SVG path string from orthogonal points, with optional rounded corners.
 */
export function pointsToSvgPath(
  pts: Point[],
  options: { rounded?: boolean; cornerRadius?: number } = {}
): string {
  const { rounded = false, cornerRadius = 5 } = options;

  if (pts.length === 0) return '';
  if (pts.length === 1) return 'M ' + pts[0].x + ' ' + pts[0].y;

  const n = normalizePtsForOrthogonal(pts);

  if (!rounded) {
    let d = 'M ' + n[0].x + ' ' + n[0].y;
    for (let i = 1; i < n.length; i++) {
      const prev = n[i - 1];
      const cur = n[i];
      const dx = Math.abs(prev.x - cur.x);
      const dy = Math.abs(prev.y - cur.y);
      if (dx < 0.5 || dy < 0.5) {
        d += ' L ' + cur.x + ' ' + cur.y;
      } else {
        const mx = (prev.x + cur.x) / 2;
        d += ' L ' + mx + ' ' + prev.y + ' L ' + mx + ' ' + cur.y + ' L ' + cur.x + ' ' + cur.y;
      }
    }
    return d;
  }

  let d = 'M ' + n[0].x + ' ' + n[0].y;
  for (let i = 1; i < n.length; i++) {
    const prev = n[i - 1];
    const cur = n[i];
    const dx = Math.abs(prev.x - cur.x);
    const dy = Math.abs(prev.y - cur.y);
    if (dx < 0.5 || dy < 0.5) {
      d += ' L ' + cur.x + ' ' + cur.y;
    } else {
      const mx = (prev.x + cur.x) / 2;
      const r = Math.min(cornerRadius, dx / 2, dy / 2);
      if (r > 0.5) {
        const toRight = cur.x > prev.x;
        const toDown = cur.y > prev.y;
        d += ' L ' + (mx + (toRight ? -r : r)) + ' ' + prev.y;
        d += ' Q ' + mx + ' ' + prev.y + ' ' + mx + ' ' + (prev.y + (toDown ? r : -r));
        d += ' L ' + mx + ' ' + (cur.y + (toDown ? -r : r));
        d += ' Q ' + mx + ' ' + cur.y + ' ' + (mx + (toRight ? r : -r)) + ' ' + cur.y;
        d += ' L ' + cur.x + ' ' + cur.y;
      } else {
        d += ' L ' + mx + ' ' + prev.y + ' L ' + mx + ' ' + cur.y + ' L ' + cur.x + ' ' + cur.y;
      }
    }
  }
  return d;
}
