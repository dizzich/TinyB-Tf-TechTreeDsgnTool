import { describe, it, expect } from 'vitest';
import { getShapeBounds, closestPointOnPerimeter } from './shapeBounds';

describe('getShapeBounds', () => {
  it('returns bounds from position and measured size', () => {
    const node = {
      id: 'a',
      position: { x: 10, y: 20 },
      measured: { width: 100, height: 50 },
    };
    const b = getShapeBounds(node);
    expect(b).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('uses defaults when measured missing', () => {
    const node = { id: 'a', position: { x: 0, y: 0 } };
    const b = getShapeBounds(node);
    expect(b.width).toBe(200);
    expect(b.height).toBe(70);
  });
});

describe('closestPointOnPerimeter', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 50 };

  it('projects point left of rect onto left edge', () => {
    const p = closestPointOnPerimeter(bounds, { x: -10, y: 25 });
    expect(p.x).toBe(0);
    expect(p.y).toBe(25);
  });

  it('projects point right of rect onto right edge', () => {
    const p = closestPointOnPerimeter(bounds, { x: 150, y: 25 });
    expect(p.x).toBe(100);
    expect(p.y).toBe(25);
  });

  it('projects point above rect onto top edge', () => {
    const p = closestPointOnPerimeter(bounds, { x: 50, y: -20 });
    expect(p.x).toBe(50);
    expect(p.y).toBe(0);
  });

  it('projects point below rect onto bottom edge', () => {
    const p = closestPointOnPerimeter(bounds, { x: 50, y: 80 });
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });

  it('handles point inside rect', () => {
    const p = closestPointOnPerimeter(bounds, { x: 50, y: 25 });
    expect(p.x).toBeDefined();
    expect(p.y).toBeDefined();
  });
});
