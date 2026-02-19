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
import { TechNode, TechEdge, ProjectMeta, ProjectSettings, NotionConfig, SyncResult, DEFAULT_NODE_COLOR_PALETTE, CanvasFilter } from '../types';

const NOTION_STORAGE_KEY = 'techtree_notion_config';
const THEME_STORAGE_KEY = 'techtree_theme';

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
  syncProgress: { current: number; total: number } | null;
  lastSyncResult: SyncResult | null;
  lastSyncTime: string | null;
  lastSyncError: string | null;
  notionSourceOfTruth: boolean;
  notionDirty: boolean;
  notionHasRemoteUpdates: boolean;
  dirtyNodeIds: Set<string>;
  syncJustCompleted: boolean;
  notionFieldColors: Record<string, Record<string, string>>;

  // Canvas filter (runtime UI state, not persisted in project)
  canvasFilter: CanvasFilter;

  /** Edge-click highlight: connected subgraph nodeIds and edgeIds, or null when off */
  connectedSubgraphHighlight: { nodeIds: Set<string>; edgeIds: Set<string> } | null;

  // UI State
  ui: {
    sidebarOpen: boolean;
    inspectorOpen: boolean;
    theme: 'dark' | 'light';
  };
  modals: {
    import: boolean;
    settings: boolean;
    export: boolean;
    notionSync: boolean;
    colorMapping: boolean;
  };

  // Actions
  onNodesChange: OnNodesChange<TechNode>;
  onEdgesChange: OnEdgesChange<TechEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: TechNode[]) => void;
  setEdges: (edges: TechEdge[]) => void;
  /** Replace nodes/edges from sync (Pull). Optionally merge/replace notionFieldColors. */
  replaceNodesAndEdgesForSync: (
    nodes: TechNode[],
    edges: TechEdge[],
    notionFieldColors?: Record<string, Record<string, string>>,
    replaceColors?: boolean
  ) => void;
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
  setSyncProgress: (progress: { current: number; total: number } | null) => void;
  setLastSyncResult: (result: SyncResult | null) => void;
  setLastSyncTime: (time: string | null) => void;
  setLastSyncError: (error: string | null) => void;
  setNotionSourceOfTruth: (enabled: boolean) => void;
  setNotionDirty: (dirty: boolean) => void;
  setNotionHasRemoteUpdates: (has: boolean) => void;
  markNodesDirty: (ids: string[]) => void;
  clearDirtyNodes: () => void;
  setSyncJustCompleted: (value: boolean) => void;

  setCanvasFilter: (filter: Partial<CanvasFilter>) => void;
  setConnectedSubgraphHighlight: (ids: { nodeIds: Set<string>; edgeIds: Set<string> } | null) => void;

  setModalOpen: (modal: 'import' | 'settings' | 'export' | 'notionSync' | 'colorMapping', isOpen: boolean) => void;

  // UI Actions
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const defaultSettings: ProjectSettings = {
  layoutDirection: 'LR',
  nodeTemplate: '%label%\n%act% %stage% | %category%',
  renderSimplification: false,
  nodeColorBy: 'category',
  nodeColorPalette: [...DEFAULT_NODE_COLOR_PALETTE],
  nodeMinWidth: 200,
  nodeMaxWidth: 320,
  nodeMinHeight: 48,
  nodeBorderWidth: 2,
  nodeLeftStripWidth: 3,
  nodeTextAlignH: 'left',
  nodeTextAlignV: 'center',
  nodeTextFit: true,
  nodeVisualPreset: 'default',
};

const defaultMeta: ProjectMeta = {
  name: 'New Project',
  updatedAt: new Date().toISOString(),
  version: '1.0',
  };

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

const loadTheme = (): 'dark' | 'light' => {
  return (localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light') || 'dark';
};

const LAST_SYNC_PREFIX = 'techtree_last_sync_';

const loadLastSyncTime = (databaseId: string | undefined): string | null => {
  if (!databaseId) return null;
  try {
    return localStorage.getItem(`${LAST_SYNC_PREFIX}${databaseId}`);
  } catch {
    return null;
  }
};

const persistLastSyncTime = (databaseId: string | undefined, time: string | null) => {
  if (!databaseId) return;
  if (time) {
    localStorage.setItem(`${LAST_SYNC_PREFIX}${databaseId}`, time);
  } else {
    localStorage.removeItem(`${LAST_SYNC_PREFIX}${databaseId}`);
  }
};

const nowIso = () => new Date().toISOString();

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
      syncProgress: null,
      lastSyncResult: null,
      lastSyncTime: loadLastSyncTime(loadNotionConfig()?.databaseId),
      lastSyncError: null,
      notionSourceOfTruth: false,
      notionDirty: false,
      notionHasRemoteUpdates: false,
      dirtyNodeIds: new Set<string>(),
      syncJustCompleted: false,
      notionFieldColors: {},

      canvasFilter: {
        enabled: false,
        rules: [],
        hideMode: 'dim',
      },

      connectedSubgraphHighlight: null,

      ui: {
        sidebarOpen: true,
        inspectorOpen: true,
        theme: loadTheme(),
      },

      modals: {
        import: false,
        settings: false,
        export: false,
        notionSync: false,
        colorMapping: false,
      },

      onNodesChange: (changes: NodeChange<TechNode>[]) => {
        const dragEndIds: string[] = [];
        let hasDragEnd = false;
        for (const c of changes) {
          const posChange = c as { type: string; id?: string; dragging?: boolean };
          if (c.type === 'position' && c.id && posChange.dragging === false) {
            dragEndIds.push(c.id);
            hasDragEnd = true;
          }
        }
        let newNodes = applyNodeChanges(changes, get().nodes);
        if (hasDragEnd) {
          // Drag finished — record undo entry + mark dirty
          const ts = nowIso();
          const ids = new Set(dragEndIds);
          newNodes = newNodes.map((n) =>
            ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
          );
          const next = new Set(get().dirtyNodeIds);
          dragEndIds.forEach((id) => next.add(id));
          set({ nodes: newNodes, dirtyNodeIds: next });
        } else {
          // Selections, dimensions, intermediate drag — no undo entry
          const temporal = (useStore as any).temporal?.getState?.();
          temporal?.pause();
          set({ nodes: newNodes });
          temporal?.resume();
        }
      },

      onEdgesChange: (changes: EdgeChange<TechEdge>[]) => {
        const currentEdges = get().edges;
        const removedIds: string[] = [];
        for (const c of changes) {
          if (c.type === 'remove' && c.id) {
            const edge = currentEdges.find((e) => e.id === c.id);
            if (edge) removedIds.push(edge.source, edge.target);
          }
        }
        const newEdges = applyEdgeChanges(changes, currentEdges);
        if (removedIds.length > 0) {
          // Edge removed — record undo entry + mark dirty
          const ts = nowIso();
          const ids = new Set(removedIds);
          const newNodes = get().nodes.map((n) =>
            ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
          );
          const next = new Set(get().dirtyNodeIds);
          removedIds.forEach((id) => next.add(id));
          set({ nodes: newNodes, edges: newEdges, dirtyNodeIds: next });
        } else {
          // Selection/other non-destructive edge changes — no undo entry
          const temporal = (useStore as any).temporal?.getState?.();
          temporal?.pause();
          set({ edges: newEdges });
          temporal?.resume();
        }
      },

      onConnect: (connection: Connection) => {
        const next = new Set(get().dirtyNodeIds);
        const ids = new Set<string>();
        if (connection.source) { next.add(connection.source); ids.add(connection.source); }
        if (connection.target) { next.add(connection.target); ids.add(connection.target); }
        const ts = nowIso();
        const newNodes = get().nodes.map((n) =>
          ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
        );
        set({
          nodes: newNodes,
          edges: addEdge(connection, get().edges),
          dirtyNodeIds: next,
        });
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      replaceNodesAndEdgesForSync: (nodes, edges, notionFieldColors, replaceColors = false) => {
        const temporal = (useStore as any).temporal?.getState?.();
        temporal?.pause();
        let nextColors = get().notionFieldColors;
        if (notionFieldColors && Object.keys(notionFieldColors).length > 0) {
          nextColors = replaceColors
            ? notionFieldColors
            : Object.entries(notionFieldColors).reduce(
                (acc, [fk, map]) => {
                  acc[fk] = { ...(acc[fk] || {}), ...map };
                  return acc;
                },
                { ...get().notionFieldColors }
              );
        }
        set({
          nodes: [...nodes],
          edges: [...edges],
          syncJustCompleted: true,
          dirtyNodeIds: new Set<string>(),
          ...(notionFieldColors ? { notionFieldColors: nextColors } : {}),
        });
        temporal?.resume();
      },

      addNode: (node) => {
        const next = new Set(get().dirtyNodeIds);
        next.add(node.id);
        const nodeWithTs = {
          ...node,
          data: { ...node.data, localModifiedAt: nowIso() },
        };
        set({ nodes: [...get().nodes, nodeWithTs], dirtyNodeIds: next });
      },

      deleteNodes: (nodeIds) => {
        set({
          nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
          edges: get().edges.filter(
            (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
          ),
        });
      },

      updateNodeData: (id, data) => {
        const next = new Set(get().dirtyNodeIds);
        next.add(id);
        const ts = nowIso();
        set({
          nodes: get().nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...data, localModifiedAt: ts } }
              : node
          ),
          dirtyNodeIds: next,
        });
      },

      setProjectName: (name) => set({ meta: { ...get().meta, name } }),

      loadProject: (project) => {
        const loadedSettings = project.settings || {};
        set({
            nodes: project.nodes || [],
            edges: project.edges || [],
            meta: project.meta || defaultMeta,
            settings: { ...defaultSettings, ...loadedSettings },
            notionFieldColors: project.notionFieldColors || {},
        });
      },

      updateSettings: (newSettings) => set({ settings: { ...get().settings, ...newSettings } }),

      // Notion actions
      setNotionConfig: (config) => {
        persistNotionConfig(config);
        set({
          notionConfig: config,
          lastSyncTime: config ? loadLastSyncTime(config.databaseId) : null,
        });
      },
      setNotionCorsProxy: (proxy) => {
        localStorage.setItem('techtree_notion_cors_proxy', proxy);
        set({ notionCorsProxy: proxy });
      },
      setNotionConnected: (connected) => set({ notionConnected: connected }),
      setSyncInProgress: (inProgress) => set({
        syncInProgress: inProgress,
        ...(inProgress ? {} : { syncProgress: null }),
      }),
      setSyncProgress: (progress) => set({ syncProgress: progress }),
      setLastSyncResult: (result) => set({ lastSyncResult: result }),
      setLastSyncTime: (time) => {
        persistLastSyncTime(get().notionConfig?.databaseId, time);
        set({ lastSyncTime: time, lastSyncError: null });
      },
      setLastSyncError: (error) => set({ lastSyncError: error }),
      setNotionSourceOfTruth: (enabled) => set({ notionSourceOfTruth: enabled }),
      setNotionDirty: (dirty) => set({ notionDirty: dirty }),
      setNotionHasRemoteUpdates: (has) => set({ notionHasRemoteUpdates: has }),
      markNodesDirty: (ids) => {
        const next = new Set(get().dirtyNodeIds);
        ids.forEach((id) => next.add(id));
        set({ dirtyNodeIds: next });
      },
      clearDirtyNodes: () => set({ dirtyNodeIds: new Set<string>() }),
      setSyncJustCompleted: (value) => set({ syncJustCompleted: value }),

      setCanvasFilter: (filter) => {
        const current = get().canvasFilter;
        const next = { ...current, ...filter };
        next.enabled = (next.rules?.length ?? 0) > 0;
        set({ canvasFilter: next });
      },

      setConnectedSubgraphHighlight: (ids) => set({ connectedSubgraphHighlight: ids }),

      setModalOpen: (modal, isOpen) => set({ modals: { ...get().modals, [modal]: isOpen } }),

      // UI Actions
      toggleSidebar: () => set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } })),
      toggleInspector: () => set((state) => ({ ui: { ...state.ui, inspectorOpen: !state.ui.inspectorOpen } })),
      setTheme: (theme) => {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        set((state) => ({ ui: { ...state.ui, theme } }));
      },
    }),
    {
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      limit: 50,
    }
  )
);
