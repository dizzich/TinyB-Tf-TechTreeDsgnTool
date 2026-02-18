import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Upload,
  Download,
  Layout,
  Undo,
  Redo,
  Settings,
  Plus,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Palette,
  Spline,
  Minus,
  CornerDownRight,
  Eye,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getLayoutedElements } from '../utils/autoLayout';
import { useFileSystem } from '../hooks/useFileSystem';
import { useNotionSyncActions } from '../hooks/useNotionSyncActions';
import { ProjectFile, EdgeType } from '../types';
import { COLOR_BY_OPTIONS } from './ColorMappingModal';

export const Toolbar = () => {
  const { undo, redo } = useStore.temporal.getState();
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const meta = useStore((state) => state.meta);
  const settings = useStore((state) => state.settings);
  const notionFieldColors = useStore((state) => state.notionFieldColors);

  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);
  const addNode = useStore((state) => state.addNode);
  const loadProject = useStore((state) => state.loadProject);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const updateSettings = useStore((state) => state.updateSettings);

  const notionConfig = useStore((state) => state.notionConfig);
  const syncInProgress = useStore((state) => state.syncInProgress);
  const syncProgress = useStore((state) => state.syncProgress);
  const notionSourceOfTruth = useStore((state) => state.notionSourceOfTruth);
  const notionDirty = useStore((state) => state.notionDirty);
  const dirtyNodeIds = useStore((state) => state.dirtyNodeIds);
  const lastSyncError = useStore((state) => state.lastSyncError);

  const { saveProject, openProject } = useFileSystem();
  const { doPush, doPull, canSync } = useNotionSyncActions();
  const [notionMenuOpen, setNotionMenuOpen] = useState(false);
  const notionMenuRef = useRef<HTMLDivElement>(null);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [edgeMenuOpen, setEdgeMenuOpen] = useState(false);
  const edgeMenuRef = useRef<HTMLDivElement>(null);
  const [canvasFilterOpen, setCanvasFilterOpen] = useState(false);
  const canvasFilterRef = useRef<HTMLDivElement>(null);

  const canvasFilter = useStore((state) => state.canvasFilter);
  const setCanvasFilter = useStore((state) => state.setCanvasFilter);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notionMenuRef.current && !notionMenuRef.current.contains(e.target as Node)) {
        setNotionMenuOpen(false);
      }
    };
    if (notionMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [notionMenuOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setColorMenuOpen(false);
      }
    };
    if (colorMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [colorMenuOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (edgeMenuRef.current && !edgeMenuRef.current.contains(e.target as Node)) {
        setEdgeMenuOpen(false);
      }
    };
    if (edgeMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [edgeMenuOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (canvasFilterRef.current && !canvasFilterRef.current.contains(e.target as Node)) {
        setCanvasFilterOpen(false);
      }
    };
    if (canvasFilterOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [canvasFilterOpen]);

  const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string; icon: typeof Spline }[] = [
    { value: 'default', label: 'Изогнутые', icon: Spline },
    { value: 'straight', label: 'Прямые', icon: Minus },
    { value: 'step', label: 'Прямоугольные', icon: CornerDownRight },
    { value: 'smoothstep', label: 'Сглаженные', icon: Spline },
  ];

  const currentEdgeType = settings.edgeType ?? 'default';
  const currentEdgeOption = EDGE_TYPE_OPTIONS.find((o) => o.value === currentEdgeType) ?? EDGE_TYPE_OPTIONS[0];

  // Unique values for canvas filter (same pattern as Sidebar)
  const uniqueActs = React.useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.act?.toString() || '').filter(Boolean))).sort(),
    [nodes]
  );
  const uniqueStages = React.useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.stage?.toString() || '').filter(Boolean))).sort(),
    [nodes]
  );
  const uniqueCategories = React.useMemo(
    () => Array.from(new Set(nodes.map((n) => n.data?.category || '').filter(Boolean))).sort(),
    [nodes]
  );

  const canvasFilterCount = canvasFilter.act.length + canvasFilter.stage.length + canvasFilter.category.length;

  const toggleCanvasFilterValue = (key: 'act' | 'stage' | 'category', value: string) => {
    const current = canvasFilter[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setCanvasFilter({ [key]: next });
  };

  const clearCanvasFilter = () => {
    setCanvasFilter({ act: [], stage: [], category: [] });
  };

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      settings.layoutDirection
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  };

  const handleSave = async () => {
    const projectData: ProjectFile = {
      version: '1.0',
      meta: { ...meta, updatedAt: new Date().toISOString() },
      settings,
      nodes,
      edges,
      notionFieldColors: Object.keys(notionFieldColors).length > 0 ? notionFieldColors : undefined,
    };
    await saveProject(projectData);
  };

  const handleOpen = async () => {
    const project = await openProject();
    if (project) {
      loadProject(project);
    }
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      position: { x: 250, y: 250 },
      data: {
        label: 'Новый узел',
        act: '',
        stage: '',
        category: '',
      },
      type: 'techNode',
      selected: true,
    };

    const updatedNodes = nodes.map((n) => ({ ...n, selected: false }));
    setNodes(updatedNodes);
    addNode(newNode);
  };

  const iconBtnClass =
    'icon-btn w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-accent hover:bg-control-hover-bg hover:text-accent hover:shadow-[0_0_10px_rgba(106,162,255,0.3)] active:translate-y-px transition-all duration-200';

  return (
    <div
      className="tool-rail absolute top-3 left-3 right-3 z-10 flex items-center justify-between rounded-[14px] border border-panel-border shadow-floating px-2 py-1.5 transition-all"
      style={{
        background: 'color-mix(in srgb, var(--panel) 75%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-1">
        <span className="font-bold text-text mr-3 text-sm tracking-tight">TechTree Studio</span>

        <button
          type="button"
          onClick={handleOpen}
          className={iconBtnClass}
          title="Открыть проект"
          aria-label="Открыть проект"
        >
          <FolderOpen size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={iconBtnClass}
          title="Сохранить проект"
          aria-label="Сохранить проект"
        >
          <Save size={18} strokeWidth={1.75} />
        </button>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        <button
          type="button"
          onClick={handleAddNode}
          className={iconBtnClass}
          title="Добавить узел"
          aria-label="Добавить узел"
        >
          <Plus size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setModalOpen('import', true)}
          className={iconBtnClass}
          title="Импорт CSV"
          aria-label="Импорт CSV"
        >
          <Upload size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setModalOpen('export', true)}
          className={iconBtnClass}
          title="Экспорт"
          aria-label="Экспорт"
        >
          <Download size={18} strokeWidth={1.75} />
        </button>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        <button
          type="button"
          onClick={handleAutoLayout}
          className={iconBtnClass}
          title="Авто-размещение"
          aria-label="Авто-размещение"
        >
          <Layout size={18} strokeWidth={1.75} />
        </button>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        {/* Edge Type Switcher */}
        <div className="relative" ref={edgeMenuRef}>
          <button
            type="button"
            onClick={() => setEdgeMenuOpen((o) => !o)}
            className={`${iconBtnClass} w-auto px-2 flex items-center gap-1.5`}
            title="Тип соединений"
            aria-label="Тип соединений"
          >
            <currentEdgeOption.icon size={18} strokeWidth={1.75} />
            <ChevronDown
              size={12}
              strokeWidth={1.75}
              className={`transition-transform ${edgeMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {edgeMenuOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-1 min-w-[220px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {EDGE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    updateSettings({ edgeType: opt.value });
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-control-hover-bg ${
                    currentEdgeType === opt.value ? 'text-accent bg-accent/10' : 'text-text'
                  }`}
                >
                  <opt.icon size={16} strokeWidth={1.75} />
                  {opt.label}
                </button>
              ))}
              <div className="my-1 border-t border-panel-border" />
              <div className="px-3 py-2 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted">Толщина</label>
                    <span className="text-xs text-text font-medium">{settings.edgeStrokeWidth ?? 2}px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.5}
                    value={settings.edgeStrokeWidth ?? 2}
                    onChange={(e) => updateSettings({ edgeStrokeWidth: parseFloat(e.target.value) })}
                    className="w-full h-1.5 accent-[var(--accent)] bg-control-bg rounded-full cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text hover:text-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.edgeAnimated ?? false}
                    onChange={(e) => updateSettings({ edgeAnimated: e.target.checked })}
                    className="w-3.5 h-3.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  Анимация (бегущие точки)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Filter */}
        <div className="relative" ref={canvasFilterRef}>
          <button
            type="button"
            onClick={() => setCanvasFilterOpen((o) => !o)}
            className={`${iconBtnClass} w-auto px-2 flex items-center gap-1.5 ${
              canvasFilterCount > 0 ? 'text-accent border-accent/50 shadow-[0_0_5px_rgba(106,162,255,0.2)]' : ''
            }`}
            title="Фильтр полотна"
            aria-label="Фильтр полотна"
          >
            <Eye size={18} strokeWidth={1.75} />
            {canvasFilterCount > 0 && (
              <span className="bg-accent text-[#0f141c] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-[0_0_10px_rgba(106,162,255,0.4)]">
                {canvasFilterCount}
              </span>
            )}
          </button>
          {canvasFilterOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-3 px-3 min-w-[240px] max-w-[300px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text">Фильтр полотна</span>
                {canvasFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearCanvasFilter}
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {uniqueActs.length > 0 && (
                <div className="mb-2">
                  <label className="text-xs font-medium text-muted block mb-1">Акт</label>
                  <div className="flex flex-wrap gap-1">
                    {uniqueActs.map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleCanvasFilterValue('act', act)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                          canvasFilter.act.includes(act)
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'border-control-border-muted text-muted hover:border-accent/50 hover:text-text'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {uniqueStages.length > 0 && (
                <div className="mb-2">
                  <label className="text-xs font-medium text-muted block mb-1">Стадия</label>
                  <div className="flex flex-wrap gap-1">
                    {uniqueStages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => toggleCanvasFilterValue('stage', stage)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                          canvasFilter.stage.includes(stage)
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'border-control-border-muted text-muted hover:border-accent/50 hover:text-text'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {uniqueCategories.length > 0 && (
                <div className="mb-2">
                  <label className="text-xs font-medium text-muted block mb-1">Категория</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {uniqueCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCanvasFilterValue('category', cat)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                          canvasFilter.category.includes(cat)
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'border-control-border-muted text-muted hover:border-accent/50 hover:text-text'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nodes.length === 0 && (
                <p className="text-xs text-muted py-2">Нет узлов для фильтрации</p>
              )}

              <div className="mt-3 pt-2 border-t border-panel-border">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text hover:text-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={canvasFilter.hideMode === 'hide'}
                    onChange={(e) =>
                      setCanvasFilter({ hideMode: e.target.checked ? 'hide' : 'dim' })
                    }
                    className="w-3.5 h-3.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  Скрывать ноды (вместо затемнения)
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        <div
          className="relative flex items-center min-w-[7.5rem] rounded-control has-[*:hover]:shadow-[0_0_10px_rgba(106,162,255,0.3)] has-[*:hover]:[&>button]:border-accent has-[*:hover]:[&>button]:bg-control-hover-bg has-[*:hover]:[&>button]:text-accent"
          ref={notionMenuRef}
        >
          <button
            type="button"
            onClick={() => setModalOpen('notionSync', true)}
            className={`${iconBtnClass} w-auto min-w-[6.5rem] px-2 flex items-center gap-1.5 rounded-r-none -mr-px ${
              notionConfig ? 'text-accent border-accent/50 shadow-[0_0_5px_rgba(106,162,255,0.2)]' : ''
            } ${canSync ? '' : 'rounded-r-control'}`}
            title={
              syncInProgress
                ? syncProgress
                  ? `Синхронизация ${syncProgress.current}/${syncProgress.total}`
                  : 'Синхронизация...'
                : lastSyncError
                  ? 'Ошибка синхронизации'
                  : notionDirty && dirtyNodeIds.size > 0
                    ? `${dirtyNodeIds.size} несохранённых изменений`
                    : 'Notion Sync'
            }
            aria-label="Notion Sync"
          >
            {syncInProgress ? (
              <RefreshCw size={18} strokeWidth={1.75} className="animate-spin" />
            ) : lastSyncError ? (
              <AlertCircle size={18} strokeWidth={1.75} className="text-amber-400" />
            ) : (
              <RefreshCw size={18} strokeWidth={1.75} />
            )}
            {notionConfig && (
              <span
                className={`text-xs font-bold leading-none ${
                  syncInProgress ? 'text-muted' : lastSyncError ? 'text-amber-400' : notionDirty && dirtyNodeIds.size > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {syncInProgress
                  ? syncProgress
                    ? `${syncProgress.current}/${syncProgress.total}`
                    : '...'
                  : lastSyncError
                    ? '!'
                    : notionDirty && dirtyNodeIds.size > 0
                      ? String(dirtyNodeIds.size)
                      : '\u2713'}
              </span>
            )}
          </button>
          {canSync && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotionMenuOpen((o) => !o);
                }}
                className="icon-btn w-6 h-9 flex items-center justify-center rounded-r-control rounded-l-none border border-control-border-muted text-muted hover:text-accent hover:border-accent/50 transition-all"
                title="Быстрые действия синхронизации"
                aria-label="Меню синхронизации"
              >
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  className={`transition-transform ${notionMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {notionMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-1 py-1 min-w-[180px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      doPush();
                      setNotionMenuOpen(false);
                    }}
                    disabled={syncInProgress || nodes.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-control-hover-bg disabled:opacity-50"
                  >
                    <Upload size={16} strokeWidth={1.75} />
                    Push (Редактор → Notion)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      doPull();
                      setNotionMenuOpen(false);
                    }}
                    disabled={syncInProgress}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-control-hover-bg disabled:opacity-50"
                  >
                    <Download size={16} strokeWidth={1.75} />
                    Pull (Notion → Редактор)
                  </button>
                  <div className="my-1 border-t border-panel-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setModalOpen('notionSync', true);
                      setNotionMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-control-hover-bg"
                  >
                    <Settings size={16} strokeWidth={1.75} />
                    Notion Sync настройки...
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => undo()}
          className={iconBtnClass}
          title="Отменить"
          aria-label="Отменить"
        >
          <Undo size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => redo()}
          className={iconBtnClass}
          title="Повторить"
          aria-label="Повторить"
        >
          <Redo size={18} strokeWidth={1.75} />
        </button>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        <div className="relative flex items-center min-w-[6rem]" ref={colorMenuRef}>
          <button
            type="button"
            onClick={() => setModalOpen('colorMapping', true)}
            className={`${iconBtnClass} w-auto min-w-[5rem] px-2 flex items-center gap-1.5 rounded-r-none -mr-px`}
            title="Настройки цветов"
            aria-label="Настройки цветов"
          >
            <Palette size={18} strokeWidth={1.75} />
            <span className="text-xs font-medium truncate max-w-[4rem]">
              {COLOR_BY_OPTIONS.find((o) => o.value === (settings.nodeColorBy ?? 'category'))?.label ?? 'Цвета'}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setColorMenuOpen((o) => !o);
            }}
            className="icon-btn w-6 h-9 flex items-center justify-center rounded-r-control rounded-l-none border border-control-border-muted text-muted hover:text-accent hover:border-accent/50 transition-all"
            title="Быстрый выбор атрибута"
            aria-label="Меню цветов"
          >
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className={`transition-transform ${colorMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {colorMenuOpen && (
            <div
              className="absolute top-full right-0 mt-1 py-1 min-w-[200px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              role="menu"
            >
              {COLOR_BY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    updateSettings({ nodeColorBy: opt.value });
                    setColorMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-control-hover-bg ${
                    (settings.nodeColorBy ?? 'category') === opt.value ? 'text-accent bg-accent/10' : 'text-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="my-1 border-t border-panel-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setModalOpen('colorMapping', true);
                  setColorMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-control-hover-bg"
              >
                <Settings size={16} strokeWidth={1.75} />
                Настройки цветов...
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen('settings', true)}
          className={iconBtnClass}
          title="Настройки"
          aria-label="Настройки"
        >
          <Settings size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};
