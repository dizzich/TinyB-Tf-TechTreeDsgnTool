import dagre from 'dagre';
import { TechNode, TechEdge } from '../types';
import { Position } from '@xyflow/react';

export type LayoutDirection = 'LR' | 'RL' | 'TB' | 'BT';

function getPositionsForDirection(direction: LayoutDirection): { target: Position; source: Position } {
  switch (direction) {
    case 'LR':
      return { target: Position.Left, source: Position.Right };
    case 'RL':
      return { target: Position.Right, source: Position.Left };
    case 'TB':
      return { target: Position.Top, source: Position.Bottom };
    case 'BT':
      return { target: Position.Bottom, source: Position.Top };
    default:
      return { target: Position.Left, source: Position.Right };
  }
}

/** Uses a fresh graph per call so subgraph layout only affects the given nodes/edges. */
export const getLayoutedElements = (
  nodes: TechNode[],
  edges: TechEdge[],
  direction: LayoutDirection = 'LR'
) => {
  const { target: targetPosition, source: sourcePosition } = getPositionsForDirection(direction);
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    const width = (node as { measured?: { width?: number } }).measured?.width ?? 200;
    const height = (node as { measured?: { height?: number } }).measured?.height ?? 70;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const width = (node as { measured?: { width?: number } }).measured?.width ?? 200;
    const height = (node as { measured?: { height?: number } }).measured?.height ?? 70;

    return {
      ...node,
      targetPosition,
      sourcePosition,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/** Layout only the selected subgraph, merge positions back into full node list. */
export function layoutSubgraph(
  nodes: TechNode[],
  edges: TechEdge[],
  selectedIds: Set<string>,
  direction: LayoutDirection
): TechNode[] {
  if (selectedIds.size === 0) return [...nodes];
  const selectedNodes = nodes.filter((n) => selectedIds.has(n.id));
  const selectedEdges = edges.filter(
    (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
  );
  const { nodes: layoutedNodes } = getLayoutedElements(selectedNodes, selectedEdges, direction);
  const layoutedById = new Map(layoutedNodes.map((n) => [n.id, n]));
  return nodes.map((n) => {
    const updated = layoutedById.get(n.id);
    if (updated) return { ...n, position: updated.position, targetPosition: updated.targetPosition, sourcePosition: updated.sourcePosition };
    return n;
  });
}
