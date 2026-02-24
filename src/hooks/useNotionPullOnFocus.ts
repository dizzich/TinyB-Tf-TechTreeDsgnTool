import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { checkForNotionUpdates, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { useNotionSyncActions } from './useNotionSyncActions';

const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return NOTION_BUILTIN_PROXY;
};

/**
 * When the window regains focus and Notion is connected, check for remote updates.
 * - If no local dirty nodes → auto-pull (safe to apply remote changes)
 * - If local dirty nodes exist → just set the flag, don't overwrite
 */
export const useNotionPullOnFocus = () => {
  const { doPull } = useNotionSyncActions();
  const notionConfig = useStore((s) => s.notionConfig);
  const notionConnected = useStore((s) => s.notionConnected);
  const allowBackgroundSync = useStore((s) => s.allowBackgroundSync);
  const syncMode = useStore((s) => s.syncMode);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const doPullRef = useRef(doPull);
  doPullRef.current = doPull;

  useEffect(() => {
    const handler = async () => {
      const state = useStore.getState();
      if (
        !state.notionConfig ||
        !state.notionConnected ||
        !state.allowBackgroundSync ||
        state.syncMode === 'pause' ||
        (state.syncMode !== 'pull' && state.syncMode !== 'bidirectional') ||
        state.syncInProgress
      )
        return;
      try {
        const proxy = getEffectiveProxy(state.notionCorsProxy);
        const { hasUpdates } = await checkForNotionUpdates(
          state.notionConfig,
          state.lastSyncTime,
          proxy
        );
        if (hasUpdates) {
          useStore.getState().setNotionHasRemoteUpdates(true);
          // Auto-pull only if notionSourceOfTruth is enabled and no local dirty nodes
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
        // Ignore errors (e.g. network) to avoid spamming
      }
    };

    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [notionConfig, notionConnected, allowBackgroundSync, syncMode, notionCorsProxy]);
};
