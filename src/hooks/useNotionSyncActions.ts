import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { pullFromNotionIncremental, pushToNotion, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';

const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return import.meta.env.DEV ? NOTION_BUILTIN_PROXY : undefined;
};

/** Hook for manual Push/Pull sync actions (e.g. from Toolbar) */
export const useNotionSyncActions = () => {
  const notionConfig = useStore((s) => s.notionConfig);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const settings = useStore((s) => s.settings);
  const replaceNodesAndEdgesForSync = useStore((s) => s.replaceNodesAndEdgesForSync);
  const setSyncInProgress = useStore((s) => s.setSyncInProgress);
  const setSyncProgress = useStore((s) => s.setSyncProgress);
  const setLastSyncResult = useStore((s) => s.setLastSyncResult);
  const setLastSyncTime = useStore((s) => s.setLastSyncTime);
  const setLastSyncError = useStore((s) => s.setLastSyncError);
  const setNotionDirty = useStore((s) => s.setNotionDirty);
  const setNotionHasRemoteUpdates = useStore((s) => s.setNotionHasRemoteUpdates);
  const dirtyNodeIds = useStore((s) => s.dirtyNodeIds);
  const clearDirtyNodes = useStore((s) => s.clearDirtyNodes);

  const doPush = useCallback(async () => {
    if (!notionConfig || nodes.length === 0) return;
    const dirty = dirtyNodeIds;
    const totalToPush = dirty.size > 0 ? dirty.size : nodes.length;
    setSyncInProgress(true);
    setSyncProgress({ current: 0, total: totalToPush });
    try {
      const result = await pushToNotion(
        nodes,
        edges,
        notionConfig,
        getEffectiveProxy(notionCorsProxy),
        (current, total) => setSyncProgress({ current, total }),
        dirty.size > 0 ? dirty : undefined
      );
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      setLastSyncError(result.errors.length > 0 ? result.errors[0] : null);
      setNotionDirty(false);
      setNotionHasRemoteUpdates(false);
      clearDirtyNodes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastSyncError(msg);
    } finally {
      setSyncInProgress(false);
    }
  }, [
    notionConfig,
    notionCorsProxy,
    nodes,
    edges,
    dirtyNodeIds,
    setSyncInProgress,
    setSyncProgress,
    setLastSyncResult,
    setLastSyncTime,
    setLastSyncError,
    setNotionDirty,
    setNotionHasRemoteUpdates,
    clearDirtyNodes,
  ]);

  const lastSyncTime = useStore((s) => s.lastSyncTime);

  const doPull = useCallback(async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    try {
      const { nodes: pulledNodes, edges: pulledEdges, notionFieldColors } = await pullFromNotionIncremental(
        notionConfig,
        lastSyncTime,
        nodes,
        edges,
        getEffectiveProxy(notionCorsProxy)
      );
      const hasPositions = pulledNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
      const toSet = hasPositions
        ? { nodes: pulledNodes, edges: pulledEdges }
        : getLayoutedElements(pulledNodes, pulledEdges, settings.layoutDirection);
      replaceNodesAndEdgesForSync(toSet.nodes, toSet.edges, notionFieldColors, false);
      setLastSyncResult({
        added: pulledNodes.length,
        updated: 0,
        deleted: 0,
        conflicts: [],
        errors: [],
      });
      setLastSyncTime(new Date().toISOString());
      setLastSyncError(null);
      setNotionDirty(false);
      setNotionHasRemoteUpdates(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastSyncError(msg);
    } finally {
      setSyncInProgress(false);
    }
  }, [
    notionConfig,
    notionCorsProxy,
    lastSyncTime,
    nodes,
    edges,
    settings.layoutDirection,
    replaceNodesAndEdgesForSync,
    setSyncInProgress,
    setLastSyncResult,
    setLastSyncTime,
    setLastSyncError,
    setNotionDirty,
    setNotionHasRemoteUpdates,
  ]);

  return { doPush, doPull, canSync: !!notionConfig };
};
