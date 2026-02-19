import type { TechNode } from '../types';

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 70;

function getNodeSize(node: TechNode): { width: number; height: number } {
  const width = (node as { measured?: { width?: number } }).measured?.width ?? DEFAULT_WIDTH;
  const height = (node as { measured?: { height?: number } }).measured?.height ?? DEFAULT_HEIGHT;
  return { width, height };
}

function getNodesByIds(nodes: TechNode[], ids: Set<string>): TechNode[] {
  return nodes.filter((n) => ids.has(n.id));
}

export function alignLeft(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const minX = Math.min(...selected.map((n) => n.position.x));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    byId.set(n.id, { ...n, position: { ...n.position, x: minX } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function alignRight(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const maxRight = Math.max(
    ...selected.map((n) => {
      const { width } = getNodeSize(n);
      return n.position.x + width;
    })
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    const { width } = getNodeSize(n);
    byId.set(n.id, { ...n, position: { ...n.position, x: maxRight - width } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function alignTop(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const minY = Math.min(...selected.map((n) => n.position.y));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    byId.set(n.id, { ...n, position: { ...n.position, y: minY } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function alignBottom(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const maxBottom = Math.max(
    ...selected.map((n) => {
      const { height } = getNodeSize(n);
      return n.position.y + height;
    })
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    const { height } = getNodeSize(n);
    byId.set(n.id, { ...n, position: { ...n.position, y: maxBottom - height } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function alignCenterHorizontal(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const minLeft = Math.min(...selected.map((n) => n.position.x));
  const maxRight = Math.max(
    ...selected.map((n) => n.position.x + getNodeSize(n).width)
  );
  const centerX = (minLeft + maxRight) / 2;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    const { width } = getNodeSize(n);
    byId.set(n.id, { ...n, position: { ...n.position, x: centerX - width / 2 } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function alignCenterVertical(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const minTop = Math.min(...selected.map((n) => n.position.y));
  const maxBottom = Math.max(
    ...selected.map((n) => n.position.y + getNodeSize(n).height)
  );
  const centerY = (minTop + maxBottom) / 2;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of selected) {
    const { height } = getNodeSize(n);
    byId.set(n.id, { ...n, position: { ...n.position, y: centerY - height / 2 } });
  }
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function stackHorizontally(nodes: TechNode[], ids: Set<string>, gap = 40): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const withSize = selected.map((n) => ({ node: n, ...getNodeSize(n) }));
  const byCenterX = (n: (typeof withSize)[0]) => n.node.position.x + n.width / 2;
  withSize.sort((a, b) => byCenterX(a) - byCenterX(b));
  let x = withSize[0].node.position.x;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const baseY = withSize[0].node.position.y;
  withSize.forEach(({ node, width }) => {
    byId.set(node.id, {
      ...node,
      position: { x, y: baseY },
    });
    x += width + gap;
  });
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function stackVertically(nodes: TechNode[], ids: Set<string>, gap = 40): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length === 0) return [...nodes];
  const withSize = selected.map((n) => ({ node: n, ...getNodeSize(n) }));
  const byCenterY = (n: (typeof withSize)[0]) => n.node.position.y + n.height / 2;
  withSize.sort((a, b) => byCenterY(a) - byCenterY(b));
  let y = withSize[0].node.position.y;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const baseX = withSize[0].node.position.x;
  withSize.forEach(({ node, height }) => {
    byId.set(node.id, {
      ...node,
      position: { x: baseX, y },
    });
    y += height + gap;
  });
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function distributeHorizontally(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length <= 2) return [...nodes];
  const withSize = selected.map((n) => ({ node: n, ...getNodeSize(n) }));
  const byCenterX = (n: (typeof withSize)[0]) => n.node.position.x + n.width / 2;
  withSize.sort((a, b) => byCenterX(a) - byCenterX(b));
  const first = byCenterX(withSize[0]);
  const last = byCenterX(withSize[withSize.length - 1]);
  const span = last - first;
  const step = span / (withSize.length - 1);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  withSize.forEach(({ node, width }, i) => {
    const centerX = first + step * i;
    byId.set(node.id, {
      ...node,
      position: { ...node.position, x: centerX - width / 2 },
    });
  });
  return nodes.map((n) => byId.get(n.id) ?? n);
}

export function distributeVertically(nodes: TechNode[], ids: Set<string>): TechNode[] {
  const selected = getNodesByIds(nodes, ids);
  if (selected.length <= 2) return [...nodes];
  const withSize = selected.map((n) => ({ node: n, ...getNodeSize(n) }));
  const byCenterY = (n: (typeof withSize)[0]) => n.node.position.y + n.height / 2;
  withSize.sort((a, b) => byCenterY(a) - byCenterY(b));
  const first = byCenterY(withSize[0]);
  const last = byCenterY(withSize[withSize.length - 1]);
  const span = last - first;
  const step = span / (withSize.length - 1);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  withSize.forEach(({ node, height }, i) => {
    const centerY = first + step * i;
    byId.set(node.id, {
      ...node,
      position: { ...node.position, y: centerY - height / 2 },
    });
  });
  return nodes.map((n) => byId.get(n.id) ?? n);
}
