import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { checkForNotionUpdates, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { useNotionSyncActions } from './useNotionSyncActions';

const POLL_INTERVAL_MS = 60_000;

const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return NOTION_BUILTIN_PROXY;
};

/**
 * When Notion is connected, periodically check for remote updates (polling).
 * - If hasUpdates → set notionHasRemoteUpdates; optionally auto-pull when notionSourceOfTruth and no dirty nodes.
 * - Does not run while syncInProgress. Cleans up on unmount or when Notion disconnects.
 */
export const useNotionPolling = () => {
  const { doPull } = useNotionSyncActions();
  const notionConfig = useStore((s) => s.notionConfig);
  const notionConnected = useStore((s) => s.notionConnected);
  const allowBackgroundSync = useStore((s) => s.allowBackgroundSync);
  const syncMode = useStore((s) => s.syncMode);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const doPullRef = useRef(doPull);
  doPullRef.current = doPull;

  useEffect(() => {
    if (!notionConfig || !notionConnected || !allowBackgroundSync || syncMode === 'pause' || (syncMode !== 'pull' && syncMode !== 'bidirectional')) return;

    const runCheck = async () => {
      const state = useStore.getState();
      if (state.syncInProgress || !state.allowBackgroundSync || state.syncMode === 'pause' || (state.syncMode !== 'pull' && state.syncMode !== 'bidirectional')) return;
      try {
        const proxy = getEffectiveProxy(state.notionCorsProxy);
        const { hasUpdates } = await checkForNotionUpdates(
          state.notionConfig!,
          state.lastSyncTime,
          proxy
        );
        if (hasUpdates) {
          useStore.getState().setNotionHasRemoteUpdates(true);
          const current = useStore.getState();
          if (
            (current.syncMode === 'pull' || current.syncMode === 'bidirectional') &&
            current.dirtyNodeIds.size === 0 &&
            Object.keys(current.deletedNotionTombstones).length === 0
          ) {
            doPullRef.current();
          }
        }
      } catch {
        // Ignore errors (e.g. network)
      }
    };

    const intervalId = setInterval(runCheck, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [notionConfig, notionConnected, allowBackgroundSync, syncMode, notionCorsProxy]);
};
