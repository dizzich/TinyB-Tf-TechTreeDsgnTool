import React from 'react';
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
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getLayoutedElements } from '../utils/autoLayout';
import { useFileSystem } from '../hooks/useFileSystem';
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
  const notionSourceOfTruth = useStore((state) => state.notionSourceOfTruth);
  const notionDirty = useStore((state) => state.notionDirty);

  const { saveProject, openProject } = useFileSystem();

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

    // Deselect all other nodes
    const updatedNodes = nodes.map((n) => ({ ...n, selected: false }));
    setNodes(updatedNodes);

    // Add new node
    addNode(newNode);
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10 relative">
      <div className="flex items-center space-x-2">
        <span className="font-bold text-gray-700 mr-4">TechTree Studio</span>

        <button
          onClick={handleOpen}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Открыть проект"
        >
          <FolderOpen size={18} />
        </button>
        <button
          onClick={handleSave}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Сохранить проект"
        >
          <Save size={18} />
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <button
          onClick={handleAddNode}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Добавить узел"
        >
          <Plus size={18} />
        </button>

        <button
          onClick={() => setModalOpen('import', true)}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Импорт CSV"
        >
          <Upload size={18} />
        </button>
        <button
          onClick={() => setModalOpen('export', true)}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Экспорт"
        >
          <Download size={18} />
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <button
          onClick={handleAutoLayout}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Авто-размещение"
        >
          <Layout size={18} />
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <button
          onClick={() => setModalOpen('notionSync', true)}
          className={`p-2 rounded flex items-center gap-1 ${
            notionConfig
              ? 'text-purple-600 hover:bg-purple-50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Notion Sync"
        >
          <RefreshCw size={18} className={syncInProgress ? 'animate-spin' : ''} />
          {notionSourceOfTruth && (
            <span className={`text-xs font-bold leading-none ${
              syncInProgress ? 'text-purple-400' : notionDirty ? 'text-orange-500' : 'text-green-500'
            }`}>
              {syncInProgress ? '...' : notionDirty ? '*' : '\u2713'}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center space-x-2">
         <button
           onClick={() => undo()}
           className="p-2 hover:bg-gray-100 rounded text-gray-600"
           title="Отменить"
         >
          <Undo size={18} />
        </button>
        <button
          onClick={() => redo()}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Повторить"
        >
          <Redo size={18} />
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <button
          onClick={() => setModalOpen('settings', true)}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Настройки"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
