import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronRight, Copy, ArrowRight, ArrowLeft, Link, Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';
import { resolveNodeColor } from '../utils/colorMapping';
import { getNotionPageUrl } from '../utils/notionUrl';
import { NotionIcon } from './NotionIcon';

const labelClass = 'block text-xs font-medium text-muted mb-1.5';
const BASE_GLASS_BLUR = 20;
const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors';

/** Collect unique non-empty values from nodes for a data key */
function collectOptions(nodes: { data?: Record<string, any> }[], key: string): string[] {
  const set = new Set<string>();
  for (const n of nodes) {
    const v = n.data?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      set.add(String(v).trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Chip for display - colored */
function Chip({
  value,
  color,
  placeholder = '—',
  editable,
}: {
  value?: string;
  color?: string;
  placeholder?: string;
  editable?: boolean;
}) {
  const display = value?.trim() || placeholder;
  const isPlaceholder = !value?.trim();

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-[10px] text-xs font-medium
        border border-transparent transition-colors text-left max-w-full truncate
        ${editable ? 'cursor-pointer hover:opacity-90 hover:border-control-border' : ''}
        ${isPlaceholder ? 'opacity-70' : ''}
      `}
      style={{
        backgroundColor: color ? `${color}30` : undefined,
        borderLeftWidth: color ? '3px' : undefined,
        borderLeftColor: color || undefined,
      }}
      title={display}
    >
      <span className="truncate">{display}</span>
      {editable && <ChevronDown size={12} className="flex-shrink-0 opacity-60" />}
    </span>
  );
}

/** Dropdown select with chip display */
function ChipSelect({
  label,
  value,
  options,
  color,
  onChange,
  placeholder = '—',
}: {
  label: string;
  value?: string;
  options: string[];
  color?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const allOptions = useMemo(() => {
    const current = value?.trim();
    if (current && !options.includes(current)) return [current, ...options];
    return options;
  }, [options, value]);

  return (
    <div ref={ref} className="relative">
      <label className={labelClass}>{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
        className="w-full flex items-center gap-1.5 text-left cursor-pointer"
      >
        <Chip value={value} color={color} placeholder={placeholder} editable />
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 min-w-[140px] max-h-48 overflow-y-auto rounded-control border border-panel-border bg-panel shadow-floating z-50">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-muted hover:bg-control-hover-bg hover:text-text"
          >
            {placeholder}
          </button>
          {allOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-xs text-left hover:bg-control-hover-bg flex items-center gap-2 ${
                (value || '') === opt ? 'bg-accent/15 text-accent' : 'text-text'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color || 'var(--control-border)' }}
              />
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_VARIANTS: Record<string, string> = {
  implemented: '#34d399',
  done: '#34d399',
  Synchronized: '#34d399',
  'to remove': '#e36f6f',
  Canceled: '#e36f6f',
  'to update': '#f59e42',
  proposal: '#6aa2ff',
  to_do: '#a78bfa',
};

export const Inspector = () => {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const settings = useStore((state) => state.settings);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const deleteNodes = useStore((state) => state.deleteNodes);
  const setNodes = useStore((state) => state.setNodes);
  const toggleInspector = useStore((state) => state.toggleInspector);
  const setConnectedSubgraphHighlight = useStore((state) => state.setConnectedSubgraphHighlight);
  const onEdgesChange = useStore((state) => state.onEdgesChange);

  const [rawDataCollapsed, setRawDataCollapsed] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Function to highlight nodes by parameter matching
  const highlightNodesByParameter = (paramKey: string, paramValues: string[]) => {
    const matchingNodeIds = new Set<string>();
    
    // Find all nodes with matching parameter values
    nodes.forEach(node => {
      const nodeData = node.data;
      let hasMatch = false;
      
      switch (paramKey) {
        case 'openCondition':
          // Check openConditionRefs first
          if (nodeData.openConditionRefs?.length) {
            hasMatch = nodeData.openConditionRefs.some((ref: { name: string }) => 
              paramValues.some(v => ref.name.toLowerCase() === v.toLowerCase())
            );
          } else if (nodeData.openCondition) {
            // Split string by comma and check each value
            const values = nodeData.openCondition.split(',').map((s: string) => s.trim().toLowerCase());
            hasMatch = paramValues.some(v => values.includes(v.toLowerCase()));
          }
          break;
          
        case 'ingredients':
          if (nodeData.ingredients?.length) {
            hasMatch = nodeData.ingredients.some((ing: { name: string }) => 
              paramValues.some(v => ing.name.toLowerCase() === v.toLowerCase())
            );
          }
          break;
          
        case 'usedStations':
          if (nodeData.usedStations?.length) {
            hasMatch = nodeData.usedStations.some((station: { name: string }) => 
              paramValues.some(v => station.name.toLowerCase() === v.toLowerCase())
            );
          }
          break;
          
        case 'outputItem':
          // Check outputItemRef first
          if (nodeData.outputItemRef?.name) {
            hasMatch = paramValues.some(v => nodeData.outputItemRef!.name.toLowerCase() === v.toLowerCase());
          } else if (nodeData.outputItem) {
            hasMatch = paramValues.some(v => String(nodeData.outputItem).toLowerCase() === v.toLowerCase());
          }
          break;
      }
      
      if (hasMatch) {
        matchingNodeIds.add(node.id);
      }
    });
    
    // Find edges where both source and target are matching nodes
    const connectingEdgeIds = new Set<string>();
    edges.forEach(edge => {
      if (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)) {
        connectingEdgeIds.add(edge.id);
      }
    });
    
    // Apply highlight
    setConnectedSubgraphHighlight({ nodeIds: matchingNodeIds, edgeIds: connectingEdgeIds });
  };

  const reactFlowInstance = useReactFlow();
  const selectedNode = nodes.find((n) => n.selected);

  const incomingEdges = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : [];
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : [];

  const glassEnabled = settings.glassEffectEnabled !== false;
  const modifier = Math.max(0.5, Math.min(2.5, settings.glassEffectModifier ?? 1.2));
  const blurPx = Math.round(BASE_GLASS_BLUR * (3 - modifier));
  const glassStyle = glassEnabled
    ? {
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        transform: 'translateZ(0)',
        isolation: 'isolate' as const,
      }
    : { backdropFilter: 'none', WebkitBackdropFilter: 'none' };

  const handleChange = (key: string, value: any) => {
    if (selectedNode) updateNodeData(selectedNode.id, { [key]: value });
  };

  const handleJumpToNode = (nodeId: string) => {
    const updatedNodes = nodes.map((n) => ({ ...n, selected: n.id === nodeId }));
    setNodes(updatedNodes);
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode && reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.5, nodes: [{ id: nodeId }], duration: 300 });
    }
  };

  const handleSelectEdge = (edge: { id: string; source: string; target: string }) => {
    const nodeIds = new Set<string>([edge.source, edge.target]);
    const edgeIds = new Set<string>([edge.id]);
    setConnectedSubgraphHighlight({ nodeIds, edgeIds });
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.5, nodes: [{ id: edge.source }, { id: edge.target }], duration: 300 });
    }
  };

  const handleDeleteEdge = (edge: { id: string }) => {
    onEdgesChange([{ type: 'remove', id: edge.id }]);
  };

  const handleDeleteNode = () => {
    if (selectedNode && deleteNodes) {
      deleteNodes([selectedNode.id]);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyJSON = () => {
    if (selectedNode) navigator.clipboard.writeText(JSON.stringify(selectedNode.data, null, 2));
  };

  // Options from all nodes for dropdowns
  const actOptions = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodes) {
      const v = n.data?.techForAct ?? n.data?.act;
      if (v != null && String(v).trim()) set.add(String(v).trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [nodes]);
  const stageOptions = useMemo(() => collectOptions(nodes, 'stage'), [nodes]);
  const categoryOptions = useMemo(() => collectOptions(nodes, 'category'), [nodes]);
  const powerTypeOptions = useMemo(() => collectOptions(nodes, 'powerType'), [nodes]);
  const gameStatusOptions = useMemo(() => collectOptions(nodes, 'gameStatus'), [nodes]);
  const designStatusOptions = useMemo(() => collectOptions(nodes, 'designStatus'), [nodes]);
  const notionSyncOptions = useMemo(() => collectOptions(nodes, 'notionSyncStatus'), [nodes]);
  const getChipColor = (key: string, value?: string) => {
    if (!value) return undefined;
    const v = String(value);
    if (settings.nodeColorMap?.[v]) return settings.nodeColorMap[v];
    if (notionFieldColors[key]?.[v]) return notionFieldColors[key][v];
    if (STATUS_VARIANTS[v]) return STATUS_VARIANTS[v];
    return resolveNodeColor(
      v,
      undefined,
      settings.nodeColorPalette,
      notionFieldColors[key]
    );
  };

  if (!selectedNode) {
    return (
      <aside
        className="inspector w-80 shrink-0 flex flex-col h-full border-l border-panel-border p-4 transition-all overflow-y-auto"
        style={{
          backgroundColor: glassEnabled
            ? 'color-mix(in srgb, var(--panel) 48%, transparent)'
            : 'color-mix(in srgb, var(--panel) 65%, transparent)',
          ...glassStyle,
        }}
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

  const paramSection = (title: string, children: React.ReactNode) => (
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );

  return (
    <aside
      className="inspector w-80 shrink-0 flex flex-col h-full border-l border-panel-border shadow-panel z-10 min-h-0 transition-all"
      style={{
        backgroundColor: glassEnabled
          ? 'color-mix(in srgb, var(--panel) 48%, transparent)'
          : 'color-mix(in srgb, var(--panel) 65%, transparent)',
        ...glassStyle,
      }}
    >
      <header
        className="inspector__header shrink-0 p-4 border-b border-panel-border flex justify-between items-start"
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel-2) 50%, transparent)' }}
      >
        <div className="flex-1 min-w-0 mr-2">
          <h2 className="uppercase tracking-wider text-text text-sm font-semibold">Инспектор</h2>
          <div className="text-xs text-muted font-mono mt-1 truncate" title={selectedNode.id}>
            {selectedNode.id}
          </div>
          {(d?.techCraftId || d?.notionPageId) && (
            <div className="mt-2 pt-2 border-t border-panel-border flex flex-wrap gap-1">
              {d.techCraftId && (
                <span className="text-xs px-2 py-0.5 rounded-[8px] bg-control-bg-muted text-muted font-mono truncate max-w-full" title={d.techCraftId}>
                  {d.techCraftId}
                </span>
              )}
              {d.notionPageId && (
                <a
                  href={getNotionPageUrl(d.notionPageId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[8px] bg-control-bg-muted text-muted hover:text-text hover:bg-control-hover-bg font-mono truncate max-w-[8rem] transition-colors"
                  title="Открыть в Notion"
                >
                  <NotionIcon size={12} className="text-accent" />
                  Notion
                </a>
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

      <div className="panel__content flex-1 overflow-y-auto p-4 space-y-5">
        {paramSection('Основное', (
          <>
            <div>
              <label className={labelClass}>Название</label>
              <input
                type="text"
                className={inputClass}
                value={d?.label || ''}
                onChange={(e) => handleChange('label', e.target.value)}
                placeholder="Название узла"
              />
            </div>
            <div>
              <label className={labelClass}>ItemCodeName</label>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputClass} pr-9 text-sm`}
                  value={d?.itemCodeName || ''}
                  readOnly
                  disabled
                  style={{ height: '1.75rem' }}
                  placeholder="Нет данных"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(d?.itemCodeName || '')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-6 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border hover:bg-control-hover-bg transition-colors disabled:opacity-50"
                  title="Копировать CodeName"
                  aria-label="Копировать CodeName"
                  disabled={!d?.itemCodeName}
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ChipSelect
                label="Акт (TechForAct)"
                value={(d?.techForAct ?? d?.act) != null ? String(d.techForAct ?? d.act) : ''}
                options={actOptions}
                color={getChipColor('act', (d?.techForAct ?? d?.act) as string)}
                onChange={(v) => handleChange('techForAct', v || undefined)}
              />
              <ChipSelect
                label="Стадия"
                value={d?.stage != null ? String(d.stage) : ''}
                options={stageOptions}
                color={getChipColor('stage', d?.stage != null ? String(d.stage) : undefined)}
                onChange={(v) => handleChange('stage', v || undefined)}
              />
            </div>
            <ChipSelect
              label="Категория"
              value={d?.category || ''}
              options={categoryOptions}
              color={getChipColor('category', d?.category)}
              onChange={(v) => handleChange('category', v)}
            />
          </>
        ))}

        {paramSection('Статусы', (
          <>
            <ChipSelect
              label="Тип питания"
              value={d?.powerType || ''}
              options={powerTypeOptions}
              color={getChipColor('powerType', d?.powerType)}
              onChange={(v) => handleChange('powerType', v)}
            />
            <ChipSelect
              label="Статус в игре"
              value={d?.gameStatus || ''}
              options={gameStatusOptions}
              color={getChipColor('gameStatus', d?.gameStatus)}
              onChange={(v) => handleChange('gameStatus', v)}
            />
            <ChipSelect
              label="Статус дизайна"
              value={d?.designStatus || ''}
              options={designStatusOptions}
              color={getChipColor('designStatus', d?.designStatus)}
              onChange={(v) => handleChange('designStatus', v)}
            />
            <ChipSelect
              label="Статус Notion"
              value={d?.notionSyncStatus || ''}
              options={notionSyncOptions}
              color={getChipColor('notionSyncStatus', d?.notionSyncStatus)}
              onChange={(v) => handleChange('notionSyncStatus', v)}
            />
          </>
        ))}

        {paramSection('Связи', (
          <>
            <div>
              <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1">
                <ArrowRight size={14} />
                Входящие ({incomingEdges.length})
              </label>
              {incomingEdges.length > 0 ? (
                <div className="space-y-1">
                  {incomingEdges.map((edge) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    return (
                      <div key={edge.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleJumpToNode(edge.source)}
                          className="flex-1 min-w-0 text-left text-xs px-2 py-1.5 rounded-[8px] bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border text-text flex items-center justify-between gap-1.5 transition-colors"
                        >
                          <span className="min-w-0 break-words">{sourceNode?.data?.label || edge.source}</span>
                          <ArrowLeft size={12} className="flex-shrink-0 ml-1" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEdge(edge);
                          }}
                          className="p-1.5 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0"
                          title="Выделить связь"
                          aria-label="Выделить связь"
                        >
                          <Link size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEdge(edge);
                          }}
                          className="p-1.5 rounded-[6px] text-muted hover:text-danger hover:bg-danger/15 transition-colors flex-shrink-0"
                          title="Удалить связь"
                          aria-label="Удалить связь"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted italic">Нет</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1">
                <ArrowRight size={14} />
                Исходящие ({outgoingEdges.length})
              </label>
              {outgoingEdges.length > 0 ? (
                <div className="space-y-1">
                  {outgoingEdges.map((edge) => {
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    return (
                      <div key={edge.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleJumpToNode(edge.target)}
                          className="flex-1 min-w-0 text-left text-xs px-2 py-1.5 rounded-[8px] bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border text-text flex items-center justify-between gap-1.5 transition-colors"
                        >
                          <span className="min-w-0 break-words">{targetNode?.data?.label || edge.target}</span>
                          <ArrowRight size={12} className="flex-shrink-0 ml-1" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEdge(edge);
                          }}
                          className="p-1.5 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0"
                          title="Выделить связь"
                          aria-label="Выделить связь"
                        >
                          <Link size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEdge(edge);
                          }}
                          className="p-1.5 rounded-[6px] text-muted hover:text-danger hover:bg-danger/15 transition-colors flex-shrink-0"
                          title="Удалить связь"
                          aria-label="Удалить связь"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted italic">Нет</p>
              )}
            </div>
          </>
        ))}

        {paramSection('Крафт и условия', (
          <>
            <div>
              <label className="block text-xs font-medium text-muted mb-2">
                OpenCondition ({d?.openConditionRefs?.length ?? (d?.openCondition ? d.openCondition.split(',').map((s: string) => s.trim()).filter(Boolean).length : 0)})
              </label>
              {(() => {
                const refs = d?.openConditionRefs;
                if (refs?.length) {
                  return (
                    <div className="space-y-1">
                      {refs.map((ref, i) => {
                        const color = getChipColor('openCondition', ref.name);
                        const style = {
                          backgroundColor: color ? `${color}20` : undefined,
                          borderLeftWidth: color ? '3px' : undefined,
                          borderLeftColor: color || undefined,
                          boxShadow: color ? `0 0 10px ${color}40` : undefined,
                        };
                        const content = (
                          <>
                            <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">{ref.name}</span>
                            {ref.pageId && <NotionIcon size={12} className="flex-shrink-0 self-center ml-1 opacity-90" color={color} />}
                          </>
                        );
                        return ref.pageId ? (
                          <a
                            key={i}
                            href={getNotionPageUrl(ref.pageId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text hover:opacity-90 transition-opacity"
                            style={style}
                            title="Открыть в Notion"
                          >
                            {content}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                highlightNodesByParameter('openCondition', [ref.name]);
                              }}
                              className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                              title="Подсветить все с таким же параметром"
                            >
                              <Search size={12} />
                            </button>
                          </a>
                        ) : (
                          <div key={i} className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                            <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">{ref.name}</span>
                            <button
                              type="button"
                              onClick={() => highlightNodesByParameter('openCondition', [ref.name])}
                              className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                              title="Подсветить все с таким же параметром"
                            >
                              <Search size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                const raw = d?.openCondition ?? '';
                const items = raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                return items.length > 0 ? (
                  <div className="space-y-1">
                    {items.map((item, i) => {
                      const color = getChipColor('openCondition', item);
                      return (
                        <div
                          key={i}
                          className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text"
                          style={{
                            backgroundColor: color ? `${color}20` : undefined,
                            borderLeftWidth: color ? '3px' : undefined,
                            borderLeftColor: color || undefined,
                            boxShadow: color ? `0 0 10px ${color}40` : undefined,
                          }}
                        >
                          <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">{item}</span>
                          <button
                            type="button"
                            onClick={() => highlightNodesByParameter('openCondition', [item])}
                            className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                            title="Подсветить все с таким же параметром"
                          >
                            <Search size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">Нет</p>
                );
              })()}
            </div>
            {(d?.ingredients?.length) && (
              <div>
                <label className={labelClass}>Из чего крафтится (Ingridients)</label>
                <div className="space-y-1">
                  {d.ingredients.map((ref: { name?: string; pageId?: string; qty?: number }, i: number) => {
                    const color = getChipColor('ingredients', ref.name);
                    const style = {
                      backgroundColor: color ? `${color}20` : undefined,
                      borderLeftWidth: color ? '3px' : undefined,
                      borderLeftColor: color || undefined,
                      boxShadow: color ? `0 0 10px ${color}40` : undefined,
                    };
                    const content = (
                      <>
                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">
                          {ref.name}
                          {ref.qty ? ` ×${ref.qty}` : ''}
                        </span>
                        {ref.pageId && <NotionIcon size={12} className="flex-shrink-0 self-center ml-1 opacity-90" color={color} />}
                      </>
                    );
                    return ref.pageId ? (
                      <a
                        key={i}
                        href={getNotionPageUrl(ref.pageId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text hover:opacity-90 transition-opacity"
                        style={style}
                        title="Открыть в Notion"
                      >
                        {content}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            highlightNodesByParameter('ingredients', [ref.name || '']);
                          }}
                          className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                          title="Подсветить все с таким же параметром"
                        >
                          <Search size={12} />
                        </button>
                      </a>
                    ) : (
                      <div key={i} className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">
                          {ref.name}
                          {ref.qty ? ` ×${ref.qty}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => highlightNodesByParameter('ingredients', [ref.name || ''])}
                          className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                          title="Подсветить все с таким же параметром"
                        >
                          <Search size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(d?.usedStations?.length) && (
              <div>
                <label className={labelClass}>Станция крафта (UsedStation)</label>
                <div className="space-y-1">
                  {d.usedStations.map((ref: { name?: string; pageId?: string }, i: number) => {
                    const color = getChipColor('usedStation', ref.name);
                    const style = {
                      backgroundColor: color ? `${color}20` : undefined,
                      borderLeftWidth: color ? '3px' : undefined,
                      borderLeftColor: color || undefined,
                      boxShadow: color ? `0 0 10px ${color}40` : undefined,
                    };
                    const content = (
                      <>
                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">{ref.name}</span>
                        {ref.pageId && <NotionIcon size={12} className="flex-shrink-0 self-center ml-1 opacity-90" color={color} />}
                      </>
                    );
                    return ref.pageId ? (
                      <a
                        key={i}
                        href={getNotionPageUrl(ref.pageId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text hover:opacity-90 transition-opacity"
                        style={style}
                        title="Открыть в Notion"
                      >
                        {content}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            highlightNodesByParameter('usedStations', [ref.name || '']);
                          }}
                          className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                          title="Подсветить все с таким же параметром"
                        >
                          <Search size={12} />
                        </button>
                      </a>
                    ) : (
                      <div key={i} className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">{ref.name}</span>
                        <button
                          type="button"
                          onClick={() => highlightNodesByParameter('usedStations', [ref.name || ''])}
                          className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                          title="Подсветить все с таким же параметром"
                        >
                          <Search size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(d?.outputItemRef || d?.outputItem) && (
              <div>
                <label className={labelClass}>Получаемый предмет (OutputItem)</label>
                <div className="space-y-1">
                  {(() => {
                    if (d.outputItemRef) {
                      const color = getChipColor('outputItem', d.outputItemRef.name);
                      const style = {
                        backgroundColor: color ? `${color}20` : undefined,
                        borderLeftWidth: color ? '3px' : undefined,
                        borderLeftColor: color || undefined,
                        boxShadow: color ? `0 0 10px ${color}40` : undefined,
                      };
                      const content = (
                        <>
                          <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">
                            {d.outputItemRef.name}
                            {d.outputItemRef.qty && ` ×${d.outputItemRef.qty}`}
                          </span>
                          {d.outputItemRef.pageId && <NotionIcon size={12} className="flex-shrink-0 self-center ml-1 opacity-90" color={color} />}
                        </>
                      );
                      return d.outputItemRef.pageId ? (
                        <a
                          key="output-item-ref"
                          href={getNotionPageUrl(d.outputItemRef.pageId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text hover:opacity-90 transition-opacity"
                          style={style}
                          title="Открыть в Notion"
                        >
                          {content}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              highlightNodesByParameter('outputItem', [d.outputItemRef?.name || '']);
                            }}
                            className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                            title="Подсветить все с таким же параметром"
                          >
                            <Search size={12} />
                          </button>
                        </a>
                      ) : (
                        <div key="output-item-ref-no-link" className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                          <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">
                            {d.outputItemRef.name}
                            {d.outputItemRef.qty && ` ×${d.outputItemRef.qty}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => highlightNodesByParameter('outputItem', [d.outputItemRef?.name || ''])}
                            className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                            title="Подсветить все с таким же параметром"
                          >
                            <Search size={12} />
                          </button>
                        </div>
                      );
                    } else if (d.outputItem) {
                      const color = getChipColor('outputItem', String(d.outputItem));
                      const style = {
                        backgroundColor: color ? `${color}20` : undefined,
                        borderLeftWidth: color ? '3px' : undefined,
                        borderLeftColor: color || undefined,
                        boxShadow: color ? `0 0 10px ${color}40` : undefined,
                      };
                      return (
                        <div key="output-item-string" className="flex items-center text-xs px-1.5 py-0.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                          <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight">
                            {String(d.outputItem)}
                            {d.outputDetail && ` ×${d.outputDetail}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => highlightNodesByParameter('outputItem', [String(d.outputItem)])}
                            className="ml-1 p-1 rounded-[6px] text-muted hover:text-accent hover:bg-control-hover-bg transition-colors flex-shrink-0 self-center"
                            title="Подсветить все с таким же параметром"
                          >
                            <Search size={12} />
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
            {(d?.formulaIngridients) && (
              <div className="space-y-1.5">
                {d.formulaIngridients && (
                  <div>
                    <label className={labelClass}>Ингредиенты</label>
                    <div className="flex flex-wrap gap-1">
                      {String(d.formulaIngridients)
                        .split(/,|;/)
                        .map((s: string, i: number) => {
                          const t = s.trim();
                          return t ? (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-[8px] bg-control-bg-muted text-text border border-control-border-muted"
                            >
                              {t}
                            </span>
                          ) : null;
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(d?.electricCost || d?.researchTime || d?.notes || d?.itemLootingInAct) && (
              <div>
                <label className={labelClass}>Доп. параметры</label>
                <div className="flex flex-wrap gap-1.5">
                {d.electricCost && (
                  <span className="text-xs px-2 py-0.5 rounded-[8px] bg-sky-500/15 text-sky-600 dark:text-sky-400" title="Энергия">
                    ⚡ {d.electricCost}
                  </span>
                )}
                {d.researchTime && (
                  <span className="text-xs px-2 py-0.5 rounded-[8px] bg-violet-500/15 text-violet-600 dark:text-violet-400" title="Время исследования">
                    ⏱ {d.researchTime}
                  </span>
                )}
                {d.itemLootingInAct && (
                  <span className="text-xs px-2 py-0.5 rounded-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {d.itemLootingInAct}
                  </span>
                )}
                {d.notes && (
                  <span className="text-xs px-2 py-0.5 rounded-[8px] bg-control-bg-muted text-muted max-w-full truncate" title={d.notes}>
                    {d.notes}
                  </span>
                )}
                </div>
              </div>
            )}
          </>
        ))}

        {paramSection('Прочее', (
          <>
            <div>
              <label className={labelClass}>Позиция</label>
              <span className="text-xs px-2 py-1 rounded-[8px] bg-control-bg-muted text-muted font-mono">
                x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
              </span>
            </div>
          </>
        ))}

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
                className="flex-1 px-3 py-2 bg-danger text-[#0f141c] rounded-control text-sm font-medium hover:opacity-90"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 bg-control-bg border border-control-border rounded-control text-sm text-text hover:bg-control-hover-bg"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-control text-sm border border-danger/45 bg-danger/15 text-danger hover:bg-danger/25"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Удалить узел
          </button>
        )}
      </footer>
    </aside>
  );
};
