import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';

/** Small status badge */
const StatusBadge = ({ value, color }: { value?: string; color: string }) => {
  if (!value) return null;
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${color}`}>
      {value}
    </span>
  );
};

export const Inspector = () => {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNodes = useStore((state) => state.deleteNodes);
  const setNodes = useStore((state) => state.setNodes);

  const [rawDataCollapsed, setRawDataCollapsed] = useState(true);
  const [craftDataCollapsed, setCraftDataCollapsed] = useState(false);
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const reactFlowInstance = useReactFlow();

  const selectedNode = nodes.find((n) => n.selected);

  // Get incoming and outgoing edges
  const incomingEdges = selectedNode
    ? edges.filter((e) => e.target === selectedNode.id)
    : [];
  const outgoingEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode.id)
    : [];

  const handleChange = (key: string, value: any) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { [key]: value });
    }
  };

  const handleJumpToNode = (nodeId: string) => {
    const updatedNodes = nodes.map((n) => ({
      ...n,
      selected: n.id === nodeId,
    }));
    setNodes(updatedNodes);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode && reactFlowInstance) {
      reactFlowInstance.fitView({
        padding: 0.5,
        nodes: [{ id: nodeId }],
        duration: 300,
      });
    }
  };

  const handleDeleteNode = () => {
    if (selectedNode && deleteNodes) {
      deleteNodes([selectedNode.id]);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyJSON = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(JSON.stringify(selectedNode.data, null, 2));
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 h-full">
        <div className="text-gray-400 text-sm text-center mt-10">
          Выберите узел для редактирования
        </div>
      </div>
    );
  }

  const d = selectedNode.data;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-700">Инспектор</h2>
        <div className="text-xs text-gray-500 font-mono mt-1">{selectedNode.id}</div>
        {(d?.techCraftId || d?.notionPageId) && (
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5">
            {d.techCraftId && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">TechCraftID:</span>{' '}
                <span className="font-mono">{d.techCraftId}</span>
              </div>
            )}
            {d.notionPageId && (
              <div className="text-xs text-gray-500 truncate" title={d.notionPageId}>
                <span className="font-medium">Notion:</span>{' '}
                <span className="font-mono">{d.notionPageId}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Fields */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Название</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={d?.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Акт</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={d?.act || ''}
              onChange={(e) => handleChange('act', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Стадия</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={d?.stage || ''}
              onChange={(e) => handleChange('stage', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Категория</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={d?.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
          />
        </div>

        {/* Status Section (collapsible) */}
        {(d?.gameStatus || d?.designStatus || d?.notionSyncStatus || d?.powerType || d?.techGameStatus) && (
          <div>
            <button
              onClick={() => setStatusCollapsed(!statusCollapsed)}
              className="flex items-center text-xs font-medium text-gray-500 mb-1 hover:text-gray-700"
            >
              {statusCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="ml-1">Статусы</span>
            </button>
            {!statusCollapsed && (
              <div className="space-y-2 pl-1">
                {d.gameStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Игра:</span>
                    <StatusBadge value={d.gameStatus} color={
                      d.gameStatus === 'implemented' ? 'bg-green-100 text-green-700'
                      : d.gameStatus === 'to remove' ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                    } />
                  </div>
                )}
                {d.designStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Дизайн:</span>
                    <StatusBadge value={d.designStatus} color={
                      d.designStatus === 'done' ? 'bg-green-100 text-green-700'
                      : d.designStatus === 'Canceled' ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                    } />
                  </div>
                )}
                {d.notionSyncStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sync:</span>
                    <StatusBadge value={d.notionSyncStatus} color={
                      d.notionSyncStatus === 'Synchronized' ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                    } />
                  </div>
                )}
                {d.powerType && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Питание:</span>
                    <StatusBadge value={d.powerType} color="bg-gray-100 text-gray-700" />
                  </div>
                )}
                {d.techGameStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tech:</span>
                    <StatusBadge value={d.techGameStatus} color="bg-gray-100 text-gray-700" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Craft Data Section */}
        {(d?.formulaIngridients || d?.formulaUsedStation || d?.outputItem || d?.openCondition) && (
          <div>
            <button
              onClick={() => setCraftDataCollapsed(!craftDataCollapsed)}
              className="flex items-center text-xs font-medium text-gray-500 mb-1 hover:text-gray-700"
            >
              {craftDataCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="ml-1">Крафт</span>
            </button>
            {!craftDataCollapsed && (
              <div className="space-y-2 pl-1">
                {d.formulaIngridients && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Ингредиенты</label>
                    <div className="text-xs bg-gray-50 rounded px-2 py-1 break-words">
                      {d.formulaIngridients}
                    </div>
                  </div>
                )}
                {d.formulaUsedStation && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Станция</label>
                    <div className="text-xs bg-gray-50 rounded px-2 py-1 break-words">
                      {d.formulaUsedStation}
                    </div>
                  </div>
                )}
                {d.outputItem && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Результат</label>
                    <div className="text-xs bg-gray-50 rounded px-2 py-1 break-words">
                      {typeof d.outputItem === 'string' ? d.outputItem : d.outputItemRef?.name || ''}
                    </div>
                  </div>
                )}
                {d.openCondition && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Условие открытия</label>
                    <div className="text-xs bg-gray-50 rounded px-2 py-1 break-words">
                      {d.openCondition}
                    </div>
                  </div>
                )}
                {d.recipeDetail && d.recipeDetail.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Рецепт (детально)</label>
                    <div className="text-xs bg-gray-50 rounded px-2 py-1 space-y-0.5">
                      {d.recipeDetail.map((r: any, i: number) => (
                        <div key={i}>
                          {r.name}{r.qty ? ` x${r.qty}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Position */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Позиция</label>
          <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-1">
            x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
          </div>
        </div>

        {/* Incoming Edges */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center">
            <ArrowRight size={14} className="mr-1" />
            Входящие связи ({incomingEdges.length})
          </label>
          {incomingEdges.length > 0 ? (
            <div className="space-y-1">
              {incomingEdges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                return (
                  <button
                    key={edge.id}
                    onClick={() => handleJumpToNode(edge.source)}
                    className="w-full text-left text-xs bg-blue-50 hover:bg-blue-100 rounded px-2 py-1 text-blue-700 flex items-center justify-between"
                  >
                    <span className="truncate">{sourceNode?.data?.label || edge.source}</span>
                    <ArrowLeft size={12} className="flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">Нет входящих связей</div>
          )}
        </div>

        {/* Outgoing Edges */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center">
            <ArrowRight size={14} className="mr-1" />
            Исходящие связи ({outgoingEdges.length})
          </label>
          {outgoingEdges.length > 0 ? (
            <div className="space-y-1">
              {outgoingEdges.map((edge) => {
                const targetNode = nodes.find((n) => n.id === edge.target);
                return (
                  <button
                    key={edge.id}
                    onClick={() => handleJumpToNode(edge.target)}
                    className="w-full text-left text-xs bg-green-50 hover:bg-green-100 rounded px-2 py-1 text-green-700 flex items-center justify-between"
                  >
                    <span className="truncate">{targetNode?.data?.label || edge.target}</span>
                    <ArrowRight size={12} className="flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">Нет исходящих связей</div>
          )}
        </div>

        {/* Raw Data (Collapsible) */}
        <div>
          <button
            onClick={() => setRawDataCollapsed(!rawDataCollapsed)}
            className="flex items-center text-xs font-medium text-gray-500 mb-1 hover:text-gray-700"
          >
            {rawDataCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="ml-1">Исходные данные</span>
          </button>
          {!rawDataCollapsed && (
            <div className="relative">
              <textarea
                className="w-full border rounded px-2 py-1 text-xs font-mono h-40"
                value={JSON.stringify(selectedNode.data, null, 2)}
                readOnly
              />
              <button
                onClick={handleCopyJSON}
                className="absolute top-2 right-2 p-1 bg-white border rounded hover:bg-gray-50"
                title="Копировать JSON"
              >
                <Copy size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {showDeleteConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Удалить этот узел и все связанные связи?</p>
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteNode}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Подтвердить удаление
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
          >
            <Trash2 size={16} />
            <span>Удалить узел</span>
          </button>
        )}
      </div>
    </div>
  );
};
