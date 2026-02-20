import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Search, Filter, ChevronLeft } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { FilterBuilder } from './FilterBuilder';
import { nodeMatchesRules, buildUniqueValuesMap, getConnectedNodeIds } from '../utils/filterUtils';
import type { FilterRule } from '../types';

const BASE_GLASS_BLUR = 20;

export const Sidebar = () => {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const setNodes = useStore((state) => state.setNodes);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const settings = useStore((state) => state.settings);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'act' | 'stage' | 'order'>('order');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const reactFlowInstance = useReactFlow();

  const uniqueValues = useMemo(() => buildUniqueValuesMap(nodes), [nodes]);
  const connectedNodeIds = useMemo(() => getConnectedNodeIds(edges), [edges]);

  const filteredNodes = useMemo(() => {
    let result = nodes.filter((n) => {
      if (settings.hideUnconnectedNodes === true && !connectedNodeIds.has(n.id)) return false;
      const label = n.data?.label || n.id;
      const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRules = nodeMatchesRules(n, filterRules);
      return matchesSearch && matchesRules;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        const aLabel = a.data?.label || a.id;
        const bLabel = b.data?.label || b.id;
        return aLabel.localeCompare(bLabel);
      } else if (sortBy === 'act') {
        const parseAct = (d: { act?: string | number; techForAct?: string }) => {
          const v = d?.techForAct ?? d?.act;
          if (v == null) return 0;
          const m = String(v).match(/(\d+)/);
          return m ? parseInt(m[1], 10) : parseInt(String(v), 10) || 0;
        };
        return parseAct(a.data ?? {}) - parseAct(b.data ?? {});
      } else if (sortBy === 'stage') {
        const aStage = parseInt(a.data?.stage?.toString() || '0');
        const bStage = parseInt(b.data?.stage?.toString() || '0');
        return aStage - bStage;
      }
      return 0;
    });

    return result;
  }, [nodes, searchTerm, filterRules, sortBy, settings.hideUnconnectedNodes, connectedNodeIds]);

  const handleNodeClick = (nodeId: string) => {
    const updatedNodes = nodes.map((n) => ({
      ...n,
      selected: n.id === nodeId,
    }));
    setNodes(updatedNodes);

    if (reactFlowInstance) {
      reactFlowInstance.fitView({
        padding: 0.5,
        nodes: [{ id: nodeId }],
        duration: 300,
      });
    }
  };

  const activeFilterCount = filterRules.length;

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

  return (
    <aside 
      className="sidebar flex flex-col h-full border-r border-panel-border p-4 gap-3 overflow-hidden transition-all w-[var(--sidebar-width)]"
      style={{
        backgroundColor: glassEnabled
          ? 'color-mix(in srgb, var(--panel) 48%, transparent)'
          : 'color-mix(in srgb, var(--panel) 65%, transparent)',
        ...glassStyle,
      }}
    >
      <header className="sidebar__header shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">
          Узлы
          {nodes.length > 0 && (
            <span className="ml-1.5 font-normal text-muted text-sm">
              {filteredNodes.length === nodes.length
                ? `(${nodes.length})`
                : `(${filteredNodes.length} из ${nodes.length})`}
            </span>
          )}
        </h1>
        <button
          onClick={toggleSidebar}
          className="p-1 text-muted hover:text-text hover:bg-control-hover-bg rounded-md transition-colors"
          title="Свернуть сайдбар"
        >
          <ChevronLeft size={18} />
        </button>
      </header>

      {nodes.length === 0 ? (
        <div className="sidebar__scroll flex-1 flex flex-col items-center justify-center min-h-0 text-center">
          <p className="text-muted text-sm">Узлов пока нет.</p>
          <p className="text-muted text-sm mt-1">Импортируйте CSV для начала.</p>
        </div>
      ) : (
        <section 
          className="panel flex flex-col min-h-0 rounded-panel border border-panel-border shadow-panel overflow-hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--panel-2) 60%, transparent)' }}
        >
          <div className="panel__content flex flex-col min-h-0 p-3 gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="Поиск узлов..."
                className="w-full pl-8 pr-2.5 py-1.5 text-sm bg-control-bg border border-control-border rounded-control text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
              >
                <Filter size={14} />
                Фильтр
                {activeFilterCount > 0 && (
                  <span className="bg-accent text-[#0f141c] rounded-full px-1.5 py-0.5 text-xs font-medium shadow-[0_0_10px_rgba(106,162,255,0.4)]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'act' | 'stage' | 'order')}
                className="text-xs bg-control-bg border border-control-border rounded-control px-2 py-1 text-text focus:outline-none focus:border-accent transition-colors"
              >
                <option value="order">Порядок</option>
                <option value="name">Имя</option>
                <option value="act">Акт</option>
                <option value="stage">Стадия</option>
              </select>
            </div>

            {showFilters && (
              <div className="p-3 bg-control-bg-muted border border-control-border-muted rounded-control text-xs">
                <FilterBuilder
                  rules={filterRules}
                  onRulesChange={setFilterRules}
                  uniqueValues={uniqueValues}
                />
              </div>
            )}

            <div className="sidebar__scroll flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
              {filteredNodes.length === 0 ? (
                <p className="text-center text-muted text-sm py-6">Нет узлов, соответствующих фильтрам</p>
              ) : (
                <ul className="space-y-1.5">
                  {filteredNodes.map((node) => (
                    <li
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNodeClick(node.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
                      className={`event-list__item rounded-[10px] border px-3 py-2.5 cursor-pointer transition-all duration-200 ${
                        node.selected
                          ? 'bg-accent/20 border-accent text-text shadow-[0_0_12px_rgba(106,162,255,0.25)]'
                          : 'bg-event-item-bg border-event-item-border hover:bg-event-item-hover-bg hover:border-control-hover-border text-text'
                      }`}
                    >
                      <div className="event-list__title truncate font-medium text-sm">
                        {node.data?.label || node.id}
                      </div>
                      <div className="event-list__meta text-xs text-muted mt-0.5 truncate">
                        {(node.data?.techForAct || node.data?.act) && (node.data.techForAct || `Акт ${node.data.act}`)}
                        {node.data?.stage && ` | Стадия ${node.data.stage}`}
                        {node.data?.category && (
                          <span className="text-muted/70"> · {node.data.category}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </aside>
  );
};
