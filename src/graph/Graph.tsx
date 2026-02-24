import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Controls, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/useStore';
import TechNode from './TechNode';
import EditableEdge from './EditableEdge';
import { AxisLockGuide } from './AxisLockGuide';
import { nodeMatchesRules, getConnectedNodeIds } from '../utils/filterUtils';
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
    onNodeDragStart,
    deleteNodes,
    connectedSubgraphHighlight,
    setConnectedSubgraphHighlight,
  } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    onNodeDragStart: state.onNodeDragStart,
    deleteNodes: state.deleteNodes,
    connectedSubgraphHighlight: state.connectedSubgraphHighlight,
    setConnectedSubgraphHighlight: state.setConnectedSubgraphHighlight,
  }));

  const theme = useStore((state) => state.ui.theme);
  const snapEnabled = useStore((state) => state.settings.snapEnabled ?? true);
  const snapGridSize = useStore((state) => state.settings.snapGridSize ?? 10);
  const edgeType = useStore((state) => state.settings.edgeType) ?? 'default';
  const edgeStrokeWidth = useStore((state) => state.settings.edgeStrokeWidth) ?? 2;
  const edgeAnimated = useStore((state) => state.settings.edgeAnimated) ?? false;
  const manualEdgeMode = useStore((state) => state.settings.manualEdgeMode) ?? false;
  const highlightConnectedSubgraph = useStore((state) => state.settings.highlightConnectedSubgraph ?? true);
  const hideUnconnectedNodes = useStore((state) => state.settings.hideUnconnectedNodes === true);
  const bgPatternVariant = useStore((state) => state.settings.bgPatternVariant) ?? 'dots';
  const bgPatternLinkedToSnap = useStore((state) => state.settings.bgPatternLinkedToSnap) ?? true;
  const bgPatternGapSetting = useStore((state) => state.settings.bgPatternGap) ?? 20;
  const bgPatternSize = useStore((state) => state.settings.bgPatternSize) ?? 1;
  const bgPatternGap = bgPatternLinkedToSnap ? snapGridSize : bgPatternGapSetting;

  const bgVariantMap: Record<string, BackgroundVariant> = {
    dots: BackgroundVariant.Dots,
    lines: BackgroundVariant.Lines,
    cross: BackgroundVariant.Cross,
  };

  const canvasFilter = useStore((state) => state.canvasFilter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({ techNode: TechNode as any }), []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeTypes = useMemo(() => ({ editableEdge: EditableEdge as any }), []);

  // Apply hideUnconnectedNodes, canvas filter, and/or edge-click highlight to nodes
  const { processedNodes, matchedNodeIds } = useMemo(() => {
    let baseNodes = nodes;
    let matchedNodeIds: Set<string> | null = null;

    if (hideUnconnectedNodes) {
      const connectedIds = getConnectedNodeIds(edges);
      baseNodes = baseNodes.filter((node) => connectedIds.has(node.id));
    }

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
  }, [nodes, edges, hideUnconnectedNodes, canvasFilter, connectedSubgraphHighlight]);

  // Apply edgeType + style overrides + canvas filter + edge-click highlight to edges.
  const processedEdges = useMemo(() => {
    let result = edges.map((e) => ({
      ...e,
      type: manualEdgeMode ? 'editableEdge' : edgeType,
      style: { stroke: 'var(--edge-stroke)', strokeWidth: edgeStrokeWidth },
      animated: edgeAnimated,
      selectable: true,
      ...(manualEdgeMode
        ? {
          data: {
            waypoints: e.waypoints ?? [],
            edgeType,
            edgeStrokeWidth,
            edgeAnimated,
          },
        }
        : {}),
    }));

    if (hideUnconnectedNodes || (canvasFilter.enabled && canvasFilter.hideMode === 'hide')) {
      const visibleNodeIds = new Set(processedNodes.map((n) => n.id));
      result = result.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    }

    if (connectedSubgraphHighlight) {
      const { edgeIds } = connectedSubgraphHighlight;
      result = result.map((e) => ({
        ...e,
        className: edgeIds.has(e.id) ? 'edge-highlight-match-edge' : 'edge-highlight-dim-edge',
      }));
    } else if (canvasFilter.enabled && canvasFilter.hideMode !== 'hide' && matchedNodeIds) {
      result = result.map((e) => {
        const bothMatch = matchedNodeIds.has(e.source) && matchedNodeIds.has(e.target);
        return {
          ...e,
          className: bothMatch ? undefined : 'canvas-filter-dim-edge',
        };
      });
    }

    return result;
  }, [edges, edgeType, edgeStrokeWidth, edgeAnimated, manualEdgeMode, processedNodes, matchedNodeIds, canvasFilter, connectedSubgraphHighlight, hideUnconnectedNodes]);

  const setEdges = useStore((s) => s.setEdges);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string; source: string; target: string }) => {
      if (manualEdgeMode) {
        const next = edges.map((e) => ({
          ...e,
          selected: e.id === edge.id,
        }));
        setEdges(next);
      }
      if (highlightConnectedSubgraph) {
        const nodeIds = new Set<string>([edge.source, edge.target]);
        const edgeIds = new Set<string>([edge.id]);
        setConnectedSubgraphHighlight({ nodeIds, edgeIds });
      }
    },
    [manualEdgeMode, highlightConnectedSubgraph, setConnectedSubgraphHighlight, edges, setEdges]
  );

  const clearHighlight = useCallback(() => {
    setConnectedSubgraphHighlight(null);
  }, [setConnectedSubgraphHighlight]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as Element).closest?.('[data-connector-click]')) return;
      clearHighlight();
    },
    [clearHighlight]
  );

  // Handle keyboard events for deletion
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.code === 'Delete' || event.code === 'Backspace') {
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedEdges.length > 0) {
          onEdgesChange(selectedEdges.map((e) => ({ type: 'remove' as const, id: e.id })));
          event.preventDefault();
          return;
        }
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map((n) => n.id);
          deleteNodes(nodeIds);
          event.preventDefault();
        }
      }
    },
    [nodes, edges, deleteNodes, onEdgesChange]
  );

  return (
    <div className="w-full h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        minZoom={0.05}
        maxZoom={2.5}
        elementsSelectable={true}
        snapToGrid={snapEnabled && snapGridSize > 0}
        snapGrid={[snapGridSize, snapGridSize]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onEdgeClick={handleEdgeClick}
        onPaneClick={clearHighlight}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-workspace-bg"
        deleteKeyCode={null} // Disable default delete behavior, we handle it ourselves
      >
        <Background
          variant={bgVariantMap[bgPatternVariant] ?? BackgroundVariant.Dots}
          color={theme === 'dark' ? '#1a1e26' : '#d7dee8'}
          gap={bgPatternGap}
          size={bgPatternSize}
        />
        <AxisLockGuide />
        <Controls />
      </ReactFlow>
    </div>
  );
};
