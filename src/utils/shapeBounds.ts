/** Axis-aligned bounding box */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Node with position; size comes from getNodeSize */
export interface NodeWithPosition {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 70;

export function getNodeSize(node: NodeWithPosition): { width: number; height: number } {
  const width = node.measured?.width ?? DEFAULT_WIDTH;
  const height = node.measured?.height ?? DEFAULT_HEIGHT;
  return { width, height };
}

/**
 * Get axis-aligned bounding box for a node.
 */
export function getShapeBounds(node: NodeWithPosition): Bounds {
  const { width, height } = getNodeSize(node);
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

/**
 * Closest point on the rectangle perimeter to the given external point.
 * If the point is inside the rect, projects to the nearest edge.
 */
export function closestPointOnPerimeter(bounds: Bounds, point: { x: number; y: number }): { x: number; y: number } {
  const { x, y, width, height } = bounds;
  const left = x;
  const right = x + width;
  const top = y;
  const bottom = y + height;
  const px = point.x;
  const py = point.y;

  if (px >= left && px <= right && py >= top && py <= bottom) {
    const toLeft = px - left;
    const toRight = right - px;
    const toTop = py - top;
    const toBottom = bottom - py;
    const minD = Math.min(toLeft, toRight, toTop, toBottom);
    if (minD === toLeft) return { x: left, y: py };
    if (minD === toRight) return { x: right, y: py };
    if (minD === toTop) return { x: px, y: top };
    return { x: px, y: bottom };
  }

  const cx = Math.max(left, Math.min(right, px));
  const cy = Math.max(top, Math.min(bottom, py));

  if (px < left) return { x: left, y: cy };
  if (px > right) return { x: right, y: cy };
  if (py < top) return { x: cx, y: top };
  if (py > bottom) return { x: cx, y: bottom };

  return { x: cx, y: cy };
}
