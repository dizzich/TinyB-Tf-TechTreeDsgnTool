import { create } from 'zustand';
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
import { TechNode, TechEdge, ProjectMeta, ProjectSettings, NotionConfig, SyncResult, DEFAULT_NODE_COLOR_PALETTE, CanvasFilter, EdgeWaypoint } from '../types';
import { snapPositionToObjects, snapToGrid } from '../utils/snapToGrid';

const HISTORY_LIMIT = 50;

export interface HistorySnapshot {
  nodes: TechNode[];
  edges: TechEdge[];
}

function cloneSnapshot(nodes: TechNode[], edges: TechEdge[]): HistorySnapshot {
  return { nodes: structuredClone(nodes), edges: structuredClone(edges) };
}

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
  /** @deprecated use syncMode instead */
  notionSourceOfTruth: boolean;
  /** When false, no auto-sync until user explicitly chooses an action in Notion Sync modal */
  allowBackgroundSync: boolean;
  /** Background sync mode: push (graph→Notion), pull (Notion→graph), bidirectional, or pause */
  syncMode: import('../types').SyncMode;
  notionDirty: boolean;
  notionHasRemoteUpdates: boolean;
  dirtyNodeIds: Set<string>;
  syncJustCompleted: boolean;
  notionFieldColors: Record<string, Record<string, string>>;

  // Canvas filter (runtime UI state, not persisted in project)
  canvasFilter: CanvasFilter;

  /** Edge-click highlight: connected subgraph nodeIds and edgeIds, or null when off */
  connectedSubgraphHighlight: { nodeIds: Set<string>; edgeIds: Set<string> } | null;

  /** Shift key held — enables axis-lock drag mode */
  _shiftKeyPressed: boolean;
  /** Per-node axis lock during drag (Shift + axis align) */
  _dragAxisLock: Map<string, { lockX?: number; lockY?: number }>;
  /** Drag start position for axis choice when both axes snap */
  _nodeDragStartPos: { id: string; x: number; y: number } | null;
  setShiftKeyPressed: (pressed: boolean) => void;

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

  // Undo/redo (internal state not exposed; use canUndo/canRedo for UI)
  _history: { past: HistorySnapshot[]; future: HistorySnapshot[] };
  _pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  onNodesChange: OnNodesChange<TechNode>;
  onEdgesChange: OnEdgesChange<TechEdge>;
  onConnect: OnConnect;
  onNodeDragStart: (event?: unknown, node?: { id: string; position: { x: number; y: number } }, nodes?: unknown) => void;
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
  setAllowBackgroundSync: (allowed: boolean) => void;
  setSyncMode: (mode: import('../types').SyncMode) => void;
  setNotionDirty: (dirty: boolean) => void;
  setNotionHasRemoteUpdates: (has: boolean) => void;
  markNodesDirty: (ids: string[]) => void;
  clearDirtyNodes: () => void;
  setSyncJustCompleted: (value: boolean) => void;

  /** Update all waypoints for an edge. skipSnapshot=true during drag to avoid spamming history. */
  updateEdgeWaypoints: (edgeId: string, waypoints: EdgeWaypoint[], skipSnapshot?: boolean) => void;
  addEdgeWaypoint: (edgeId: string, segmentIndex: number, point: EdgeWaypoint) => void;
  removeEdgeWaypoint: (edgeId: string, waypointIndex: number) => void;

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
  snapEnabled: true,
  snapGridSize: 8,
  snapToObjects: false,
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

// Suppresses creating a history entry when ReactFlow echoes position change after undo/redo.
let _restoringHistory = false;

export const useStore = create<AppState>()((set, get) => ({
  nodes: [],
  edges: [],
  meta: defaultMeta,
  settings: defaultSettings,

  _history: { past: [], future: [] },

  _pushSnapshot: () => {
    const { nodes, edges, _history } = get();
    const past = [..._history.past, cloneSnapshot(nodes, edges)].slice(-HISTORY_LIMIT);
    set({ _history: { past, future: [] } });
  },

  undo: () => {
    const { _history, nodes, edges } = get();
    if (_history.past.length === 0) return;
    _restoringHistory = true;
    const prev = _history.past[_history.past.length - 1];
    const past = _history.past.slice(0, -1);
    const future = [cloneSnapshot(nodes, edges), ..._history.future];
    set({ nodes: prev.nodes, edges: prev.edges, _history: { past, future } });
    const changedIds = new Set<string>();
    prev.nodes.forEach((n) => changedIds.add(n.id));
    nodes.forEach((n) => changedIds.add(n.id));
    get().markNodesDirty([...changedIds]);
    // Use setTimeout to ensure flag stays true during ReactFlow's immediate echo events
    setTimeout(() => { _restoringHistory = false; }, 100);
  },

  redo: () => {
    const { _history, nodes, edges } = get();
    if (_history.future.length === 0) return;
    _restoringHistory = true;
    const next = _history.future[0];
    const past = [..._history.past, cloneSnapshot(nodes, edges)].slice(-HISTORY_LIMIT);
    const future = _history.future.slice(1);
    set({ nodes: next.nodes, edges: next.edges, _history: { past, future } });
    const changedIds = new Set<string>();
    next.nodes.forEach((n) => changedIds.add(n.id));
    nodes.forEach((n) => changedIds.add(n.id));
    get().markNodesDirty([...changedIds]);
    setTimeout(() => { _restoringHistory = false; }, 100);
  },

  clearHistory: () => set({ _history: { past: [], future: [] } }),

  canUndo: () => get()._history.past.length > 0,
  canRedo: () => get()._history.future.length > 0,

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
      allowBackgroundSync: false,
      syncMode: 'pause',
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

      _shiftKeyPressed: false,
      _dragAxisLock: new Map<string, { lockX?: number; lockY?: number }>(),
      _nodeDragStartPos: null,

      setShiftKeyPressed: (pressed) => {
        set({
          _shiftKeyPressed: pressed,
          ...(pressed ? {} : { _dragAxisLock: new Map() }),
        });
      },

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

      onNodeDragStart: (_event, node) => {
        get()._pushSnapshot();
        if (node?.id != null && node?.position != null)
          set({ _nodeDragStartPos: { id: node.id, x: node.position.x, y: node.position.y } });
      },

      onNodesChange: (changes: NodeChange<TechNode>[]) => {
        if (_restoringHistory) return;

        const currentNodes = get().nodes;
        const settings = get().settings;
        const snapEnabled = settings.snapEnabled ?? true;
        const snapToObjects = settings.snapToObjects ?? false;
        const snapGridSize = settings.snapGridSize ?? 8;
        const nodeMinWidth = settings.nodeMinWidth ?? 200;
        const nodeMinHeight = settings.nodeMinHeight ?? 48;

        const shiftPressed = get()._shiftKeyPressed;
        const dragAxisLock = get()._dragAxisLock;

        let processedChanges = changes;
        if (snapEnabled) {
          processedChanges = changes.map((c) => {
            if (c.type !== 'position' || !c.id) return c;
            const posChange = c as { type: 'position'; id: string; position?: { x: number; y: number }; dragging?: boolean };
            const position = posChange.position;
            if (!position) return c;

            let x = position.x;
            let y = position.y;
            const isDragging = posChange.dragging === true;

            if (shiftPressed && isDragging) {
              const lock = dragAxisLock.get(posChange.id);
              if (lock) {
                x = lock.lockX ?? position.x;
                y = lock.lockY ?? position.y;
              } else {
                const objSnap = snapPositionToObjects(position, posChange.id, currentNodes, {
                  threshold: 40,
                  defaultWidth: nodeMinWidth,
                  defaultHeight: nodeMinHeight,
                });
                if (objSnap.snappedX || objSnap.snappedY) {
                  const nextLock = new Map(dragAxisLock);
                  if (objSnap.snappedX && objSnap.snappedY) {
                    const start = get()._nodeDragStartPos;
                    const preferVertical = start && start.id === posChange.id
                      ? Math.abs(position.y - start.y) >= Math.abs(position.x - start.x)
                      : objSnap.minDx <= objSnap.minDy;
                    nextLock.set(posChange.id, preferVertical ? { lockX: objSnap.x } : { lockY: objSnap.y });
                  } else if (objSnap.snappedX) {
                    nextLock.set(posChange.id, { lockX: objSnap.x });
                  } else {
                    nextLock.set(posChange.id, { lockY: objSnap.y });
                  }
                  set({ _dragAxisLock: nextLock });
                  x = objSnap.x;
                  y = objSnap.y;
                }
              }
            } else if (snapToObjects && !shiftPressed) {
              const objSnap = snapPositionToObjects(position, posChange.id, currentNodes, {
                threshold: 16,
                defaultWidth: nodeMinWidth,
                defaultHeight: nodeMinHeight,
              });
              x = objSnap.x;
              y = objSnap.y;
              if ((!objSnap.snappedX || !objSnap.snappedY) && snapGridSize > 0) {
                const gridSnap = snapToGrid(x, y, snapGridSize);
                if (!objSnap.snappedX) x = gridSnap.x;
                if (!objSnap.snappedY) y = gridSnap.y;
              }
            } else if (snapGridSize > 0) {
              const gridSnap = snapToGrid(x, y, snapGridSize);
              x = gridSnap.x;
              y = gridSnap.y;
            }

            if (x === position.x && y === position.y) return c;
            return { ...c, position: { x, y } } as NodeChange<TechNode>;
          });
        }

        const dragEndIds: string[] = [];
        let hasDragEnd = false;
        for (const c of processedChanges) {
          const posChange = c as { type: string; id?: string; dragging?: boolean };
          if (c.type === 'position' && c.id && posChange.dragging === false) {
            dragEndIds.push(c.id);
            hasDragEnd = true;
          }
        }
        const newNodes = applyNodeChanges(processedChanges, currentNodes);
        if (hasDragEnd) {
          const nextLock = new Map(get()._dragAxisLock);
          dragEndIds.forEach((id) => nextLock.delete(id));
          const start = get()._nodeDragStartPos;
          const clearStart = start != null && dragEndIds.includes(start.id);
          const ts = nowIso();
          const ids = new Set(dragEndIds);
          const nodesWithTs = newNodes.map((n) =>
            ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
          );
          const next = new Set(get().dirtyNodeIds);
          dragEndIds.forEach((id) => next.add(id));
          set({
            nodes: nodesWithTs,
            dirtyNodeIds: next,
            _dragAxisLock: nextLock,
            ...(clearStart ? { _nodeDragStartPos: null } : {}),
          });
        } else {
          set({ nodes: newNodes });
        }
      },

      onEdgesChange: (changes: EdgeChange<TechEdge>[]) => {
        if (_restoringHistory) return;

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
          get()._pushSnapshot();
          const ts = nowIso();
          const ids = new Set(removedIds);
          const newNodes = get().nodes.map((n) =>
            ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
          );
          const next = new Set(get().dirtyNodeIds);
          removedIds.forEach((id) => next.add(id));
          set({ nodes: newNodes, edges: newEdges, dirtyNodeIds: next });
        } else {
          set({ edges: newEdges });
        }
      },

      onConnect: (connection: Connection) => {
        get()._pushSnapshot();
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
        get().clearHistory();
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
      },

      addNode: (node) => {
        get()._pushSnapshot();
        const next = new Set(get().dirtyNodeIds);
        next.add(node.id);
        const nodeWithTs = {
          ...node,
          data: { ...node.data, localModifiedAt: nowIso() },
        };
        set({ nodes: [...get().nodes, nodeWithTs], dirtyNodeIds: next });
      },

      deleteNodes: (nodeIds) => {
        get()._pushSnapshot();
        set({
          nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
          edges: get().edges.filter(
            (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
          ),
        });
      },

      updateNodeData: (id, data) => {
        get()._pushSnapshot();
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
        get().clearHistory();
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
          ...(config ? {} : { allowBackgroundSync: false }),
        });
      },
      setNotionCorsProxy: (proxy) => {
        localStorage.setItem('techtree_notion_cors_proxy', proxy);
        set({ notionCorsProxy: proxy });
      },
      setNotionConnected: (connected) => set({
        notionConnected: connected,
        ...(connected ? {} : { allowBackgroundSync: false }),
      }),
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
      setNotionSourceOfTruth: (enabled) => set({
        notionSourceOfTruth: enabled,
        syncMode: enabled ? (get().syncMode === 'pause' ? 'bidirectional' : get().syncMode) : 'pause',
      }),
      setAllowBackgroundSync: (allowed) => set({ allowBackgroundSync: allowed }),
      setSyncMode: (mode) => set({
        syncMode: mode,
        notionSourceOfTruth: mode !== 'pause',
      }),
      setNotionDirty: (dirty) => set({ notionDirty: dirty }),
      setNotionHasRemoteUpdates: (has) => set({ notionHasRemoteUpdates: has }),
      markNodesDirty: (ids) => {
        const next = new Set(get().dirtyNodeIds);
        ids.forEach((id) => next.add(id));
        set({ dirtyNodeIds: next });
      },
      clearDirtyNodes: () => set({ dirtyNodeIds: new Set<string>() }),
      setSyncJustCompleted: (value) => set({ syncJustCompleted: value }),

      updateEdgeWaypoints: (edgeId, waypoints, skipSnapshot = false) => {
        if (!skipSnapshot) get()._pushSnapshot();
        const edge = get().edges.find((e) => e.id === edgeId);
        const wp = waypoints.length > 0 ? [...waypoints] : undefined;
        const newEdges = get().edges.map((e) =>
          e.id === edgeId ? { ...e, waypoints: wp } : e
        );
        set({ edges: newEdges });
        if (!skipSnapshot && edge) {
          const ts = nowIso();
          const ids = new Set<string>([edge.source, edge.target]);
          const next = new Set(get().dirtyNodeIds);
          ids.forEach((id) => next.add(id));
          const newNodes = get().nodes.map((n) =>
            ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
          );
          set({ nodes: newNodes, dirtyNodeIds: next });
        }
      },

      addEdgeWaypoint: (edgeId, segmentIndex, point) => {
        get()._pushSnapshot();
        const edge = get().edges.find((e) => e.id === edgeId);
        if (!edge) return;
        const wp = [...(edge.waypoints ?? [])];
        wp.splice(segmentIndex, 0, point);
        const newEdges = get().edges.map((e) =>
          e.id === edgeId ? { ...e, waypoints: wp } : e
        );
        const ts = nowIso();
        const ids = new Set<string>([edge.source, edge.target]);
        const next = new Set(get().dirtyNodeIds);
        ids.forEach((id) => next.add(id));
        const newNodes = get().nodes.map((n) =>
          ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
        );
        set({ edges: newEdges, nodes: newNodes, dirtyNodeIds: next });
      },

      removeEdgeWaypoint: (edgeId, waypointIndex) => {
        get()._pushSnapshot();
        const edge = get().edges.find((e) => e.id === edgeId);
        if (!edge?.waypoints) return;
        const wp = edge.waypoints.filter((_, i) => i !== waypointIndex);
        const newEdges = get().edges.map((e) =>
          e.id === edgeId ? { ...e, waypoints: wp.length > 0 ? wp : undefined } : e
        );
        const ts = nowIso();
        const ids = new Set<string>([edge.source, edge.target]);
        const next = new Set(get().dirtyNodeIds);
        ids.forEach((id) => next.add(id));
        const newNodes = get().nodes.map((n) =>
          ids.has(n.id) ? { ...n, data: { ...n.data, localModifiedAt: ts } } : n
        );
        set({ edges: newEdges, nodes: newNodes, dirtyNodeIds: next });
      },

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
}));
