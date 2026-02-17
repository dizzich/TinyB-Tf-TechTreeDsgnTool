import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  Connection,
  EdgeChange,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';
import { TechNode, TechEdge, ProjectMeta, ProjectSettings, NotionConfig, SyncResult } from '../types';

const NOTION_STORAGE_KEY = 'techtree_notion_config';

interface AppState {
  nodes: TechNode[];
  edges: TechEdge[];
  meta: ProjectMeta;
  settings: ProjectSettings;

  // Notion sync state
  notionConfig: NotionConfig | null;
  notionCorsProxy: string;
  notionConnected: boolean;
  syncInProgress: boolean;
  lastSyncResult: SyncResult | null;
  lastSyncTime: string | null;
  notionSourceOfTruth: boolean;
  notionDirty: boolean;

  // UI State
  modals: {
    import: boolean;
    settings: boolean;
    export: boolean;
    notionSync: boolean;
  };

  // Actions
  onNodesChange: OnNodesChange<TechNode>;
  onEdgesChange: OnEdgesChange<TechEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: TechNode[]) => void;
  setEdges: (edges: TechEdge[]) => void;
  addNode: (node: TechNode) => void;
  deleteNodes: (nodeIds: string[]) => void;
  updateNodeData: (id: string, data: any) => void;
  setProjectName: (name: string) => void;
  loadProject: (project: any) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;

  // Notion actions
  setNotionConfig: (config: NotionConfig | null) => void;
  setNotionCorsProxy: (proxy: string) => void;
  setNotionConnected: (connected: boolean) => void;
  setSyncInProgress: (inProgress: boolean) => void;
  setLastSyncResult: (result: SyncResult | null) => void;
  setLastSyncTime: (time: string | null) => void;
  setNotionSourceOfTruth: (enabled: boolean) => void;
  setNotionDirty: (dirty: boolean) => void;

  setModalOpen: (modal: 'import' | 'settings' | 'export' | 'notionSync', isOpen: boolean) => void;
}

const defaultSettings: ProjectSettings = {
  layoutDirection: 'LR',
  nodeTemplate: '%RuName%\n%Act% %Stage% | %Category%',
  renderSimplification: false,
};

const defaultMeta: ProjectMeta = {
  name: 'New Project',
  updatedAt: new Date().toISOString(),
  version: '1.0',
};

// Load persisted Notion config from localStorage
const loadNotionConfig = (): NotionConfig | null => {
  try {
    const stored = localStorage.getItem(NOTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const persistNotionConfig = (config: NotionConfig | null) => {
  if (config) {
    localStorage.setItem(NOTION_STORAGE_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(NOTION_STORAGE_KEY);
  }
};

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      meta: defaultMeta,
      settings: defaultSettings,

      // Notion state
      notionConfig: loadNotionConfig(),
      notionCorsProxy: localStorage.getItem('techtree_notion_cors_proxy') || '',
      notionConnected: false,
      syncInProgress: false,
      lastSyncResult: null,
      lastSyncTime: null,
      notionSourceOfTruth: false,
      notionDirty: false,

      modals: {
        import: false,
        settings: false,
        export: false,
        notionSync: false,
      },

      onNodesChange: (changes: NodeChange<TechNode>[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },

      onEdgesChange: (changes: EdgeChange<TechEdge>[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },

      onConnect: (connection: Connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      addNode: (node) => set({ nodes: [...get().nodes, node] }),

      deleteNodes: (nodeIds) => {
        set({
          nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
          edges: get().edges.filter(
            (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
          ),
        });
      },

      updateNodeData: (id, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, ...data } } : node
          ),
        });
      },

      setProjectName: (name) => set({ meta: { ...get().meta, name } }),

      loadProject: (project) => {
        set({
            nodes: project.nodes || [],
            edges: project.edges || [],
            meta: project.meta || defaultMeta,
            settings: project.settings || defaultSettings
        });
      },

      updateSettings: (newSettings) => set({ settings: { ...get().settings, ...newSettings } }),

      // Notion actions
      setNotionConfig: (config) => {
        persistNotionConfig(config);
        set({ notionConfig: config });
      },
      setNotionCorsProxy: (proxy) => {
        localStorage.setItem('techtree_notion_cors_proxy', proxy);
        set({ notionCorsProxy: proxy });
      },
      setNotionConnected: (connected) => set({ notionConnected: connected }),
      setSyncInProgress: (inProgress) => set({ syncInProgress: inProgress }),
      setLastSyncResult: (result) => set({ lastSyncResult: result }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setNotionSourceOfTruth: (enabled) => set({ notionSourceOfTruth: enabled }),
      setNotionDirty: (dirty) => set({ notionDirty: dirty }),

      setModalOpen: (modal, isOpen) => set({ modals: { ...get().modals, [modal]: isOpen } }),
    })
  )
);
