import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export const Sidebar = () => {
  const nodes = useStore((state) => state.nodes);
  const setNodes = useStore((state) => state.setNodes);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'act' | 'stage' | 'order'>('order');
  const [filterAct, setFilterAct] = useState<string[]>([]);
  const [filterStage, setFilterStage] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);

  const reactFlowInstance = useReactFlow();

  // Get unique values for filters
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

  // Filter and sort nodes
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

    // Sort
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
      return 0; // order - keep original
    });

    return result;
  }, [nodes, searchTerm, filterAct, filterStage, filterCategory, sortBy]);

  const handleNodeClick = (nodeId: string) => {
    // Select the node
    const updatedNodes = nodes.map((n) => ({
      ...n,
      selected: n.id === nodeId,
    }));
    setNodes(updatedNodes);

    // Focus on the node
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

  if (nodes.length === 0) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-700 mb-2">Узлы</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400 text-sm">
            <p>Узлов пока нет.</p>
            <p className="mt-1">Импортируйте CSV для начала.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-gray-700 mb-2">
          Узлы ({filteredNodes.length}/{nodes.length})
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск узлов..."
            className="w-full pl-9 pr-2 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-xs text-gray-600 hover:text-blue-600"
          >
            <Filter size={12} className="mr-1" />
            Фильтр
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="order">Порядок</option>
            <option value="name">Имя</option>
            <option value="act">Акт</option>
            <option value="stage">Стадия</option>
          </select>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 border rounded text-xs space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Фильтры</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-blue-600 hover:underline">
                  Очистить
                </button>
              )}
            </div>

            {uniqueActs.length > 0 && (
              <div>
                <label className="font-medium block mb-1">Акт</label>
                <div className="space-y-1">
                  {uniqueActs.map((act) => (
                    <label key={act} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterAct.includes(act)}
                        onChange={() => toggleFilter(act, filterAct, setFilterAct)}
                        className="mr-1"
                      />
                      <span>Акт {act}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {uniqueStages.length > 0 && (
              <div>
                <label className="font-medium block mb-1">Стадия</label>
                <div className="space-y-1">
                  {uniqueStages.map((stage) => (
                    <label key={stage} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterStage.includes(stage)}
                        onChange={() => toggleFilter(stage, filterStage, setFilterStage)}
                        className="mr-1"
                      />
                      <span>Стадия {stage}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {uniqueCategories.length > 0 && (
              <div>
                <label className="font-medium block mb-1">Категория</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {uniqueCategories.map((cat) => (
                    <label key={cat} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterCategory.includes(cat)}
                        onChange={() => toggleFilter(cat, filterCategory, setFilterCategory)}
                        className="mr-1"
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredNodes.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">Нет узлов, соответствующих фильтрам</div>
        ) : (
          <ul className="space-y-1">
            {filteredNodes.map((node) => (
              <li
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={`p-2 bg-white border rounded text-sm hover:bg-blue-50 cursor-pointer ${
                  node.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="truncate font-medium">{node.data?.label || node.id}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {node.data?.act && `Акт ${node.data.act}`}
                  {node.data?.stage && ` | Стадия ${node.data.stage}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
