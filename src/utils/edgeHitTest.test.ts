import { describe, it, expect } from 'vitest';
import {
  distToSegment,
  findNearestSegment,
  hitTestEdge,
  getOrthogonalPolylineSegments,
} from './edgeHitTest';

describe('distToSegment', () => {
  it('returns distance to midpoint of segment', () => {
    const d = distToSegment(50, 5, 0, 0, 100, 0);
    expect(d).toBe(5);
  });

  it('returns distance to endpoint when point beyond segment', () => {
    const d = distToSegment(150, 0, 0, 0, 100, 0);
    expect(d).toBe(50);
  });

  it('returns 0 when point on segment', () => {
    const d = distToSegment(50, 0, 0, 0, 100, 0);
    expect(d).toBe(0);
  });
});

describe('findNearestSegment', () => {
  it('returns segment index for orthogonal path', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const idx = findNearestSegment({ x: 25, y: 5 }, pts, 'orthogonal');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(pts.length - 1);
  });

  it('returns 0 for point near first segment', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const idx = findNearestSegment({ x: 50, y: 0 }, pts, 'straight');
    expect(idx).toBe(0);
  });
});

describe('hitTestEdge', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 100 },
  ];

  it('hits waypoint when close', () => {
    const result = hitTestEdge({ x: 50, y: 0 }, pts, 'orthogonal', {
      handleThreshold: 10,
      segmentThreshold: 12,
    });
    expect(result?.type).toBe('waypoint');
    expect((result as { type: 'waypoint'; index: number }).index).toBe(0);
  });

  it('hits endpoint when close', () => {
    const result = hitTestEdge({ x: 2, y: 2 }, pts, 'orthogonal', {
      handleThreshold: 10,
      segmentThreshold: 12,
    });
    expect(result?.type).toBe('endpoint');
  });

  it('returns null when far', () => {
    const result = hitTestEdge({ x: 500, y: 500 }, pts, 'orthogonal');
    expect(result).toBeNull();
  });
});

describe('getOrthogonalPolylineSegments', () => {
  it('expands diagonal into orthogonal segments', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    const segs = getOrthogonalPolylineSegments(pts);
    expect(segs.length).toBeGreaterThan(1);
    const first = segs[0];
    const dx = first.bx - first.ax;
    const dy = first.by - first.ay;
    expect(Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5).toBe(true);
  });
});
