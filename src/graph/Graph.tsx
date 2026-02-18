import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Controls, Background, MiniMap, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/useStore';
import TechNode from './TechNode';
import type { TechNode as TechNodeType, CanvasFilter } from '../types';

function matchesCanvasFilter(node: TechNodeType, filter: CanvasFilter): boolean {
  const matchAct = filter.act.length === 0 || filter.act.includes(node.data?.act?.toString() || '');
  const matchStage = filter.stage.length === 0 || filter.stage.includes(node.data?.stage?.toString() || '');
  const matchCategory = filter.category.length === 0 || filter.category.includes(node.data?.category || '');
  return matchAct && matchStage && matchCategory;
}

export const Graph = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    deleteNodes,
  } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    deleteNodes: state.deleteNodes,
  }));

  const theme = useStore((state) => state.ui.theme);
  const edgeType = useStore((state) => state.settings.edgeType) ?? 'default';
  const edgeStrokeWidth = useStore((state) => state.settings.edgeStrokeWidth) ?? 2;
  const edgeAnimated = useStore((state) => state.settings.edgeAnimated) ?? false;
  const canvasFilter = useStore((state) => state.canvasFilter);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({ techNode: TechNode as any }), []);

  // Apply canvas filter to nodes
  const { processedNodes, matchedNodeIds } = useMemo(() => {
    if (!canvasFilter.enabled) return { processedNodes: nodes, matchedNodeIds: null };
    if (canvasFilter.hideMode === 'hide') {
      return {
        processedNodes: nodes.filter((node) => matchesCanvasFilter(node, canvasFilter)),
        matchedNodeIds: null,
      };
    }
    // dim mode: add className, track matched IDs for edge processing
    const matched = new Set<string>();
    const result = nodes.map((node) => {
      const matches = matchesCanvasFilter(node, canvasFilter);
      if (matches) matched.add(node.id);
      return {
        ...node,
        className: matches ? 'canvas-filter-match' : 'canvas-filter-dim',
      } as TechNodeType & { className: string };
    });
    return { processedNodes: result, matchedNodeIds: matched };
  }, [nodes, canvasFilter]);

  // Apply edgeType + style overrides + canvas filter to edges.
  // Explicitly set `type` on every edge to guarantee re-render on type change.
  const processedEdges = useMemo(() => {
    let result = edges.map((e) => ({
      ...e,
      type: edgeType,
      style: { stroke: 'var(--edge-stroke)', strokeWidth: edgeStrokeWidth },
      animated: edgeAnimated,
    }));

    if (!canvasFilter.enabled) return result;

    if (canvasFilter.hideMode === 'hide') {
      const visibleNodeIds = new Set(processedNodes.map((n) => n.id));
      return result.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    }
    // dim mode: dim edges connected to dimmed nodes
    if (!matchedNodeIds) return result;
    return result.map((e) => {
      const bothMatch = matchedNodeIds.has(e.source) && matchedNodeIds.has(e.target);
      return {
        ...e,
        className: bothMatch ? undefined : 'canvas-filter-dim-edge',
      };
    });
  }, [edges, edgeType, edgeStrokeWidth, edgeAnimated, processedNodes, matchedNodeIds, canvasFilter]);

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

  const getMiniMapNodeColor = (node: any) => {
    // Return theme-aware colors
    if (node.selected) return theme === 'dark' ? '#6aa2ff' : '#3867d6';
    return theme === 'dark' ? '#2c3340' : '#d7dee8';
  };

  return (
    <div className="w-full h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          maskColor={theme === 'dark' ? 'rgba(21, 23, 28, 0.7)' : 'rgba(245, 247, 251, 0.7)'}
        />
      </ReactFlow>
    </div>
  );
};
