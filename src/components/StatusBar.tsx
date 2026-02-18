import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';

export const StatusBar = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const notionConfig = useStore((s) => s.notionConfig);
  const notionDirty = useStore((s) => s.notionDirty);
  const notionHasRemoteUpdates = useStore((s) => s.notionHasRemoteUpdates);
  const syncInProgress = useStore((s) => s.syncInProgress);
  const syncProgress = useStore((s) => s.syncProgress);
  const lastSyncError = useStore((s) => s.lastSyncError);

  const reactFlow = useReactFlow();
  const zoom = reactFlow.getZoom();
  const selectedCount = nodes.filter((n) => n.selected).length;

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1.5 text-xs text-status-text bg-status-bg border-t border-status-border shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span>{nodes.length} nodes</span>
        <span className="text-panel-border">|</span>
        <span>{edges.length} edges</span>
        {selectedCount > 0 && (
          <>
            <span className="text-panel-border">|</span>
            <span className="text-accent">{selectedCount} selected</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {notionConfig && (
          <>
            <span
              className={
                syncInProgress
                  ? 'text-muted'
                  : lastSyncError
                    ? 'text-amber-400'
                    : notionDirty
                      ? 'text-amber-400'
                      : notionHasRemoteUpdates
                        ? 'text-accent'
                        : 'text-emerald-400'
              }
            >
              {syncInProgress
                ? syncProgress
                  ? `Синхронизация ${syncProgress.current}/${syncProgress.total}`
                  : 'Синхронизация...'
                : lastSyncError
                  ? 'Ошибка синхронизации'
                  : notionDirty
                    ? 'Несохранено'
                    : notionHasRemoteUpdates
                      ? 'Обновления в Notion'
                      : 'Синхронизировано'}
            </span>
          </>
        )}
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
