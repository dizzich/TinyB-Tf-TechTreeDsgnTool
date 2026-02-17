import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { pushToNotion } from '../utils/notionApi';
import { NOTION_BUILTIN_PROXY } from '../utils/notionApi';

const AUTO_SAVE_DELAY = 3000; // 3 seconds debounce

/** Resolves the effective proxy value for Notion API calls */
const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return NOTION_BUILTIN_PROXY; // default to built-in in dev
};

/**
 * Hook that auto-saves node changes to Notion when notionSourceOfTruth is enabled.
 * Debounces pushes by AUTO_SAVE_DELAY ms to avoid flooding Notion API.
 */
export const useNotionAutoSave = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const notionConfig = useStore((s) => s.notionConfig);
  const notionSourceOfTruth = useStore((s) => s.notionSourceOfTruth);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const syncInProgress = useStore((s) => s.syncInProgress);
  const setSyncInProgress = useStore((s) => s.setSyncInProgress);
  const setSyncProgress = useStore((s) => s.setSyncProgress);
  const setLastSyncTime = useStore((s) => s.setLastSyncTime);
  const setLastSyncError = useStore((s) => s.setLastSyncError);
  const setNotionDirty = useStore((s) => s.setNotionDirty);
  const dirtyNodeIds = useStore((s) => s.dirtyNodeIds);
  const clearDirtyNodes = useStore((s) => s.clearDirtyNodes);
  const syncJustCompleted = useStore((s) => s.syncJustCompleted);
  const setSyncJustCompleted = useStore((s) => s.setSyncJustCompleted);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  // Track initial render to skip first auto-save (pull sets nodes/edges)
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!notionSourceOfTruth || !notionConfig || syncInProgress) return;

    if (syncJustCompleted) {
      setSyncJustCompleted(false);
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      return;
    }

    // Skip the very first change after mount (it's the initial data load / pull)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      return;
    }

    // Skip if no actual change (reference equality)
    if (prevNodesRef.current === nodes && prevEdgesRef.current === edges) return;
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;

    // Mark as dirty
    setNotionDirty(true);

    // Debounce the push
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (nodes.length === 0) return;

      // Re-check syncInProgress from store (it could have changed during debounce)
      if (useStore.getState().syncInProgress) return;

      const dirty = useStore.getState().dirtyNodeIds;
      // Only push nodes that were actually changed in the graph; never full push from auto-save
      if (dirty.size === 0) return;

      try {
        setSyncInProgress(true);
        setSyncProgress({ current: 0, total: dirty.size });
        const proxy = getEffectiveProxy(notionCorsProxy);
        await pushToNotion(
          nodes,
          edges,
          notionConfig,
          proxy,
          (current, total) => useStore.getState().setSyncProgress({ current, total }),
          dirty
        );
        setLastSyncTime(new Date().toISOString());
        setLastSyncError(null);
        setNotionDirty(false);
        clearDirtyNodes();
      } catch (err) {
        console.error('[Notion auto-save] Failed:', err);
        useStore.getState().setLastSyncError(err instanceof Error ? err.message : String(err));
        // Keep dirty flag — will retry on next change
      } finally {
        setSyncInProgress(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, notionSourceOfTruth, notionConfig, syncInProgress, notionCorsProxy, dirtyNodeIds, syncJustCompleted, setSyncJustCompleted, setSyncInProgress, setSyncProgress, setLastSyncTime, setLastSyncError, setNotionDirty, clearDirtyNodes]);
};
