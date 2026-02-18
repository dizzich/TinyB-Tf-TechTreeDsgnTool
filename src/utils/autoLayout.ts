import dagre from 'dagre';
import { TechNode, TechEdge } from '../types';
import { Position } from '@xyflow/react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export const getLayoutedElements = (nodes: TechNode[], edges: TechEdge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // We need to know the width and height of the nodes for dagre to layout correctly.
    // For now, we'll assume a fixed size or try to read it if available (measured).
    // React Flow nodes have `measured` property if they are rendered.
    // Fallback to a default size.
    const width = (node as any).measured?.width || 200;
    const height = (node as any).measured?.height || 70;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre gives center point, React Flow expects top-left
    const width = (node as any).measured?.width || 200;
    const height = (node as any).measured?.height || 70;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
