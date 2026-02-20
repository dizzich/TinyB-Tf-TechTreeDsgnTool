export function snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
  if (gridSize <= 0) return { x: Math.round(x), y: Math.round(y) };
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 70;

function getNodeSize(node: { measured?: { width?: number; height?: number } }): { width: number; height: number } {
  const width = node.measured?.width ?? DEFAULT_WIDTH;
  const height = node.measured?.height ?? DEFAULT_HEIGHT;
  return { width, height };
}

export interface NodeWithBounds {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
}

export interface SnapToObjectsResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  minDx: number;
  minDy: number;
}

/**
 * Snap position to align with neighboring nodes (edges and centers) by axis.
 * Returns new position when within threshold of an alignment, plus flags per axis.
 */
export interface SnapToObjectsOptions {
  threshold?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function snapPositionToObjects(
  position: { x: number; y: number },
  nodeId: string,
  nodes: NodeWithBounds[],
  thresholdOrOpts: number | SnapToObjectsOptions = 12
): SnapToObjectsResult {
  const opts = typeof thresholdOrOpts === 'number'
    ? { threshold: thresholdOrOpts, defaultWidth: DEFAULT_WIDTH, defaultHeight: DEFAULT_HEIGHT }
    : { threshold: 12, defaultWidth: DEFAULT_WIDTH, defaultHeight: DEFAULT_HEIGHT, ...thresholdOrOpts };
  const { threshold, defaultWidth, defaultHeight } = opts;

  const others = nodes.filter((n) => n.id !== nodeId);
  if (others.length === 0)
    return { x: position.x, y: position.y, snappedX: false, snappedY: false, minDx: Infinity, minDy: Infinity };

  const node = nodes.find((n) => n.id === nodeId);
  const nodeSize = node ? getNodeSize(node) : { width: defaultWidth, height: defaultHeight };
  const fallback = { width: defaultWidth, height: defaultHeight };
  const w = nodeSize.width || fallback.width;
  const h = nodeSize.height || fallback.height;

  const xTargets: number[] = [];
  const yTargets: number[] = [];
  for (const o of others) {
    const os = getNodeSize(o);
    const ow = os.width || defaultWidth;
    const oh = os.height || defaultHeight;
    xTargets.push(o.position.x, o.position.x + ow, o.position.x + ow / 2);
    yTargets.push(o.position.y, o.position.y + oh, o.position.y + oh / 2);
  }

  const xCandidates = new Set<number>();
  for (const t of xTargets) {
    xCandidates.add(t);
    xCandidates.add(t - w);
    xCandidates.add(t - w / 2);
  }
  const yCandidates = new Set<number>();
  for (const t of yTargets) {
    yCandidates.add(t);
    yCandidates.add(t - h);
    yCandidates.add(t - h / 2);
  }

  let bestX = position.x;
  let bestY = position.y;
  let minDx = threshold + 1;
  let minDy = threshold + 1;
  for (const cx of xCandidates) {
    const d = Math.abs(position.x - cx);
    if (d < minDx) {
      minDx = d;
      bestX = cx;
    }
  }
  for (const cy of yCandidates) {
    const d = Math.abs(position.y - cy);
    if (d < minDy) {
      minDy = d;
      bestY = cy;
    }
  }

  const snappedX = minDx <= threshold;
  const snappedY = minDy <= threshold;
  return {
    x: snappedX ? bestX : position.x,
    y: snappedY ? bestY : position.y,
    snappedX,
    snappedY,
    minDx,
    minDy,
  };
}
