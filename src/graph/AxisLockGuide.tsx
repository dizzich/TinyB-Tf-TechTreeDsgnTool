import React from 'react';
import { useStore } from '../store/useStore';
import { getShapeBounds } from '../utils/shapeBounds';

const EXTENT = 3000;

export const AxisLockGuide = () => {
  const dragAxisLock = useStore((s) => s._dragAxisLock);
  const nodes = useStore((s) => s.nodes);

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const [nodeId, lock] of dragAxisLock) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const bounds = getShapeBounds(node);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    if (lock.lockX != null) {
      lines.push({
        x1: lock.lockX,
        y1: cy - EXTENT,
        x2: lock.lockX,
        y2: cy + EXTENT,
      });
    }
    if (lock.lockY != null) {
      lines.push({
        x1: cx - EXTENT,
        y1: lock.lockY,
        x2: cx + EXTENT,
        y2: lock.lockY,
      });
    }
  }

  if (lines.length === 0) return null;

  const minX = Math.min(...lines.flatMap((l) => [l.x1, l.x2])) - 100;
  const maxX = Math.max(...lines.flatMap((l) => [l.x1, l.x2])) + 100;
  const minY = Math.min(...lines.flatMap((l) => [l.y1, l.y2])) - 100;
  const maxY = Math.max(...lines.flatMap((l) => [l.y1, l.y2])) + 100;
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg
      className="pointer-events-none"
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width: w,
        height: h,
        overflow: 'visible',
        zIndex: 5,
      }}
    >
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1 - minX}
          y1={line.y1 - minY}
          x2={line.x2 - minX}
          y2={line.y2 - minY}
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      ))}
    </svg>
  );
};
