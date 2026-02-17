import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, Loader2 } from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';
import { useStore } from '../store/useStore';
import { pullFromNotion, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';

const STORAGE_KEY = 'techtree_hide_startup';

export const StartupModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nodes = useStore((state) => state.nodes);
  const loadProject = useStore((state) => state.loadProject);
  const notionConfig = useStore((state) => state.notionConfig);
  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);
  const setNotionConnected = useStore((state) => state.setNotionConnected);
  const setNotionSourceOfTruth = useStore((state) => state.setNotionSourceOfTruth);
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
    const project = await openProject();
    if (project) {
      loadProject(project);
    }
    setIsVisible(false);
  };

  const handleStartBlank = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsVisible(false);
  };

  const handleOnlineMode = async () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }

    if (notionConfig) {
      // Config exists — pull directly like "opening a project"
      setLoading(true);
      setError('');
      try {
        const { nodes: pulledNodes, edges: pulledEdges } = await pullFromNotion(
          notionConfig,
          NOTION_BUILTIN_PROXY
        );

        // Use stored positions from Notion if available, otherwise auto-layout
        const hasPositions = pulledNodes.some(n => n.position.x !== 0 || n.position.y !== 0);
        if (hasPositions) {
          setNodes(pulledNodes);
          setEdges(pulledEdges);
        } else {
          const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
            pulledNodes,
            pulledEdges,
            settings.layoutDirection
          );
          setNodes(layouted);
          setEdges(layoutedEdges);
        }

        setNotionConnected(true);
        setNotionSourceOfTruth(true);
        setIsVisible(false);
      } catch (err) {
        console.error('Failed to pull from Notion:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // Don't close — let user try again or go to config
      } finally {
        setLoading(false);
      }
    } else {
      // No config yet — open Notion sync modal for first-time setup
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          TechTree Studio
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Выберите, как вы хотите работать с деревом технологий
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Offline Mode */}
          <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <HardDrive size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Офлайн режим</h2>
              <p className="text-sm text-gray-600">
                Работа с локальными файлами на вашем компьютере.
              </p>
              <div className="space-y-2 w-full">
                <button
                  onClick={handleOfflineMode}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  Открыть файл проекта
                </button>
                <button
                  onClick={handleStartBlank}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Пустой проект
                </button>
              </div>
            </div>
          </div>

          {/* Online Mode (Notion) */}
          <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Cloud size={32} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold">Notion</h2>
              <p className="text-sm text-gray-600">
                {notionConfig
                  ? 'Загрузить дерево технологий из подключённой базы Notion.'
                  : 'Подключить базу данных Notion для синхронизации.'}
              </p>
              <div className="space-y-2 w-full">
                <button
                  onClick={handleOnlineMode}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {loading && <Loader2 size={18} className="animate-spin mr-2" />}
                  {loading
                    ? 'Загрузка из Notion...'
                    : notionConfig
                      ? 'Открыть проект из Notion'
                      : 'Подключить Notion'}
                </button>
                {notionConfig && (
                  <button
                    onClick={handleGoToNotionConfig}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
                  >
                    Настройки подключения
                  </button>
                )}
              </div>
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 w-full text-left">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="mr-2"
            />
            Больше не показывать
          </label>
        </div>
      </div>
    </div>
  );
};
