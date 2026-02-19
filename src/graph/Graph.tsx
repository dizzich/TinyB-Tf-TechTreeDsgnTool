import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Controls, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/useStore';
import TechNode from './TechNode';
import { nodeMatchesRules } from '../utils/filterUtils';
import type { TechNode as TechNodeType, CanvasFilter } from '../types';

function matchesCanvasFilter(node: TechNodeType, filter: CanvasFilter): boolean {
  const rules = filter.rules ?? [];
  if (rules.length === 0) return true;
  return nodeMatchesRules(node, rules);
}

export const Graph = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    deleteNodes,
    connectedSubgraphHighlight,
    setConnectedSubgraphHighlight,
  } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    deleteNodes: state.deleteNodes,
    connectedSubgraphHighlight: state.connectedSubgraphHighlight,
    setConnectedSubgraphHighlight: state.setConnectedSubgraphHighlight,
  }));

  const theme = useStore((state) => state.ui.theme);
  const edgeType = useStore((state) => state.settings.edgeType) ?? 'default';
  const edgeStrokeWidth = useStore((state) => state.settings.edgeStrokeWidth) ?? 2;
  const edgeAnimated = useStore((state) => state.settings.edgeAnimated) ?? false;
  const canvasFilter = useStore((state) => state.canvasFilter);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({ techNode: TechNode as any }), []);

  // Apply canvas filter and/or edge-click highlight to nodes
  const { processedNodes, matchedNodeIds } = useMemo(() => {
    let baseNodes = nodes;
    let matchedNodeIds: Set<string> | null = null;

    if (canvasFilter.enabled) {
      if (canvasFilter.hideMode === 'hide') {
        baseNodes = nodes.filter((node) => matchesCanvasFilter(node, canvasFilter));
      } else {
        const matched = new Set<string>();
        baseNodes = nodes.map((node) => {
          const matches = matchesCanvasFilter(node, canvasFilter);
          if (matches) matched.add(node.id);
          return {
            ...node,
            className: matches ? 'canvas-filter-match' : 'canvas-filter-dim',
          } as TechNodeType & { className: string };
        });
        matchedNodeIds = matched;
      }
    }

    // Edge-click highlight takes priority when active (same look as node selection)
    if (connectedSubgraphHighlight) {
      const { nodeIds } = connectedSubgraphHighlight;
      baseNodes = baseNodes.map((node) => {
        const inSubgraph = nodeIds.has(node.id);
        return {
          ...node,
          data: { ...node.data, edgeHighlighted: inSubgraph },
          className: inSubgraph ? undefined : 'edge-highlight-dim',
        } as TechNodeType & { className?: string };
      });
    }

    return { processedNodes: baseNodes, matchedNodeIds };
  }, [nodes, canvasFilter, connectedSubgraphHighlight]);

  // Apply edgeType + style overrides + canvas filter + edge-click highlight to edges.
  const processedEdges = useMemo(() => {
    let result = edges.map((e) => ({
      ...e,
      type: edgeType,
      style: { stroke: 'var(--edge-stroke)', strokeWidth: edgeStrokeWidth },
      animated: edgeAnimated,
    }));

    if (connectedSubgraphHighlight) {
      const { edgeIds } = connectedSubgraphHighlight;
      result = result.map((e) => ({
        ...e,
        className: edgeIds.has(e.id) ? 'edge-highlight-match-edge' : 'edge-highlight-dim-edge',
      }));
    } else if (canvasFilter.enabled) {
      if (canvasFilter.hideMode === 'hide') {
        const visibleNodeIds = new Set(processedNodes.map((n) => n.id));
        result = result.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
      } else if (matchedNodeIds) {
        result = result.map((e) => {
          const bothMatch = matchedNodeIds.has(e.source) && matchedNodeIds.has(e.target);
          return {
            ...e,
            className: bothMatch ? undefined : 'canvas-filter-dim-edge',
          };
        });
      }
    }

    return result;
  }, [edges, edgeType, edgeStrokeWidth, edgeAnimated, processedNodes, matchedNodeIds, canvasFilter, connectedSubgraphHighlight]);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string; source: string; target: string }) => {
      const nodeIds = new Set<string>([edge.source, edge.target]);
      const edgeIds = new Set<string>([edge.id]);
      setConnectedSubgraphHighlight({ nodeIds, edgeIds });
    },
    [setConnectedSubgraphHighlight]
  );

  const clearHighlight = useCallback(() => {
    setConnectedSubgraphHighlight(null);
  }, [setConnectedSubgraphHighlight]);

  // Handle keyboard events for deletion
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map((n) => n.id);
          deleteNodes(nodeIds);
          event.preventDefault();
        }
      }
    },
    [nodes, deleteNodes]
  );

  return (
    <div className="w-full h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        minZoom={0.05}
        maxZoom={2.5}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={handleEdgeClick}
        onPaneClick={clearHighlight}
        onNodeClick={clearHighlight}
        nodeTypes={nodeTypes}
        fitView
        className="bg-workspace-bg"
        deleteKeyCode={null} // Disable default delete behavior, we handle it ourselves
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={theme === 'dark' ? '#1a1e26' : '#d7dee8'}
          gap={20}
          size={1}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
};
