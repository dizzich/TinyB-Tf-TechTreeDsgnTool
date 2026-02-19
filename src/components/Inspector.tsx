import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronRight, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';
import { resolveNodeColor } from '../utils/colorMapping';
import { getNotionPageUrl } from '../utils/notionUrl';
import { NotionIcon } from './NotionIcon';

const labelClass = 'block text-xs font-medium text-muted mb-1.5';
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

  const [rawDataCollapsed, setRawDataCollapsed] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const reactFlowInstance = useReactFlow();
  const selectedNode = nodes.find((n) => n.selected);

  const incomingEdges = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : [];
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : [];

  const handleChange = (key: string, value: any) => {
    if (selectedNode) updateNodeData(selectedNode.id, { [key]: value });
  };

  const handleJumpToNode = (nodeId: string) => {
    const t = useStore.temporal.getState();
    t.pause();
    const updatedNodes = nodes.map((n) => ({ ...n, selected: n.id === nodeId }));
    setNodes(updatedNodes);
    t.resume();
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode && reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.5, nodes: [{ id: nodeId }], duration: 300 });
    }
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
  const actOptions = useMemo(() => collectOptions(nodes, 'act'), [nodes]);
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
        className="inspector w-80 shrink-0 flex flex-col h-full border-l border-panel-border p-4 transition-all"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--panel) 65%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
      className="inspector w-80 shrink-0 flex flex-col h-full border-l border-panel-border shadow-panel z-10 overflow-hidden transition-all"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--panel) 65%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
            <div className="grid grid-cols-2 gap-2">
              <ChipSelect
                label="Акт"
                value={d?.act != null ? String(d.act) : ''}
                options={actOptions}
                color={getChipColor('act', d?.act)}
                onChange={(v) => handleChange('act', v || undefined)}
              />
              <ChipSelect
                label="Стадия"
                value={d?.stage != null ? String(d.stage) : ''}
                options={stageOptions}
                color={getChipColor('stage', d?.stage)}
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
                            <span className="truncate flex-1 min-w-0">{ref.name}</span>
                            {ref.pageId && <NotionIcon size={14} className="flex-shrink-0 ml-1.5 opacity-90" color={color} />}
                          </>
                        );
                        return ref.pageId ? (
                          <a
                            key={i}
                            href={getNotionPageUrl(ref.pageId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-xs px-2 py-1.5 rounded-[8px] border border-control-border-muted text-text hover:opacity-90 transition-opacity"
                            style={style}
                            title="Открыть в Notion"
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={i} className="flex items-center text-xs px-2 py-1.5 rounded-[8px] border border-control-border-muted text-text" style={style}>
                            <span className="truncate">{ref.name}</span>
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
                          className="text-xs px-2 py-1.5 rounded-[8px] border border-control-border-muted text-text"
                          style={{
                            backgroundColor: color ? `${color}20` : undefined,
                            borderLeftWidth: color ? '3px' : undefined,
                            borderLeftColor: color || undefined,
                            boxShadow: color ? `0 0 10px ${color}40` : undefined,
                          }}
                        >
                          <span className="truncate block">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">Нет</p>
                );
              })()}
            </div>
            {(d?.formulaIngridients || d?.formulaUsedStation || d?.outputItem) && (
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
                {d.formulaUsedStation && (
                  <div>
                    <label className={labelClass}>Станция</label>
                    <span className="text-xs px-2 py-1 rounded-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {d.formulaUsedStation}
                    </span>
                  </div>
                )}
                {d.outputItem && (
                  <div>
                    <label className={labelClass}>Результат</label>
                    <span className="text-xs px-2 py-1 rounded-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {typeof d.outputItem === 'string' ? d.outputItem : d.outputItemRef?.name || ''}
                    </span>
                  </div>
                )}
                {d.recipeDetail && d.recipeDetail.length > 0 && (
                  <div>
                    <label className={labelClass}>Рецепт</label>
                    <div className="flex flex-wrap gap-1">
                      {d.recipeDetail.map((r: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-[8px] bg-control-bg-muted text-text border border-control-border-muted"
                        >
                          {r.name}{r.qty ? ` ×${r.qty}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(d?.electricCost || d?.researchTime || d?.notes || d?.itemLootingInAct || d?.techForAct) && (
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
                {d.techForAct && (
                  <span className="text-xs px-2 py-0.5 rounded-[8px] bg-panel-2 border border-panel-border">
                    {d.techForAct}
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
          <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1">
            <ArrowRight size={14} />
            Входящие ({incomingEdges.length})
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
                    className="w-full text-left text-xs px-2 py-1.5 rounded-[8px] bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border text-text flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{sourceNode?.data?.label || edge.source}</span>
                    <ArrowLeft size={12} className="flex-shrink-0 ml-1" />
                  </button>
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
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => handleJumpToNode(edge.target)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-[8px] bg-control-bg-muted hover:bg-control-hover-bg border border-control-border-muted hover:border-control-hover-border text-text flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{targetNode?.data?.label || edge.target}</span>
                    <ArrowRight size={12} className="flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted italic">Нет</p>
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
