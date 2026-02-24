import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  pullFromNotionIncremental,
  pushToNotion,
  archiveNotionPages,
  NOTION_BUILTIN_PROXY,
} from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';

const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return NOTION_BUILTIN_PROXY;
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
  const deletedNotionTombstones = useStore((s) => s.deletedNotionTombstones);
  const clearDirtyNodes = useStore((s) => s.clearDirtyNodes);
  const clearDeletedNotionTombstones = useStore((s) => s.clearDeletedNotionTombstones);

  const doPush = useCallback(async () => {
    if (!notionConfig) return;
    const dirty = dirtyNodeIds;
    const pendingDeletePageIds = Object.keys(deletedNotionTombstones);
    const totalToPush =
      dirty.size > 0
        ? dirty.size
        : pendingDeletePageIds.length > 0
          ? pendingDeletePageIds.length
          : nodes.length;
    if (totalToPush === 0) return;
    setSyncInProgress(true);
    setSyncProgress({ current: 0, total: totalToPush });
    try {
      const proxy = getEffectiveProxy(notionCorsProxy);
      const result =
        dirty.size > 0
          ? await pushToNotion(
            nodes,
            edges,
            notionConfig,
            proxy,
            (current, total) => setSyncProgress({ current, total }),
            dirty
          )
          : pendingDeletePageIds.length > 0
            ? { added: 0, updated: 0, deleted: 0, conflicts: [], errors: [] as string[] }
            : await pushToNotion(
              nodes,
              edges,
              notionConfig,
              proxy,
              (current, total) => setSyncProgress({ current, total }),
              undefined
            );

      if (pendingDeletePageIds.length > 0) {
        const archived = await archiveNotionPages(pendingDeletePageIds, notionConfig, proxy);
        if (archived.archivedIds.length > 0) {
          clearDeletedNotionTombstones(archived.archivedIds);
          result.deleted += archived.archivedIds.length;
        }
        if (archived.errors.length > 0) {
          result.errors.push(...archived.errors);
        }
      }
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      setLastSyncError(result.errors.length > 0 ? result.errors[0] : null);
      setNotionDirty(result.errors.length > 0);
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
    deletedNotionTombstones,
    setSyncInProgress,
    setSyncProgress,
    setLastSyncResult,
    setLastSyncTime,
    setLastSyncError,
    setNotionDirty,
    setNotionHasRemoteUpdates,
    clearDirtyNodes,
    clearDeletedNotionTombstones,
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
