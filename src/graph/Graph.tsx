import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Controls, Background, MiniMap, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/useStore';
import TechNode from './TechNode';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({ techNode: TechNode as any }), []);

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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-workspace-bg"
        deleteKeyCode={null} // Disable default delete behavior, we handle it ourselves
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'var(--edge-stroke)', strokeWidth: 2 },
        }}
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
