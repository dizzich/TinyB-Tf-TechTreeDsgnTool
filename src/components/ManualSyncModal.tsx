import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Hand,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  pullFromNotion,
  pushToNotion,
  bidirectionalSync,
  computeSyncDiffs,
  pushNodePropertyToNotion,
  DIFF_FIELD_LABELS,
} from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';
import { SyncDiffItem, SyncConflict, TechNode } from '../types';

function conflictsToDiffs(conflicts: SyncConflict[], nodes: TechNode[]): SyncDiffItem[] {
  return conflicts.map((c) => {
    const node = nodes.find((n) => n.id === c.nodeId);
    return {
      nodeId: c.nodeId,
      nodeLabel: node?.data?.label || c.nodeId,
      notionPageId: node?.data?.notionPageId,
      field: c.field,
      fieldLabel: DIFF_FIELD_LABELS[c.field] ?? c.field,
      localValue: c.localValue,
      remoteValue: c.remoteValue,
      kind: 'both' as const,
    };
  });
}

const formatValue = (v: unknown): string => {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export const ManualSyncModal = () => {
  const isOpen = useStore((s) => s.modals.manualSync);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const manualSyncMode = useStore((s) => s.manualSyncMode);
  const manualSyncConflicts = useStore((s) => s.manualSyncConflicts);
  const notionConfig = useStore((s) => s.notionConfig);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const replaceNodesAndEdgesForSync = useStore((s) => s.replaceNodesAndEdgesForSync);
  const applyRemoteFieldToGraph = useStore((s) => s.applyRemoteFieldToGraph);
  const addNode = useStore((s) => s.addNode);
  const setSyncInProgress = useStore((s) => s.setSyncInProgress);
  const setLastSyncTime = useStore((s) => s.setLastSyncTime);
  const setNotionHasRemoteUpdates = useStore((s) => s.setNotionHasRemoteUpdates);
  const clearDirtyNodes = useStore((s) => s.clearDirtyNodes);
  const setNotionDirty = useStore((s) => s.setNotionDirty);
  const settings = useStore((s) => s.settings);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<SyncDiffItem[]>([]);
  const [remoteNodes, setRemoteNodes] = useState<TechNode[]>([]);
  const [remoteEdges, setRemoteEdges] = useState<typeof edges>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const getEffectiveProxy = (): string | undefined => {
    if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
    if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
    if (import.meta.env.DEV) return NOTION_BUILTIN_PROXY;
    return undefined;
  };

  useEffect(() => {
    if (!isOpen) return;
    if (manualSyncMode === 'conflicts' && manualSyncConflicts.length > 0) {
      setLoading(false);
      setError(null);
      const computed = conflictsToDiffs(manualSyncConflicts, nodes);
      setDiffs(computed);
      setExpandedNodes(new Set(computed.map((d) => d.nodeId)));
      return;
    }
    if (!notionConfig) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { nodes: remNodes, edges: remEdges } = await pullFromNotion(
          notionConfig,
          getEffectiveProxy()
        );
        setRemoteNodes(remNodes);
        setRemoteEdges(remEdges);
        const computed = computeSyncDiffs(nodes, remNodes, notionConfig.columnMapping);
        setDiffs(computed);
        setExpandedNodes(new Set(computed.map((d) => d.nodeId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, notionConfig, nodes, manualSyncMode, manualSyncConflicts]);

  const diffsByNode = useMemo(() => {
    const m = new Map<string, SyncDiffItem[]>();
    for (const d of diffs) {
      const key = d.nodeId;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return m;
  }, [diffs]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handlePullToGraph = async (d: SyncDiffItem) => {
    if (!d.notionPageId && d.kind !== 'remoteOnly') return;
    setApplyingId(`${d.nodeId}:${d.field}`);
    try {
      if (d.kind === 'remoteOnly' && d.remoteValue && typeof d.remoteValue === 'object' && 'id' in (d.remoteValue as object)) {
        addNode(d.remoteValue as TechNode);
      } else {
        applyRemoteFieldToGraph(d.nodeId, d.field, d.remoteValue);
      }
      setDiffs((prev) => prev.filter((x) => !(x.nodeId === d.nodeId && x.field === d.field && x.kind === d.kind)));
    } finally {
      setApplyingId(null);
    }
  };

  const handlePushToNotion = async (d: SyncDiffItem) => {
    if (!notionConfig || !d.notionPageId) return;
    if (d.kind === 'localOnly') {
      setApplyingId(`${d.nodeId}:_node`);
      try {
        const localNode = nodes.find((n) => n.id === d.nodeId);
        if (localNode) {
          const result = await pushToNotion(
            nodes,
            edges,
            notionConfig,
            getEffectiveProxy(),
            undefined,
            new Set([d.nodeId])
          );
          if (result.errors.length === 0) {
            setDiffs((prev) => prev.filter((x) => !(x.nodeId === d.nodeId && x.field === '_node')));
          } else {
            setError(result.errors[0]);
          }
        }
      } finally {
        setApplyingId(null);
      }
      return;
    }
    setApplyingId(`${d.nodeId}:${d.field}`);
    try {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const localNode = nodes.find((n) => n.id === d.nodeId);
      await pushNodePropertyToNotion(
        d.notionPageId,
        d.field,
        d.localValue,
        notionConfig,
        getEffectiveProxy(),
        localNode,
        nodeMap,
        edges
      );
      setDiffs((prev) => prev.filter((x) => !(x.nodeId === d.nodeId && x.field === d.field)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplyingId(null);
    }
  };

  const handlePullAllForNode = (nodeId: string) => {
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    for (const d of nodeDiffs) {
      if (d.kind === 'remoteOnly' && d.remoteValue && typeof d.remoteValue === 'object' && 'id' in (d.remoteValue as object)) {
        addNode(d.remoteValue as TechNode);
      } else if (d.kind === 'both' && d.remoteValue !== undefined && d.field !== '_node') {
        applyRemoteFieldToGraph(d.nodeId, d.field, d.remoteValue);
      }
    }
    setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
  };

  const handlePushAllForNode = async (nodeId: string) => {
    if (!notionConfig) return;
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    const localNode = nodes.find((n) => n.id === nodeId);
    const isLocalOnly = nodeDiffs.some((d) => d.kind === 'localOnly');
    if (isLocalOnly && localNode) {
      setApplyingId(`${nodeId}:_push_all`);
      try {
        await pushToNotion(nodes, edges, notionConfig, getEffectiveProxy(), undefined, new Set([nodeId]));
        setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
      } finally {
        setApplyingId(null);
      }
      return;
    }
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const d of nodeDiffs) {
      if (d.kind === 'both' && d.notionPageId && d.localValue !== undefined) {
        setApplyingId(`${d.nodeId}:${d.field}`);
        try {
          await pushNodePropertyToNotion(
            d.notionPageId,
            d.field,
            d.localValue,
            notionConfig,
            getEffectiveProxy(),
            localNode,
            nodeMap,
            edges
          );
        } finally {
          setApplyingId(null);
        }
      }
    }
    setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
  };

  const handlePullAll = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    try {
      const hasPositions = remoteNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
      const toSet = hasPositions
        ? { nodes: remoteNodes, edges: remoteEdges }
        : getLayoutedElements(remoteNodes, remoteEdges, settings.layoutDirection);
      replaceNodesAndEdgesForSync(toSet.nodes, toSet.edges, undefined, false);
      setLastSyncTime(new Date().toISOString());
      setNotionHasRemoteUpdates(false);
      setModalOpen('manualSync', false);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handlePushAll = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    try {
      await pushToNotion(nodes, edges, notionConfig, getEffectiveProxy());
      setNotionDirty(false);
      clearDirtyNodes();
      setLastSyncTime(new Date().toISOString());
      setModalOpen('manualSync', false);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleBidirectional = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    try {
      const lastSyncTime = useStore.getState().lastSyncTime;
      const { mergedNodes, mergedEdges, notionFieldColors } = await bidirectionalSync(
        nodes,
        edges,
        notionConfig,
        getEffectiveProxy(),
        lastSyncTime
      );
      const hasPositions = mergedNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
      const toSet = hasPositions
        ? { nodes: mergedNodes, edges: mergedEdges }
        : getLayoutedElements(mergedNodes, mergedEdges, settings.layoutDirection);
      replaceNodesAndEdgesForSync(toSet.nodes, toSet.edges, notionFieldColors, false);
      setLastSyncTime(new Date().toISOString());
      setNotionHasRemoteUpdates(false);
      clearDirtyNodes();
      setModalOpen('manualSync', false);
    } finally {
      setSyncInProgress(false);
    }
  };

  if (!isOpen) return null;

  const title = manualSyncMode === 'conflicts' ? 'Разрешение конфликтов' : 'Ручная синхронизация';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-[700px] max-h-[85vh] flex flex-col">
        <div className="modal__header p-4 border-b border-panel-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Hand size={20} strokeWidth={1.75} />
            {title}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen('manualSync', false)}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__content flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-accent mr-3" strokeWidth={1.75} />
              <span className="text-muted">Загрузка отличий...</span>
            </div>
          )}

          {error && (
            <div className="rounded-control p-3 text-sm text-danger bg-danger/15 border border-danger/45 mb-4">
              {error}
            </div>
          )}

          {!loading && diffs.length === 0 && !error && (
            <div className="text-center py-12 text-muted">
              Отличий между графом и Notion нет.
            </div>
          )}

          {!loading && diffs.length > 0 && (
            <div className="space-y-3">
              {Array.from(diffsByNode.entries()).map(([nodeId, nodeDiffs]) => {
                const first = nodeDiffs[0];
                const label = first?.nodeLabel || nodeId;
                const isExpanded = expandedNodes.has(nodeId) || expandedNodes.size === 0;
                return (
                  <div
                    key={nodeId}
                    className="border border-control-border rounded-control overflow-hidden bg-control-bg-muted"
                  >
                    <button
                      type="button"
                      onClick={() => toggleNode(nodeId)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text hover:bg-control-hover-bg"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} strokeWidth={1.75} />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.75} />
                      )}
                      <span>{label}</span>
                      <span className="text-xs text-muted">({nodeDiffs.length} отл.)</span>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePullAllForNode(nodeId);
                          }}
                          className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          Взять всё из Notion
                        </button>
                        {first?.notionPageId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePushAllForNode(nodeId);
                            }}
                            disabled={!!applyingId}
                            className="text-xs px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                          >
                            Залить всё в Notion
                          </button>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-control-border divide-y divide-control-border">
                        {nodeDiffs.map((d) => (
                          <div
                            key={`${d.nodeId}-${d.field}`}
                            className="px-4 py-2 flex items-center gap-3 text-sm bg-modal-bg"
                          >
                            <span className="font-medium text-muted w-28 shrink-0">{d.fieldLabel}</span>
                            <span className="truncate flex-1 text-text" title={formatValue(d.localValue)}>
                              {formatValue(d.localValue)}
                            </span>
                            <span className="text-muted">→</span>
                            <span className="truncate flex-1 text-text" title={formatValue(d.remoteValue)}>
                              {formatValue(d.remoteValue)}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              {d.kind === 'remoteOnly' ? (
                                <button
                                  type="button"
                                  onClick={() => handlePullToGraph(d)}
                                  disabled={!!applyingId}
                                  className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                                >
                                  Добавить в граф
                                </button>
                              ) : d.kind === 'localOnly' ? (
                                <button
                                  type="button"
                                  onClick={() => handlePushToNotion(d)}
                                  disabled={!!applyingId}
                                  className="px-2 py-1 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                                >
                                  Добавить в Notion
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePullToGraph(d)}
                                    disabled={!!applyingId}
                                    className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                                  >
                                    В граф
                                  </button>
                                  {d.notionPageId && (
                                    <button
                                      type="button"
                                      onClick={() => handlePushToNotion(d)}
                                      disabled={!!applyingId}
                                      className="px-2 py-1 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                                    >
                                      В Notion
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && diffs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-panel-border flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePullAll}
                disabled={!!applyingId || manualSyncMode === 'conflicts'}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                title={manualSyncMode === 'conflicts' ? 'В режиме конфликтов разрешайте каждый пункт вручную' : undefined}
              >
                <Download size={16} strokeWidth={1.75} />
                Взять всё из Notion
              </button>
              <button
                type="button"
                onClick={handlePushAll}
                disabled={!!applyingId}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
              >
                <Upload size={16} strokeWidth={1.75} />
                Залить всё в Notion
              </button>
              <button
                type="button"
                onClick={handleBidirectional}
                disabled={!!applyingId}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-control-bg border border-control-border text-text hover:bg-control-hover-bg disabled:opacity-50"
              >
                <RefreshCw size={16} strokeWidth={1.75} />
                Объединить (новее побеждает)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
