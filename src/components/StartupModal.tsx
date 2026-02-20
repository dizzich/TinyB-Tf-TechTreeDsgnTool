import React, { useState, useEffect } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { NotionIcon } from './NotionIcon';
import { useFileSystem } from '../hooks/useFileSystem';
import { useStore } from '../store/useStore';
import { pullFromNotion, pullFromNotionIncremental, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';

const STORAGE_KEY = 'techtree_hide_startup';

const modalOverlay = 'fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]';
const modalDialog =
  'bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-2xl p-8 flex flex-col';
const cardClass =
  'border-2 border-panel-border rounded-panel p-6 bg-panel-2 hover:border-accent transition-all';
const btnPrimary =
  'w-full px-4 py-3 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors';
const btnSecondary =
  'w-full px-4 py-3 bg-control-bg border border-control-border rounded-control text-text font-medium hover:bg-control-hover-bg hover:border-control-hover-border disabled:opacity-50 transition-colors';

export const StartupModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nodes = useStore((state) => state.nodes);
  const loadProject = useStore((state) => state.loadProject);
  const setCurrentFileName = useStore((state) => state.setCurrentFileName);
  const notionConfig = useStore((state) => state.notionConfig);
  const replaceNodesAndEdgesForSync = useStore((state) => state.replaceNodesAndEdgesForSync);
  const setNotionConnected = useStore((state) => state.setNotionConnected);
  const setSyncMode = useStore((state) => state.setSyncMode);
  const setAllowBackgroundSync = useStore((state) => state.setAllowBackgroundSync);
  const setLastSyncTime = useStore((state) => state.setLastSyncTime);
  const settings = useStore((state) => state.settings);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const { openProject } = useFileSystem();

  useEffect(() => {
    const hideStartup = localStorage.getItem(STORAGE_KEY) === 'true';
    if (nodes.length === 0 && !hideStartup) {
      setIsVisible(true);
    }
  }, [nodes.length]);

  const handleOfflineMode = async () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    const result = await openProject();
    if (result) {
      loadProject(result.project);
      setCurrentFileName(result.fileName);
    }
    setIsVisible(false);
  };

  const handleStartBlank = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setCurrentFileName(null);
    setIsVisible(false);
  };

  const lastSyncTime = useStore((state) => state.lastSyncTime);

  const handleOnlineMode = async () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }

    if (notionConfig) {
      setLoading(true);
      setError('');
      try {
        // Incremental pull if we have a previous sync time; full pull on first connect
        let pulledNodes, pulledEdges, notionFieldColors, replaceColors;
        if (lastSyncTime) {
          const result = await pullFromNotionIncremental(
            notionConfig,
            lastSyncTime,
            [],  // no local nodes yet (fresh open)
            [],
            NOTION_BUILTIN_PROXY
          );
          pulledNodes = result.nodes;
          pulledEdges = result.edges;
          notionFieldColors = result.notionFieldColors;
          replaceColors = false;
          // If incremental returned very few nodes (e.g. after partial push + reload), recover with full pull
          if (pulledNodes.length <= 1) {
            const fullResult = await pullFromNotion(notionConfig, NOTION_BUILTIN_PROXY);
            pulledNodes = fullResult.nodes;
            pulledEdges = fullResult.edges;
            notionFieldColors = fullResult.notionFieldColors;
            replaceColors = true;
          }
        } else {
          const result = await pullFromNotion(notionConfig, NOTION_BUILTIN_PROXY);
          pulledNodes = result.nodes;
          pulledEdges = result.edges;
          notionFieldColors = result.notionFieldColors;
          replaceColors = true;
        }

        const hasPositions = pulledNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
        const toSet = hasPositions
          ? { nodes: pulledNodes, edges: pulledEdges }
          : getLayoutedElements(pulledNodes, pulledEdges, settings.layoutDirection);
        replaceNodesAndEdgesForSync(toSet.nodes, toSet.edges, notionFieldColors, replaceColors);

        setCurrentFileName(null);
        setNotionConnected(true);
        setSyncMode('bidirectional');
        setAllowBackgroundSync(true);
        setLastSyncTime(new Date().toISOString());
        setIsVisible(false);
      } catch (err) {
        console.error('Failed to pull from Notion:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setIsVisible(false);
      setModalOpen('notionSync', true);
    }
  };

  const handleGoToNotionConfig = () => {
    setIsVisible(false);
    setModalOpen('notionSync', true);
  };

  if (!isVisible) return null;

  return (
    <div className={modalOverlay} style={{ background: 'var(--modal-overlay)' }}>
      <div className={modalDialog}>
        <h1 className="text-2xl font-bold text-text mb-2 text-center">TechTree Studio</h1>
        <p className="text-muted text-center mb-8">
          Выберите, как вы хотите работать с деревом технологий
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className={cardClass}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-control-bg-muted rounded-full flex items-center justify-center border border-control-border-muted">
                <HardDrive size={32} className="text-accent" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-text">Офлайн режим</h2>
              <p className="text-sm text-muted">
                Работа с локальными файлами на вашем компьютере.
              </p>
              <div className="space-y-2 w-full">
                <button
                  type="button"
                  onClick={handleOfflineMode}
                  disabled={loading}
                  className={btnPrimary}
                >
                  Открыть файл проекта
                </button>
                <button
                  type="button"
                  onClick={handleStartBlank}
                  disabled={loading}
                  className={btnSecondary}
                >
                  Пустой проект
                </button>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-control-bg-muted rounded-full flex items-center justify-center border border-control-border-muted">
                <NotionIcon size={32} color="var(--accent)" docFill="var(--control-bg-muted)" />
              </div>
              <h2 className="text-lg font-semibold text-text">Notion</h2>
              <p className="text-sm text-muted">
                {notionConfig
                  ? 'Загрузить дерево технологий из подключённой базы Notion.'
                  : 'Подключить базу данных Notion для синхронизации.'}
              </p>
              <div className="space-y-2 w-full">
                <button
                  type="button"
                  onClick={handleOnlineMode}
                  disabled={loading}
                  className={`${btnPrimary} flex items-center justify-center`}
                >
                  {loading && <Loader2 size={18} className="animate-spin mr-2" strokeWidth={1.75} />}
                  {loading
                    ? 'Загрузка из Notion...'
                    : notionConfig
                      ? 'Открыть проект из Notion'
                      : 'Подключить Notion'}
                </button>
                {notionConfig && (
                  <button
                    type="button"
                    onClick={handleGoToNotionConfig}
                    disabled={loading}
                    className={`${btnSecondary} text-sm`}
                  >
                    Настройки подключения
                  </button>
                )}
              </div>
              {error && (
                <div className="text-xs rounded-control p-2 w-full text-left bg-danger/15 border border-danger/45 text-danger">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <label className="checkbox-label flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
            />
            Больше не показывать
          </label>
        </div>
      </div>
    </div>
  );
};
