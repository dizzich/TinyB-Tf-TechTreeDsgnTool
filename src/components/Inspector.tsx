import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';

const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-xs font-medium text-muted mb-1';

/** Small status badge */
const StatusBadge = ({ value, color }: { value?: string; color: string }) => {
  if (!value) return null;
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-small ${color}`}>
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
  const toggleInspector = useStore((state) => state.toggleInspector);

  const [rawDataCollapsed, setRawDataCollapsed] = useState(true);
  const [craftDataCollapsed, setCraftDataCollapsed] = useState(false);
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const reactFlowInstance = useReactFlow();

  const selectedNode = nodes.find((n) => n.selected);

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
      <aside 
        className="inspector w-80 shrink-0 flex flex-col h-full backdrop-blur-md border-l border-panel-border p-4 transition-all"
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 90%, transparent)' }}
      >
        <header className="inspector__header shrink-0 flex justify-between items-center mb-4">
          <h2 className="uppercase tracking-wider text-text text-sm font-semibold">Инспектор</h2>
          <button
            onClick={toggleInspector}
            className="p-1 text-muted hover:text-text hover:bg-control-hover-bg rounded-md transition-colors"
            title="Свернуть инспектор"
          >
            <ChevronRight size={18} />
          </button>
        </header>
        <p className="text-muted text-sm text-center mt-10">Выберите узел для редактирования</p>
      </aside>
    );
  }

  const d = selectedNode.data;

  const statusBadge = (status: string, variant: 'success' | 'danger' | 'warn' | 'info' | 'neutral') => {
    const variants = {
      success: 'bg-emerald-500/20 text-emerald-400',
      danger: 'bg-danger/20 text-danger',
      warn: 'bg-amber-500/20 text-amber-400',
      info: 'bg-accent/20 text-accent',
      neutral: 'bg-control-bg-muted text-muted',
    };
    return <StatusBadge value={status} color={variants[variant]} />;
  };

  return (
    <aside 
      className="inspector w-80 shrink-0 flex flex-col h-full backdrop-blur-md border-l border-panel-border shadow-panel z-10 overflow-hidden transition-all"
      style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 90%, transparent)' }}
    >
      <header 
        className="inspector__header shrink-0 p-4 border-b border-panel-border flex justify-between items-start"
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel-2) 60%, transparent)' }}
      >
        <div className="flex-1 min-w-0 mr-2">
          <h2 className="uppercase tracking-wider text-text text-sm font-semibold">Инспектор</h2>
          <div className="text-xs text-muted font-mono mt-1 truncate" title={selectedNode.id}>{selectedNode.id}</div>
          {(d?.techCraftId || d?.notionPageId) && (
            <div className="mt-2 pt-2 border-t border-panel-border space-y-0.5">
              {d.techCraftId && (
                <div className="text-xs text-muted">
                  <span className="font-medium text-text">TechCraftID:</span>{' '}
                  <span className="font-mono">{d.techCraftId}</span>
                </div>
              )}
              {d.notionPageId && (
                <div className="text-xs text-muted truncate" title={d.notionPageId}>
                  <span className="font-medium text-text">Notion:</span>{' '}
                  <span className="font-mono">{d.notionPageId}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={toggleInspector}
          className="p-1 text-muted hover:text-text hover:bg-control-hover-bg rounded-md transition-colors flex-shrink-0"
          title="Свернуть инспектор"
        >
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="panel__content flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className={labelClass}>Название</label>
          <input
            type="text"
            className={inputClass}
            value={d?.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Акт</label>
            <input
              type="text"
              className={inputClass}
              value={d?.act || ''}
              onChange={(e) => handleChange('act', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Стадия</label>
            <input
              type="text"
              className={inputClass}
              value={d?.stage || ''}
              onChange={(e) => handleChange('stage', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Категория</label>
          <input
            type="text"
            className={inputClass}
            value={d?.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
          />
        </div>

        {(d?.gameStatus || d?.designStatus || d?.notionSyncStatus || d?.powerType || d?.techGameStatus) && (
          <div>
            <button
              type="button"
              onClick={() => setStatusCollapsed(!statusCollapsed)}
              className="flex items-center text-xs font-medium text-muted hover:text-text transition-colors"
            >
              {statusCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="ml-1">Статусы</span>
            </button>
            {!statusCollapsed && (
              <div className="space-y-2 pl-1 mt-1">
                {d.gameStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Игра:</span>
                    {statusBadge(
                      d.gameStatus,
                      d.gameStatus === 'implemented' ? 'success' : d.gameStatus === 'to remove' ? 'danger' : 'warn'
                    )}
                  </div>
                )}
                {d.designStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Дизайн:</span>
                    {statusBadge(
                      d.designStatus,
                      d.designStatus === 'done' ? 'success' : d.designStatus === 'Canceled' ? 'danger' : 'info'
                    )}
                  </div>
                )}
                {d.notionSyncStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Sync:</span>
                    {statusBadge(
                      d.notionSyncStatus,
                      d.notionSyncStatus === 'Synchronized' ? 'success' : 'warn'
                    )}
                  </div>
                )}
                {d.powerType && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Питание:</span>
                    {statusBadge(d.powerType, 'neutral')}
                  </div>
                )}
                {d.techGameStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Tech:</span>
                    {statusBadge(d.techGameStatus, 'neutral')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(d?.formulaIngridients || d?.formulaUsedStation || d?.outputItem || d?.openCondition) && (
          <div>
            <button
              type="button"
              onClick={() => setCraftDataCollapsed(!craftDataCollapsed)}
              className="flex items-center text-xs font-medium text-muted hover:text-text transition-colors"
            >
              {craftDataCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="ml-1">Крафт</span>
            </button>
            {!craftDataCollapsed && (
              <div className="space-y-2 pl-1 mt-1">
                {d.formulaIngridients && (
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Ингредиенты</label>
                    <div className="text-xs bg-control-bg-muted rounded-control px-2.5 py-1.5 break-words text-text border border-control-border-muted">
                      {d.formulaIngridients}
                    </div>
                  </div>
                )}
                {d.formulaUsedStation && (
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Станция</label>
                    <div className="text-xs bg-control-bg-muted rounded-control px-2.5 py-1.5 break-words text-text border border-control-border-muted">
                      {d.formulaUsedStation}
                    </div>
                  </div>
                )}
                {d.outputItem && (
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Результат</label>
                    <div className="text-xs bg-control-bg-muted rounded-control px-2.5 py-1.5 break-words text-text border border-control-border-muted">
                      {typeof d.outputItem === 'string' ? d.outputItem : d.outputItemRef?.name || ''}
                    </div>
                  </div>
                )}
                {d.openCondition && (
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Условие открытия</label>
                    <div className="text-xs bg-control-bg-muted rounded-control px-2.5 py-1.5 break-words text-text border border-control-border-muted">
                      {d.openCondition}
                    </div>
                  </div>
                )}
                {d.recipeDetail && d.recipeDetail.length > 0 && (
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Рецепт (детально)</label>
                    <div className="text-xs bg-control-bg-muted rounded-control px-2.5 py-1.5 space-y-0.5 text-text border border-control-border-muted">
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

        <div>
          <label className={labelClass}>Позиция</label>
          <div className="text-xs text-muted font-mono bg-control-bg-muted rounded-control px-2.5 py-1.5 border border-control-border-muted">
            x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1">
            <ArrowRight size={14} />
            Входящие связи ({incomingEdges.length})
          </label>
          {incomingEdges.length > 0 ? (
            <div className="space-y-1">
              {incomingEdges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                return (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => handleJumpToNode(edge.source)}
                    className="w-full text-left text-xs bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border rounded-control px-2.5 py-1.5 text-text flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{sourceNode?.data?.label || edge.source}</span>
                    <ArrowLeft size={12} className="flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted italic">Нет входящих связей</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1">
            <ArrowRight size={14} />
            Исходящие связи ({outgoingEdges.length})
          </label>
          {outgoingEdges.length > 0 ? (
            <div className="space-y-1">
              {outgoingEdges.map((edge) => {
                const targetNode = nodes.find((n) => n.id === edge.target);
                return (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => handleJumpToNode(edge.target)}
                    className="w-full text-left text-xs bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border rounded-control px-2.5 py-1.5 text-text flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{targetNode?.data?.label || edge.target}</span>
                    <ArrowRight size={12} className="flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted italic">Нет исходящих связей</p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setRawDataCollapsed(!rawDataCollapsed)}
            className="flex items-center text-xs font-medium text-muted hover:text-text transition-colors"
          >
            {rawDataCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="ml-1">Исходные данные</span>
          </button>
          {!rawDataCollapsed && (
            <div className="relative mt-1">
              <textarea
                className={`${inputClass} h-40 font-mono resize-none`}
                value={JSON.stringify(selectedNode.data, null, 2)}
                readOnly
              />
              <button
                type="button"
                onClick={handleCopyJSON}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border transition-colors"
                title="Копировать JSON"
                aria-label="Копировать JSON"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <footer 
        className="p-4 border-t border-panel-border bg-panel-2/50 shrink-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel-2) 60%, transparent)' }}
      >
        {showDeleteConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Удалить этот узел и все связанные связи?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteNode}
                className="flex-1 px-3 py-2 bg-danger text-[#0f141c] rounded-control text-sm font-medium hover:opacity-90 transition-opacity shadow-[0_0_10px_rgba(227,111,111,0.4)]"
              >
                Подтвердить удаление
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 bg-control-bg border border-control-border rounded-control text-sm text-text hover:bg-control-hover-bg hover:border-control-hover-border transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-control text-sm border border-danger/45 bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            <span>Удалить узел</span>
          </button>
        )}
      </footer>
    </aside>
  );
};
