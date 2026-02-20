import { describe, it, expect } from 'vitest';
import {
  routeOrthogonal,
  getDefaultCornerWaypoints,
  pointsToSvgPath,
  minimalOrthogonalRoute,
} from './orthogonalRouter';

describe('routeOrthogonal', () => {
  it('returns orthogonal path with 0 control points', () => {
    const result = routeOrthogonal({ x: 0, y: 0 }, { x: 100, y: 100 }, []);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[result.length - 1]).toEqual({ x: 100, y: 100 });
  });

  it('passes through control points', () => {
    const result = routeOrthogonal(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      [{ x: 50, y: 0 }]
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    const mid = result.find((p) => Math.abs(p.x - 50) < 1);
    expect(mid).toBeDefined();
  });

  it('produces axis-aligned segments only', () => {
    const result = routeOrthogonal({ x: 0, y: 0 }, { x: 100, y: 50 }, []);
    for (let i = 0; i < result.length - 1; i++) {
      const dx = Math.abs(result[i + 1].x - result[i].x);
      const dy = Math.abs(result[i + 1].y - result[i].y);
      expect(dx < 0.5 || dy < 0.5).toBe(true);
    }
  });
});

describe('getDefaultCornerWaypoints', () => {
  it('returns L-shape corners for diagonal', () => {
    const wps = getDefaultCornerWaypoints(0, 0, 100, 100);
    expect(wps).toHaveLength(2);
    expect(wps[0].x).toBe(wps[1].x);
    expect(wps[0].y).toBe(0);
    expect(wps[1].y).toBe(100);
  });

  it('returns empty for horizontal', () => {
    const wps = getDefaultCornerWaypoints(0, 0, 100, 0);
    expect(wps).toHaveLength(0);
  });

  it('returns empty for vertical', () => {
    const wps = getDefaultCornerWaypoints(0, 0, 0, 100);
    expect(wps).toHaveLength(0);
  });
});

describe('minimalOrthogonalRoute', () => {
  it('returns 2 points when aligned horizontally', () => {
    const result = minimalOrthogonalRoute({ x: 0, y: 10 }, { x: 100, y: 10 });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 10 });
    expect(result[1]).toEqual({ x: 100, y: 10 });
  });

  it('returns 2 points when aligned vertically', () => {
    const result = minimalOrthogonalRoute({ x: 50, y: 0 }, { x: 50, y: 100 });
    expect(result).toHaveLength(2);
  });

  it('returns 3 points for diagonal and chooses shorter of HV/VH', () => {
    const result = minimalOrthogonalRoute({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[2]).toEqual({ x: 100, y: 100 });
  });
});

describe('pointsToSvgPath', () => {
  it('produces valid path string', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const d = pointsToSvgPath(pts);
    expect(d).toMatch(/^M /);
    expect(d).toContain('L ');
  });

  it('supports rounded corners', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ];
    const d = pointsToSvgPath(pts, { rounded: true, cornerRadius: 5 });
    expect(d).toContain('Q ');
  });
});
