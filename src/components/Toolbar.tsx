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
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getLayoutedElements } from '../utils/autoLayout';
import { useFileSystem } from '../hooks/useFileSystem';
import { useNotionSyncActions } from '../hooks/useNotionSyncActions';
import { ProjectFile } from '../types';

export const Toolbar = () => {
  const { undo, redo } = useStore.temporal.getState();
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const meta = useStore((state) => state.meta);
  const settings = useStore((state) => state.settings);

  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);
  const addNode = useStore((state) => state.addNode);
  const loadProject = useStore((state) => state.loadProject);
  const setModalOpen = useStore((state) => state.setModalOpen);

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

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notionMenuRef.current && !notionMenuRef.current.contains(e.target as Node)) {
        setNotionMenuOpen(false);
      }
    };
    if (notionMenuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [notionMenuOpen]);

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

        <div className="relative flex items-center min-w-[7.5rem]" ref={notionMenuRef}>
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
