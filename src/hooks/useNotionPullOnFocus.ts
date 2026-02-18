import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { checkForNotionUpdates, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { useNotionSyncActions } from './useNotionSyncActions';

const getEffectiveProxy = (notionCorsProxy: string): string | undefined => {
  if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
  if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
  return import.meta.env.DEV ? NOTION_BUILTIN_PROXY : undefined;
};

/**
 * When the window regains focus and Notion is connected, check for remote updates
 * and pull them into the graph so changes made in Notion appear without reload.
 */
export const useNotionPullOnFocus = () => {
  const { doPull } = useNotionSyncActions();
  const notionConfig = useStore((s) => s.notionConfig);
  const notionConnected = useStore((s) => s.notionConnected);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const doPullRef = useRef(doPull);
  doPullRef.current = doPull;

  useEffect(() => {
    const handler = async () => {
      const state = useStore.getState();
      if (
        !state.notionConfig ||
        !state.notionConnected ||
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
          doPullRef.current();
        }
      } catch {
        // Ignore errors (e.g. network) to avoid spamming
      }
    };

    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [notionConfig, notionConnected, notionCorsProxy]);
};
