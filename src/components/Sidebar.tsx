import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Search, Filter, ChevronLeft } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export const Sidebar = () => {
  const nodes = useStore((state) => state.nodes);
  const setNodes = useStore((state) => state.setNodes);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'act' | 'stage' | 'order'>('order');
  const [filterAct, setFilterAct] = useState<string[]>([]);
  const [filterStage, setFilterStage] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);

  const reactFlowInstance = useReactFlow();

  const uniqueActs = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.act?.toString() || '').filter(Boolean))),
    [nodes]
  );
  const uniqueStages = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.stage?.toString() || '').filter(Boolean))),
    [nodes]
  );
  const uniqueCategories = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.category || '').filter(Boolean))),
    [nodes]
  );

  const filteredNodes = useMemo(() => {
    let result = nodes.filter((n) => {
      const label = n.data?.label || n.id;
      const matchesSearch = label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAct =
        filterAct.length === 0 || filterAct.includes(n.data?.act?.toString() || '');
      const matchesStage =
        filterStage.length === 0 || filterStage.includes(n.data?.stage?.toString() || '');
      const matchesCategory =
        filterCategory.length === 0 || filterCategory.includes(n.data?.category || '');

      return matchesSearch && matchesAct && matchesStage && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        const aLabel = a.data?.label || a.id;
        const bLabel = b.data?.label || b.id;
        return aLabel.localeCompare(bLabel);
      } else if (sortBy === 'act') {
        const aAct = parseInt(a.data?.act?.toString() || '0');
        const bAct = parseInt(b.data?.act?.toString() || '0');
        return aAct - bAct;
      } else if (sortBy === 'stage') {
        const aStage = parseInt(a.data?.stage?.toString() || '0');
        const bStage = parseInt(b.data?.stage?.toString() || '0');
        return aStage - bStage;
      }
      return 0;
    });

    return result;
  }, [nodes, searchTerm, filterAct, filterStage, filterCategory, sortBy]);

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

  const toggleFilter = (value: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const clearFilters = () => {
    setFilterAct([]);
    setFilterStage([]);
    setFilterCategory([]);
  };

  const activeFilterCount =
    filterAct.length + filterStage.length + filterCategory.length;

  return (
    <aside 
      className="sidebar flex flex-col h-full backdrop-blur-md border-r border-panel-border p-4 gap-3 overflow-hidden transition-all w-[var(--sidebar-width)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 90%, transparent)' }}
    >
      <header className="sidebar__header shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Узлы</h1>
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
              <div className="p-3 bg-control-bg-muted border border-control-border-muted rounded-control text-xs space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text">Фильтры</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      Очистить
                    </button>
                  )}
                </div>

                {uniqueActs.length > 0 && (
                  <div>
                    <label className="font-medium text-text block mb-1">Акт</label>
                    <div className="space-y-1">
                      {uniqueActs.map((act) => (
                        <label
                          key={act}
                          className="checkbox-label flex items-center gap-1.5 cursor-pointer text-text hover:text-accent transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterAct.includes(act)}
                            onChange={() => toggleFilter(act, filterAct, setFilterAct)}
                            className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                          />
                          <span>Акт {act}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {uniqueStages.length > 0 && (
                  <div>
                    <label className="font-medium text-text block mb-1">Стадия</label>
                    <div className="space-y-1">
                      {uniqueStages.map((stage) => (
                        <label
                          key={stage}
                          className="checkbox-label flex items-center gap-1.5 cursor-pointer text-text hover:text-accent transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterStage.includes(stage)}
                            onChange={() => toggleFilter(stage, filterStage, setFilterStage)}
                            className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                          />
                          <span>Стадия {stage}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {uniqueCategories.length > 0 && (
                  <div>
                    <label className="font-medium text-text block mb-1">Категория</label>
                    <div className="space-y-1 max-h-32 overflow-y-auto sidebar__scroll">
                      {uniqueCategories.map((cat) => (
                        <label
                          key={cat}
                          className="checkbox-label flex items-center gap-1.5 cursor-pointer text-text hover:text-accent transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterCategory.includes(cat)}
                            onChange={() => toggleFilter(cat, filterCategory, setFilterCategory)}
                            className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
                        {node.data?.act && `Акт ${node.data.act}`}
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
