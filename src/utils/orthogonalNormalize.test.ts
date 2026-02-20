import { describe, it, expect } from 'vitest';
import {
  normalizePtsForOrthogonal,
  removeColinearPoints,
  mergeTinySegments,
  ensureOrthogonal,
  simplifyOrthogonalPolyline,
} from './orthogonalNormalize';

describe('normalizePtsForOrthogonal', () => {
  it('snaps nearly-horizontal to horizontal', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0.3 },
    ];
    const out = normalizePtsForOrthogonal(pts);
    expect(out[1].y).toBe(0);
    expect(out[1].x).toBe(100);
  });

  it('snaps nearly-vertical to vertical', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.2, y: 100 },
    ];
    const out = normalizePtsForOrthogonal(pts);
    expect(out[1].x).toBe(0);
    expect(out[1].y).toBe(100);
  });

  it('preserves right angle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ];
    const out = normalizePtsForOrthogonal(pts);
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual({ x: 50, y: 0 });
    expect(out[2]).toEqual({ x: 50, y: 100 });
  });

  it('returns copy for length <= 1', () => {
    const pts = [{ x: 1, y: 2 }];
    const out = normalizePtsForOrthogonal(pts);
    expect(out).not.toBe(pts);
    expect(out).toEqual(pts);
  });
});

describe('removeColinearPoints', () => {
  it('removes intermediate colinear point', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = removeColinearPoints(pts);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[1]).toEqual({ x: 100, y: 0 });
  });

  it('preserves right angle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ];
    const out = removeColinearPoints(pts);
    expect(out).toHaveLength(3);
  });

  it('keeps endpoints', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const out = removeColinearPoints(pts, 0.5);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[pts.length - 1]);
  });
});

describe('mergeTinySegments', () => {
  it('preserves orthogonality', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 100 },
    ];
    const out = mergeTinySegments(pts, 2);
    expect(out.length).toBeGreaterThanOrEqual(2);
    const dx1 = out[1].x - out[0].x;
    const dy1 = out[1].y - out[0].y;
    expect(Math.abs(dx1) < 0.5 || Math.abs(dy1) < 0.5).toBe(true);
  });

  it('does not alter long segments', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ];
    const out = mergeTinySegments(pts, 2);
    expect(out).toHaveLength(3);
  });
});

describe('ensureOrthogonal', () => {
  it('is alias for normalizePtsForOrthogonal', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0.1 },
    ];
    const out = ensureOrthogonal(pts);
    expect(out[1].y).toBe(0);
  });
});

describe('simplifyOrthogonalPolyline', () => {
  const src = { x: 0, y: 0 };
  const tgt = { x: 100, y: 100 };

  it('collapses U-turn backtracking to minimal route', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const out = simplifyOrthogonalPolyline(pts, src, tgt);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual(src);
    expect(out[out.length - 1]).toEqual(tgt);
  });

  it('removes colinear points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = simplifyOrthogonalPolyline(pts, src, { x: 100, y: 0 });
    expect(out).toHaveLength(2);
  });

  it('removes duplicate consecutive points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const out = simplifyOrthogonalPolyline(pts, src, tgt);
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it('removes zero-length segments', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const out = simplifyOrthogonalPolyline(pts, src, tgt);
    for (let i = 0; i < out.length - 1; i++) {
      const len = Math.hypot(out[i + 1].x - out[i].x, out[i + 1].y - out[i].y);
      expect(len).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('preserves waypoints when segment dragged far left (no bbox snapping)', () => {
    const srcPt = { x: 0, y: 0 };
    const tgtPt = { x: 100, y: 100 };
    const waypointsDraggedFarLeft = [
      { x: -100, y: 0 },
      { x: -100, y: 100 },
    ];
    const pts = [srcPt, ...waypointsDraggedFarLeft, tgtPt];
    const simplified = simplifyOrthogonalPolyline(pts, srcPt, tgtPt);
    expect(simplified).toHaveLength(4);
    expect(simplified[0]).toEqual(srcPt);
    expect(simplified[1]).toEqual({ x: -100, y: 0 });
    expect(simplified[2]).toEqual({ x: -100, y: 100 });
    expect(simplified[3]).toEqual(tgtPt);
  });

  it('preserves waypoints when segment dragged far right', () => {
    const srcPt = { x: 0, y: 0 };
    const tgtPt = { x: 100, y: 100 };
    const waypointsFarRight = [
      { x: 200, y: 0 },
      { x: 200, y: 100 },
    ];
    const pts = [srcPt, ...waypointsFarRight, tgtPt];
    const simplified = simplifyOrthogonalPolyline(pts, srcPt, tgtPt);
    expect(simplified).toHaveLength(4);
    expect(simplified[1]).toEqual({ x: 200, y: 0 });
    expect(simplified[2]).toEqual({ x: 200, y: 100 });
  });
});
