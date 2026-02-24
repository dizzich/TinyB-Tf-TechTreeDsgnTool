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
  Pause,
  Palette,
  Spline,
  Minus,
  CornerDownRight,
  Eye,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowLeftRight,
  ArrowUpDown,
  PenTool,
  Grid3X3,
  FileJson,
  Link,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getLayoutedElements, layoutSubgraph } from '../utils/autoLayout';
import type { LayoutDirection } from '../utils/autoLayout';
import {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterHorizontal,
  alignCenterVertical,
  distributeHorizontally,
  distributeVertically,
  stackHorizontally,
  stackVertically,
} from '../utils/layoutHelpers';
import { useFileSystem } from '../hooks/useFileSystem';
import { useNotionSyncActions } from '../hooks/useNotionSyncActions';
import { ProjectFile, EdgeType, TechNode } from '../types';
import { COLOR_BY_OPTIONS } from './ColorMappingModal';
import { FilterBuilder } from './FilterBuilder';
import { buildUniqueValuesMap } from '../utils/filterUtils';
import { NotionIcon } from './NotionIcon';

export const Toolbar = () => {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const meta = useStore((state) => state.meta);
  const settings = useStore((state) => state.settings);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const deletedNotionTombstones = useStore((state) => state.deletedNotionTombstones);

  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);
  const addNode = useStore((state) => state.addNode);
  const loadProject = useStore((state) => state.loadProject);
  const setCurrentFileName = useStore((state) => state.setCurrentFileName);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const currentFileName = useStore((state) => state.currentFileName);
  const notionConnected = useStore((state) => state.notionConnected);
  const updateSettings = useStore((state) => state.updateSettings);
  const _pushSnapshot = useStore((state) => state._pushSnapshot);
  const canUndo = useStore((state) => state._history.past.length > 0);
  const canRedo = useStore((state) => state._history.future.length > 0);

  const notionConfig = useStore((state) => state.notionConfig);
  const syncInProgress = useStore((state) => state.syncInProgress);
  const syncProgress = useStore((state) => state.syncProgress);
  const syncMode = useStore((state) => state.syncMode);
  const notionDirty = useStore((state) => state.notionDirty);
  const dirtyNodeIds = useStore((state) => state.dirtyNodeIds);
  const lastSyncError = useStore((state) => state.lastSyncError);
  const offlineDirty = useStore((state) => state.offlineDirty);
  const setOfflineDirty = useStore((state) => state.setOfflineDirty);
  const setUnsavedChangesResolve = useStore((state) => state.setUnsavedChangesResolve);
  const setNotionConfig = useStore((state) => state.setNotionConfig);
  const setNotionConnected = useStore((state) => state.setNotionConnected);
  const setAllowBackgroundSync = useStore((state) => state.setAllowBackgroundSync);
  const setSyncMode = useStore((state) => state.setSyncMode);
  const setForceShowStartupModal = useStore((state) => state.setForceShowStartupModal);
  const setSaveConfirmResolve = useStore((state) => state.setSaveConfirmResolve);
  const deletedTombstoneCount = Object.keys(deletedNotionTombstones).length;

  const { saveProject, openProject, hasHandle } = useFileSystem();
  const { doPush, doPull, canSync } = useNotionSyncActions();
  const [notionMenuOpen, setNotionMenuOpen] = useState(false);
  const notionMenuRef = useRef<HTMLDivElement>(null);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [edgeMenuOpen, setEdgeMenuOpen] = useState(false);
  const edgeMenuRef = useRef<HTMLDivElement>(null);
  const [canvasFilterOpen, setCanvasFilterOpen] = useState(false);
  const canvasFilterRef = useRef<HTMLDivElement>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const [snapMenuOpen, setSnapMenuOpen] = useState(false);
  const snapMenuRef = useRef<HTMLDivElement>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const canvasFilter = useStore((state) => state.canvasFilter);
  const setCanvasFilter = useStore((state) => state.setCanvasFilter);
  const connectorTraversalHighlightEnabled = useStore((state) => state.connectorTraversalHighlightEnabled);
  const setConnectorTraversalHighlightEnabled = useStore((state) => state.setConnectorTraversalHighlightEnabled);

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

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setLayoutMenuOpen(false);
      }
    };
    if (layoutMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [layoutMenuOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (snapMenuRef.current && !snapMenuRef.current.contains(e.target as Node)) {
        setSnapMenuOpen(false);
      }
    };
    if (snapMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [snapMenuOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    if (projectMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [projectMenuOpen]);

  const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string; icon: typeof Spline }[] = [
    { value: 'default', label: 'Изогнутые', icon: Spline },
    { value: 'straight', label: 'Прямые', icon: Minus },
    { value: 'step', label: 'Прямоугольные', icon: CornerDownRight },
    { value: 'smoothstep', label: 'Сглаженные', icon: Spline },
  ];

  const currentEdgeType = settings.edgeType ?? 'default';
  const currentEdgeOption = EDGE_TYPE_OPTIONS.find((o) => o.value === currentEdgeType) ?? EDGE_TYPE_OPTIONS[0];

  const uniqueValues = React.useMemo(() => buildUniqueValuesMap(nodes), [nodes]);

  const canvasFilterCount = canvasFilter.rules?.length ?? 0;

  const handleCanvasFilterRulesChange = (rules: import('../types').FilterRule[]) => {
    setCanvasFilter({ rules });
  };

  const selectedIds = React.useMemo(
    () => new Set(nodes.filter((n) => n.selected).map((n) => n.id)),
    [nodes]
  );
  const hasSelection = selectedIds.size > 0;

  const handleAutoLayoutFull = (direction: LayoutDirection) => {
    setLayoutMenuOpen(false);
    _pushSnapshot();
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  };

  const handleLayoutSubgraph = (direction: LayoutDirection) => {
    if (!hasSelection) return;
    setLayoutMenuOpen(false);
    _pushSnapshot();
    setNodes(layoutSubgraph(nodes, edges, selectedIds, direction));
  };

  const runLayoutAction = (fn: () => TechNode[]) => {
    if (!hasSelection) return;
    setLayoutMenuOpen(false);
    _pushSnapshot();
    setNodes(fn());
  };

  const menuItemClass = (disabled?: boolean) =>
    `w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-control-hover-bg ${disabled ? 'opacity-50 pointer-events-none' : 'text-text'}`;

  const handleSave = async () => {
    const projectData: ProjectFile = {
      version: '1.0',
      meta: { ...meta, updatedAt: new Date().toISOString() },
      settings,
      nodes,
      edges,
      notionFieldColors: Object.keys(notionFieldColors).length > 0 ? notionFieldColors : undefined,
      deletedNotionTombstones:
        Object.keys(deletedNotionTombstones).length > 0 ? deletedNotionTombstones : undefined,
    };

    const doSave = async (forceNew: boolean) => {
      try {
        const result = await saveProject(projectData, forceNew);
        if (result?.fileName) {
          setCurrentFileName(result.fileName);
        }
        setOfflineDirty(false);
      } catch (e) {
        // user cancelled or error
      }
    };

    if (hasHandle) {
      setSaveConfirmResolve((saveAsNew) => {
        if (saveAsNew !== null) {
          doSave(saveAsNew);
        }
      });
      setModalOpen('saveConfirm', true);
    } else {
      doSave(false);
    }
  };

  const doOpenProject = async () => {
    const result = await openProject();
    if (result) {
      loadProject(result.project);
      setCurrentFileName(result.fileName);
    }
  };

  const doOpenNewProject = () => {
    setNotionConfig(null);
    setNotionConnected(false);
    setAllowBackgroundSync(false);
    setSyncMode('pause');
    loadProject({ nodes: [], edges: [] });
    setCurrentFileName(null);
    setForceShowStartupModal(true);
  };

  const handleOpen = async () => {
    setProjectMenuOpen(false);
    const hasUnsaved =
      offlineDirty ||
      (notionConnected && (notionDirty || dirtyNodeIds.size > 0 || deletedTombstoneCount > 0));
    if (hasUnsaved) {
      if (sessionStorage.getItem('techtree_suppress_unsaved_prompt') === 'true') {
        await doOpenProject();
      } else {
        setUnsavedChangesResolve((proceed, suppress) => {
          if (proceed) {
            if (suppress) sessionStorage.setItem('techtree_suppress_unsaved_prompt', 'true');
            doOpenProject();
          }
        });
        setModalOpen('unsavedChanges', true);
      }
    } else {
      await doOpenProject();
    }
  };

  const handleOpenNewProject = () => {
    setProjectMenuOpen(false);
    const hasUnsaved =
      offlineDirty ||
      (notionConnected && (notionDirty || dirtyNodeIds.size > 0 || deletedTombstoneCount > 0));
    if (hasUnsaved) {
      if (sessionStorage.getItem('techtree_suppress_unsaved_prompt') === 'true') {
        doOpenNewProject();
      } else {
        setUnsavedChangesResolve((proceed, suppress) => {
          if (proceed) {
            if (suppress) sessionStorage.setItem('techtree_suppress_unsaved_prompt', 'true');
            doOpenNewProject();
          }
        });
        setModalOpen('unsavedChanges', true);
      }
    } else {
      doOpenNewProject();
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
        <div className="relative mr-3" ref={projectMenuRef}>
          <button
            type="button"
            onClick={() => setProjectMenuOpen((o) => !o)}
            className="font-bold text-text text-sm tracking-tight flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-[280px] cursor-pointer hover:text-accent transition-colors rounded-control px-1 py-0.5 -ml-1"
            title={
              notionConfig && notionConnected && notionConfig.databaseTitle
                ? notionConfig.databaseTitle
                : currentFileName || meta.name || 'Без названия'
            }
          >
            {notionConfig && notionConnected && notionConfig.databaseTitle ? (
              <>
                <NotionIcon size={16} className="shrink-0" color="currentColor" docFill="transparent" />
                <span className="truncate">{notionConfig.databaseTitle}</span>
                <ChevronDown
                  size={12}
                  strokeWidth={1.75}
                  className={`shrink-0 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`}
                />
              </>
            ) : (
              <>
                <FileJson size={16} className="shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate">{currentFileName || meta.name || 'Без названия'}</span>
                <ChevronDown
                  size={12}
                  strokeWidth={1.75}
                  className={`shrink-0 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
          {projectMenuOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-1 min-w-[180px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenNewProject}
                className={menuItemClass()}
              >
                <FolderOpen size={16} strokeWidth={1.75} />
                Открыть проект
              </button>
            </div>
          )}
        </div>

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

        {/* Layout dropdown */}
        <div className="relative" ref={layoutMenuRef}>
          <button
            type="button"
            onClick={() => setLayoutMenuOpen((o) => !o)}
            className={`${iconBtnClass} w-auto px-2 flex items-center gap-1.5`}
            title="Лейаут / размещение"
            aria-label="Лейаут"
          >
            <Layout size={18} strokeWidth={1.75} />
            <ChevronDown
              size={12}
              strokeWidth={1.75}
              className={`transition-transform ${layoutMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {layoutMenuOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-1 min-w-[240px] rounded-control border border-panel-border bg-panel shadow-floating z-50 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-muted">Авто-размещение (весь граф)</div>
              {(['LR', 'RL', 'TB', 'BT'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  role="menuitem"
                  onClick={() => handleAutoLayoutFull(dir)}
                  className={menuItemClass()}
                >
                  <Layout size={16} strokeWidth={1.75} />
                  {dir === 'LR' && 'Дерево слева направо (LR)'}
                  {dir === 'RL' && 'Дерево справа налево (RL)'}
                  {dir === 'TB' && 'Дерево сверху вниз (TB)'}
                  {dir === 'BT' && 'Дерево снизу вверх (BT)'}
                </button>
              ))}
              <div className="my-1 border-t border-panel-border" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted">Авто-размещение (выделенные)</div>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleLayoutSubgraph('LR')}
                disabled={!hasSelection}
                className={menuItemClass(!hasSelection)}
              >
                <Layout size={16} strokeWidth={1.75} />
                Дерево LR по выделенным
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleLayoutSubgraph('TB')}
                disabled={!hasSelection}
                className={menuItemClass(!hasSelection)}
              >
                <Layout size={16} strokeWidth={1.75} />
                Дерево TB по выделенным
              </button>
              <div className="my-1 border-t border-panel-border" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted">Выравнивание</div>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignLeft(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignLeft size={16} strokeWidth={1.75} />
                По левому краю
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignRight(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignRight size={16} strokeWidth={1.75} />
                По правому краю
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignTop(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignStartVertical size={16} strokeWidth={1.75} />
                По верхнему краю
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignBottom(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignEndVertical size={16} strokeWidth={1.75} />
                По нижнему краю
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignCenterHorizontal(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignCenterHorizontal size={16} strokeWidth={1.75} />
                По центру (гориз.)
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => alignCenterVertical(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <AlignCenterVertical size={16} strokeWidth={1.75} />
                По центру (верт.)
              </button>
              <div className="my-1 border-t border-panel-border" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted">Распределение</div>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => distributeHorizontally(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <ArrowLeftRight size={16} strokeWidth={1.75} />
                По горизонтали
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => distributeVertically(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <ArrowUpDown size={16} strokeWidth={1.75} />
                По вертикали
              </button>
              <div className="my-1 border-t border-panel-border" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted">Упорядочить</div>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => stackHorizontally(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <ArrowLeftRight size={16} strokeWidth={1.75} />
                В ряд по горизонтали
              </button>
              <button type="button" role="menuitem" onClick={() => runLayoutAction(() => stackVertically(nodes, selectedIds))} disabled={!hasSelection} className={menuItemClass(!hasSelection)}>
                <ArrowUpDown size={16} strokeWidth={1.75} />
                В ряд по вертикали
              </button>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        {/* Snap: toggle + dropdown */}
        <div className="relative flex items-center" ref={snapMenuRef}>
          <button
            type="button"
            onClick={() => updateSettings({ snapEnabled: !(settings.snapEnabled ?? true) })}
            className={`${iconBtnClass} w-9 flex items-center justify-center rounded-r-none -mr-px ${(settings.snapEnabled ?? true)
                ? '!text-accent !border-accent bg-accent/15 shadow-[0_0_8px_rgba(106,162,255,0.4)] ring-1 ring-accent/40'
                : ''
              }`}
            title={(settings.snapEnabled ?? true) ? 'Выкл привязку' : 'Вкл привязку'}
            aria-label="Привязка"
            aria-pressed={settings.snapEnabled ?? true}
          >
            <Grid3X3 size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSnapMenuOpen((o) => !o);
            }}
            className="icon-btn w-6 h-9 flex items-center justify-center rounded-r-control rounded-l-none border border-control-border-muted text-muted hover:text-accent hover:border-accent/50 transition-all"
            title="Настройки привязки"
            aria-label="Меню привязки"
          >
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className={`transition-transform ${snapMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {snapMenuOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-1 min-w-[220px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 flex items-center gap-2">
                <label className="text-xs font-semibold text-muted shrink-0">Шаг сетки (px)</label>
                <input
                  type="number"
                  min={0}
                  max={64}
                  step={1}
                  value={settings.snapGridSize ?? 10}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v >= 0) updateSettings({ snapGridSize: v });
                  }}
                  className="w-16 px-2 py-1 text-sm rounded-control border border-control-border bg-control-bg text-text focus:border-accent focus:outline-none"
                />
                <span className="text-xs text-muted">0 = выкл</span>
              </div>
              <div className="my-1 border-t border-panel-border" />
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-text hover:bg-control-hover-bg">
                <input
                  type="checkbox"
                  checked={settings.snapToObjects ?? false}
                  onChange={(e) => updateSettings({ snapToObjects: e.target.checked })}
                  className="w-3.5 h-3.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                />
                Привязка к соседним объектам
              </label>
              <p className="text-[10px] text-muted px-3 pb-1 leading-tight">
                Выравнивание по краям и центрам рядом расположенных узлов.
              </p>
              <p className="text-[10px] text-muted px-3 pb-2 leading-tight">
                Shift + перетаскивание — фиксация по оси соседней ноды.
              </p>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        {/* Edge Type Switcher */}
        <div className="relative" ref={edgeMenuRef}>
          <button
            type="button"
            onClick={() => setEdgeMenuOpen((o) => !o)}
            className={`${iconBtnClass} w-auto px-2 flex items-center gap-1.5 ${settings.manualEdgeMode ? 'text-accent border-accent/50 shadow-[0_0_5px_rgba(106,162,255,0.2)]' : ''
              }`}
            title={settings.manualEdgeMode ? 'Ручные линии (вейпоинты)' : 'Тип соединений'}
            aria-label="Тип соединений"
          >
            {settings.manualEdgeMode ? (
              <PenTool size={18} strokeWidth={1.75} />
            ) : (
              <currentEdgeOption.icon size={18} strokeWidth={1.75} />
            )}
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-control-hover-bg ${currentEdgeType === opt.value ? 'text-accent bg-accent/10' : 'text-text'
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
              <div className="my-1 border-t border-panel-border" />
              <div className="px-3 py-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text hover:text-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.highlightConnectedSubgraph ?? true}
                    onChange={(e) => updateSettings({ highlightConnectedSubgraph: e.target.checked })}
                    className="w-3.5 h-3.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  Подсветка связанных при клике
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text hover:text-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.manualEdgeMode ?? false}
                    onChange={(e) => updateSettings({ manualEdgeMode: e.target.checked })}
                    className="w-3.5 h-3.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <PenTool size={14} strokeWidth={1.75} />
                  Ручные линии (вейпоинты)
                </label>
                <p className="text-[10px] text-muted mt-1 leading-tight">
                  Кликайте на линию, чтобы добавить точки изгиба. Перетаскивайте для настройки. Двойной клик — удалить точку.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setConnectorTraversalHighlightEnabled(!connectorTraversalHighlightEnabled)
          }
          className={`${iconBtnClass} ${connectorTraversalHighlightEnabled
            ? '!text-accent !border-accent bg-accent/15 shadow-[0_0_8px_rgba(106,162,255,0.4)] ring-1 ring-accent/40'
            : ''
            }`}
          title={
            connectorTraversalHighlightEnabled
              ? 'Рекурсивная подсветка цепочек от коннектора: вкл'
              : 'Рекурсивная подсветка цепочек от коннектора: выкл'
          }
          aria-label="Режим подсветки цепочек от коннекторов"
          aria-pressed={connectorTraversalHighlightEnabled}
        >
          <Link size={18} strokeWidth={1.75} />
        </button>

        {/* Canvas Filter */}
        <div className="relative" ref={canvasFilterRef}>
          <button
            type="button"
            onClick={() => setCanvasFilterOpen((o) => !o)}
            className={`${iconBtnClass} w-auto px-2 flex items-center gap-1.5 ${canvasFilterCount > 0 ? 'text-accent border-accent/50 shadow-[0_0_5px_rgba(106,162,255,0.2)]' : ''
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
              className="absolute top-full left-0 mt-1 py-3 px-3 min-w-[260px] max-w-[320px] rounded-control border border-panel-border bg-panel shadow-floating z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-semibold text-text block mb-3">Фильтр полотна</span>
              <FilterBuilder
                rules={canvasFilter.rules ?? []}
                onRulesChange={handleCanvasFilterRulesChange}
                uniqueValues={uniqueValues}
                compact
              />
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-control-hover-bg ${(settings.nodeColorBy ?? 'category') === opt.value ? 'text-accent bg-accent/10' : 'text-text'
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
      </div>

      <div className="flex items-center gap-1">
        <div
          className="relative flex items-center min-w-[7.5rem] rounded-control has-[*:hover]:shadow-[0_0_10px_rgba(106,162,255,0.3)] has-[*:hover]:[&>button]:border-accent has-[*:hover]:[&>button]:bg-control-hover-bg has-[*:hover]:[&>button]:text-accent"
          ref={notionMenuRef}
        >
          <button
            type="button"
            onClick={() => setModalOpen('notionSync', true)}
            className={`${iconBtnClass} w-auto min-w-[6.5rem] px-2 flex items-center gap-1.5 rounded-r-none -mr-px ${notionConfig ? 'text-accent border-accent/50 shadow-[0_0_5px_rgba(106,162,255,0.2)]' : ''
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
                    : `Notion Sync (режим: ${syncMode === 'push' ? 'Граф→Notion' : syncMode === 'pull' ? 'Notion→Граф' : syncMode === 'bidirectional' ? 'Двусторонне' : 'Пауза'})`
            }
            aria-label="Notion Sync"
          >
            {syncInProgress ? (
              <RefreshCw size={18} strokeWidth={1.75} className="animate-spin" />
            ) : lastSyncError ? (
              <AlertCircle size={18} strokeWidth={1.75} className="text-amber-400" />
            ) : syncMode === 'push' ? (
              <Upload size={18} strokeWidth={1.75} />
            ) : syncMode === 'pull' ? (
              <Download size={18} strokeWidth={1.75} />
            ) : syncMode === 'pause' ? (
              <Pause size={18} strokeWidth={1.75} />
            ) : (
              <RefreshCw size={18} strokeWidth={1.75} />
            )}
            {notionConfig && (
              <span
                className={`text-xs font-bold leading-none ${syncInProgress ? 'text-muted' : lastSyncError ? 'text-amber-400' : notionDirty && dirtyNodeIds.size > 0 ? 'text-amber-400' : 'text-emerald-400'
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

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />

        <button
          type="button"
          onClick={() => useStore.getState().undo()}
          disabled={!canUndo}
          className={`${iconBtnClass} disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed`}
          title="Отменить"
          aria-label="Отменить"
        >
          <Undo size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => useStore.getState().redo()}
          disabled={!canRedo}
          className={`${iconBtnClass} disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed`}
          title="Повторить"
          aria-label="Повторить"
        >
          <Redo size={18} strokeWidth={1.75} />
        </button>

        <div className="h-5 w-px bg-panel-border mx-1" aria-hidden />
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
