import { useState, useEffect, useMemo, useRef } from 'react';
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
  computeSyncDiffs,
  pushNodePropertyToNotion,
  DIFF_FIELD_LABELS,
  NOTION_BUILTIN_PROXY,
} from '../utils/notionApi';
import { NotionIcon } from './NotionIcon';
import { getNotionPageUrl } from '../utils/notionUrl';
import { SyncDiffItem, SyncConflict, TechNode, NotionColumnMapping } from '../types';

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
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

type DiffFreshness = 'local' | 'remote' | 'unknown';
type BatchAction = 'pull' | 'push' | 'merge';

interface BatchSummary {
  action: BatchAction;
  selected: number;
  success: number;
  failed: number;
  skippedUnknown: number;
  errors: string[];
}

interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}

const TriStateCheckbox = ({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
}: TriStateCheckboxProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
    />
  );
};

const getDiffKey = (d: SyncDiffItem): string => `${d.nodeId}::${d.field}::${d.kind}`;

const parseIsoMs = (iso?: string): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const maxIsoMs = (values: Array<string | undefined>): number | null => {
  let max: number | null = null;
  for (const value of values) {
    const ms = parseIsoMs(value);
    if (ms == null) continue;
    max = max == null ? ms : Math.max(max, ms);
  }
  return max;
};

const maxIsoValue = (values: Array<string | undefined>): string | undefined => {
  let selectedIso: string | undefined;
  let selectedMs: number | null = null;
  for (const value of values) {
    const ms = parseIsoMs(value);
    if (ms == null) continue;
    if (selectedMs == null || ms > selectedMs) {
      selectedMs = ms;
      selectedIso = value;
    }
  }
  return selectedIso;
};

const formatDisplayTimestamp = (iso?: string): string => {
  const ms = parseIsoMs(iso);
  if (ms == null) return 'неизвестно';
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ms));
  return formatted.replace(',', '');
};

const getNotionAttributeForField = (
  field: string,
  columnMapping?: NotionColumnMapping
): string => {
  if (field === '_node') return 'страница целиком';
  if (!columnMapping) return 'не сопоставлено';

  const keyMap: Record<string, keyof NotionColumnMapping> = {
    position: 'editorPosition',
    label: 'workingName',
    techForAct: 'act',
    stage: 'stage',
    category: 'category',
    incomingLinks: 'prevTechs',
    outgoingLinks: 'nextTechs',
    powerType: 'powerType',
    gameStatus: 'gameStatus',
    designStatus: 'designStatus',
    notionSyncStatus: 'notionSyncStatus',
    openCondition: 'openCondition',
  };

  const mappingKey = keyMap[field];
  if (!mappingKey) return 'не сопоставлено';
  return columnMapping[mappingKey] || 'не сопоставлено';
};

const freshnessMeta: Record<
  DiffFreshness,
  { label: string; badgeClass: string; dotClass: string }
> = {
  local: {
    label: 'Новее: граф',
    badgeClass: 'bg-accent/15 text-accent',
    dotClass: 'bg-accent',
  },
  remote: {
    label: 'Новее: Notion',
    badgeClass: 'bg-emerald-500/15 text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  unknown: {
    label: 'Новее: неизвестно',
    badgeClass: 'bg-control-bg text-muted',
    dotClass: 'bg-muted',
  },
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
  const setEdges = useStore((s) => s.setEdges);
  const applyRemoteFieldToGraph = useStore((s) => s.applyRemoteFieldToGraph);
  const addNode = useStore((s) => s.addNode);

  const [loading, setLoading] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState<string>('Инициализация');
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<SyncDiffItem[]>([]);
  const [remoteNodes, setRemoteNodes] = useState<TechNode[]>([]);
  const [remoteEdges, setRemoteEdges] = useState<typeof edges>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [selectedDiffKeys, setSelectedDiffKeys] = useState<Set<string>>(new Set());
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);

  const getEffectiveProxy = (): string | undefined => {
    if (notionCorsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
    if (notionCorsProxy?.trim()) return notionCorsProxy.trim();
    if (import.meta.env.DEV) return NOTION_BUILTIN_PROXY;
    return undefined;
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDiffKeys(new Set());
    setBatchSummary(null);
  }, [isOpen, manualSyncMode]);

  useEffect(() => {
    if (!isOpen) return;

    if (manualSyncMode === 'conflicts' && manualSyncConflicts.length > 0) {
      setLoadingInfo('режим конфликтов');
      setLoading(false);
      setError(null);
      setRemoteNodes([]);
      setRemoteEdges([]);
      const computed = conflictsToDiffs(manualSyncConflicts, nodes);
      setDiffs(computed);
      setExpandedNodes(new Set(computed.map((d) => d.nodeId)));
      setSelectedDiffKeys(new Set());
      setBatchSummary(null);
      return;
    }

    if (!notionConfig) {
      setLoading(false);
      setDiffs([]);
      setRemoteNodes([]);
      setRemoteEdges([]);
      return;
    }

    setLoading(true);
    setLoadingInfo('шаг 1/2: загрузка данных из Notion');
    setError(null);
    (async () => {
      try {
        const { nodes: remNodes, edges: remEdges } = await pullFromNotion(
          notionConfig,
          getEffectiveProxy()
        );
        setLoadingInfo(`шаг 2/2: сравнение (${nodes.length} локальных / ${remNodes.length} из Notion)`);
        setRemoteNodes(remNodes);
        setRemoteEdges(remEdges);
        const computed = computeSyncDiffs(
          nodes,
          remNodes,
          notionConfig.columnMapping,
          edges,
          remEdges
        );
        setDiffs(computed);
        setExpandedNodes(new Set(computed.map((d) => d.nodeId)));
        setSelectedDiffKeys(new Set());
        setBatchSummary(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, notionConfig, manualSyncMode, manualSyncConflicts]);

  useEffect(() => {
    setSelectedDiffKeys((prev) => {
      if (prev.size === 0) return prev;
      const validKeys = new Set(diffs.map(getDiffKey));
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [diffs]);

  const diffsByNode = useMemo(() => {
    const m = new Map<string, SyncDiffItem[]>();
    for (const d of diffs) {
      const key = d.nodeId;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return m;
  }, [diffs]);

  const localNodesById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const localNodesByPageId = useMemo(
    () =>
      new Map(
        nodes
          .filter((n) => n.data.notionPageId)
          .map((n) => [n.data.notionPageId!, n])
      ),
    [nodes]
  );

  const localNodesByTechCraftId = useMemo(
    () =>
      new Map(
        nodes
          .filter((n) => n.data.techCraftId)
          .map((n) => [n.data.techCraftId!, n])
      ),
    [nodes]
  );

  const remoteNodesByPageId = useMemo(
    () =>
      new Map(
        remoteNodes
          .filter((n) => n.data.notionPageId)
          .map((n) => [n.data.notionPageId!, n])
      ),
    [remoteNodes]
  );

  const remoteNodeIdToLocalNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const remoteNode of remoteNodes) {
      const localNode = remoteNode.data.notionPageId
        ? localNodesByPageId.get(remoteNode.data.notionPageId)
        : remoteNode.data.techCraftId
          ? localNodesByTechCraftId.get(remoteNode.data.techCraftId)
          : undefined;
      if (localNode) {
        map.set(remoteNode.id, localNode.id);
      }
    }
    return map;
  }, [remoteNodes, localNodesByPageId, localNodesByTechCraftId]);

  const remoteNodesByTechCraftId = useMemo(
    () =>
      new Map(
        remoteNodes
          .filter((n) => n.data.techCraftId)
          .map((n) => [n.data.techCraftId!, n])
      ),
    [remoteNodes]
  );

  const isSelected = (d: SyncDiffItem): boolean => selectedDiffKeys.has(getDiffKey(d));

  const toggleDiff = (d: SyncDiffItem) => {
    const key = getDiffKey(d);
    setSelectedDiffKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setNodeSelected = (nodeId: string, checked: boolean) => {
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    setSelectedDiffKeys((prev) => {
      const next = new Set(prev);
      for (const d of nodeDiffs) {
        const key = getDiffKey(d);
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const toggleNode = (nodeId: string) => {
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    const allSelected = nodeDiffs.length > 0 && nodeDiffs.every((d) => selectedDiffKeys.has(getDiffKey(d)));
    setNodeSelected(nodeId, !allSelected);
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const openNotionPage = (pageId: string) => {
    const url = getNotionPageUrl(pageId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const resolveFreshness = (d: SyncDiffItem): DiffFreshness => {
    if (manualSyncMode === 'conflicts') return 'unknown';
    if (d.kind === 'localOnly') return 'local';
    if (d.kind === 'remoteOnly') return 'remote';

    const localNode = localNodesById.get(d.nodeId);
    if (!localNode) return 'unknown';

    const remoteNode = localNode.data.notionPageId
      ? remoteNodesByPageId.get(localNode.data.notionPageId)
      : localNode.data.techCraftId
        ? remoteNodesByTechCraftId.get(localNode.data.techCraftId)
        : undefined;

    if (!remoteNode) return 'unknown';

    const localMs =
      d.field === 'position'
        ? maxIsoMs([
            localNode.data.positionModifiedAt,
            localNode.data.localModifiedAt,
            localNode.data.updatedAt,
          ])
        : maxIsoMs([localNode.data.localModifiedAt, localNode.data.updatedAt]);

    const remoteMs = parseIsoMs(remoteNode.data.updatedAt);

    if (localMs == null || remoteMs == null) return 'unknown';
    if (Math.abs(localMs - remoteMs) <= 1000) return 'unknown';

    return localMs > remoteMs ? 'local' : 'remote';
  };

  const resolveDiffTimestamps = (
    d: SyncDiffItem
  ): { localIso?: string; remoteIso?: string } => {
    if (d.kind !== 'both') return {};

    const localNode = localNodesById.get(d.nodeId);
    if (!localNode) return {};

    const remoteNode = localNode.data.notionPageId
      ? remoteNodesByPageId.get(localNode.data.notionPageId)
      : localNode.data.techCraftId
        ? remoteNodesByTechCraftId.get(localNode.data.techCraftId)
        : undefined;

    const localIso =
      d.field === 'position'
        ? maxIsoValue([
            localNode.data.positionModifiedAt,
            localNode.data.localModifiedAt,
            localNode.data.updatedAt,
          ])
        : maxIsoValue([localNode.data.localModifiedAt, localNode.data.updatedAt]);

    return {
      localIso,
      remoteIso: remoteNode?.data.updatedAt,
    };
  };

  const createEdgeId = (source: string, target: string, existingIds: Set<string>): string => {
    let id = `${source}->${target}`;
    let suffix = 1;
    while (existingIds.has(id)) {
      id = `${source}->${target}-${suffix}`;
      suffix++;
    }
    return id;
  };

  const applyRemoteLinksToGraph = (nodeId: string, field: string) => {
    const isOutgoing = field === 'outgoingLinks';
    const isIncoming = field === 'incomingLinks';
    if (!isOutgoing && !isIncoming) return false;

    const localNode = localNodesById.get(nodeId);
    if (!localNode) throw new Error('Локальная нода не найдена для применения связей.');

    const remoteNode = localNode.data.notionPageId
      ? remoteNodesByPageId.get(localNode.data.notionPageId)
      : localNode.data.techCraftId
        ? remoteNodesByTechCraftId.get(localNode.data.techCraftId)
        : undefined;
    if (!remoteNode) {
      throw new Error('Связанная нода в Notion не найдена для применения связей.');
    }

    const currentEdges = useStore.getState().edges;
    const existingIds = new Set(currentEdges.map((e) => e.id));
    const existingByPair = new Map<string, (typeof currentEdges)[number]>();
    for (const edge of currentEdges) {
      existingByPair.set(`${edge.source}::${edge.target}`, edge);
    }

    const desiredPairs = new Set<string>();
    if (isOutgoing) {
      for (const re of remoteEdges) {
        if (re.source !== remoteNode.id) continue;
        const localTargetId = remoteNodeIdToLocalNodeId.get(re.target);
        if (!localTargetId) continue;
        desiredPairs.add(`${nodeId}::${localTargetId}`);
      }
    } else {
      for (const re of remoteEdges) {
        if (re.target !== remoteNode.id) continue;
        const localSourceId = remoteNodeIdToLocalNodeId.get(re.source);
        if (!localSourceId) continue;
        desiredPairs.add(`${localSourceId}::${nodeId}`);
      }
    }

    const preserved = currentEdges.filter((e) =>
      isOutgoing ? e.source !== nodeId : e.target !== nodeId
    );

    const patchedEdges = [...preserved];
    for (const pair of desiredPairs) {
      const existing = existingByPair.get(pair);
      if (existing) {
        patchedEdges.push(existing);
        continue;
      }
      const [source, target] = pair.split('::');
      const id = createEdgeId(source, target, existingIds);
      existingIds.add(id);
      patchedEdges.push({ id, source, target });
    }

    const deduped = patchedEdges.filter(
      (edge, i, all) =>
        i === all.findIndex((x) => x.source === edge.source && x.target === edge.target)
    );
    setEdges(deduped);
    return true;
  };

  const applyPullDiff = async (d: SyncDiffItem): Promise<void> => {
    if (d.kind === 'localOnly') {
      throw new Error('Изменение есть только в графе. В Notion нет значения для применения.');
    }

    if (
      d.kind === 'remoteOnly' &&
      d.remoteValue &&
      typeof d.remoteValue === 'object' &&
      'id' in (d.remoteValue as object)
    ) {
      addNode(d.remoteValue as TechNode);
      return;
    }

    if (d.kind === 'remoteOnly') {
      throw new Error('Не удалось добавить ноду из Notion: некорректные данные.');
    }

    if (d.field === 'incomingLinks' || d.field === 'outgoingLinks') {
      applyRemoteLinksToGraph(d.nodeId, d.field);
      return;
    }

    applyRemoteFieldToGraph(d.nodeId, d.field, d.remoteValue);
  };

  const applyPushDiff = async (d: SyncDiffItem): Promise<void> => {
    if (!notionConfig) {
      throw new Error('Notion не настроен. Откройте настройки синхронизации.');
    }

    if (d.kind === 'remoteOnly') {
      throw new Error('Изменение есть только в Notion. Нечего отправлять в Notion.');
    }

    if (d.kind === 'localOnly') {
      const result = await pushToNotion(
        nodes,
        edges,
        notionConfig,
        getEffectiveProxy(),
        undefined,
        new Set([d.nodeId])
      );
      if (result.errors.length > 0) {
        throw new Error(result.errors[0]);
      }
      return;
    }

    if (!d.notionPageId) {
      throw new Error('У ноды нет notionPageId. Нельзя обновить это поле в Notion.');
    }

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
  };

  const handlePullToGraph = async (d: SyncDiffItem) => {
    const diffKey = getDiffKey(d);
    setApplyingId(diffKey);
    setBatchSummary(null);
    setError(null);
    try {
      await applyPullDiff(d);
      setDiffs((prev) => prev.filter((x) => getDiffKey(x) !== diffKey));
      setSelectedDiffKeys((prev) => {
        if (!prev.has(diffKey)) return prev;
        const next = new Set(prev);
        next.delete(diffKey);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplyingId(null);
    }
  };

  const handlePushToNotion = async (d: SyncDiffItem) => {
    const diffKey = getDiffKey(d);
    setApplyingId(diffKey);
    setBatchSummary(null);
    setError(null);
    try {
      await applyPushDiff(d);
      setDiffs((prev) => prev.filter((x) => getDiffKey(x) !== diffKey));
      setSelectedDiffKeys((prev) => {
        if (!prev.has(diffKey)) return prev;
        const next = new Set(prev);
        next.delete(diffKey);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplyingId(null);
    }
  };

  const handlePullAllForNode = (nodeId: string) => {
    setBatchSummary(null);
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    for (const d of nodeDiffs) {
      if (
        d.kind === 'remoteOnly' &&
        d.remoteValue &&
        typeof d.remoteValue === 'object' &&
        'id' in (d.remoteValue as object)
      ) {
        addNode(d.remoteValue as TechNode);
      } else if (d.kind === 'both' && (d.field === 'incomingLinks' || d.field === 'outgoingLinks')) {
        applyRemoteLinksToGraph(d.nodeId, d.field);
      } else if (d.kind === 'both' && d.remoteValue !== undefined && d.field !== '_node') {
        applyRemoteFieldToGraph(d.nodeId, d.field, d.remoteValue);
      }
    }
    setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
    setSelectedDiffKeys((prev) => {
      const next = new Set(prev);
      for (const d of nodeDiffs) next.delete(getDiffKey(d));
      return next;
    });
  };

  const handlePushAllForNode = async (nodeId: string) => {
    if (!notionConfig) return;

    setBatchSummary(null);
    const nodeDiffs = diffsByNode.get(nodeId) || [];
    const localNode = nodes.find((n) => n.id === nodeId);
    const isLocalOnly = nodeDiffs.some((d) => d.kind === 'localOnly');

    if (isLocalOnly && localNode) {
      setApplyingId(`${nodeId}:_push_all`);
      try {
        const result = await pushToNotion(
          nodes,
          edges,
          notionConfig,
          getEffectiveProxy(),
          undefined,
          new Set([nodeId])
        );
        if (result.errors.length > 0) {
          setError(result.errors[0]);
          return;
        }
        setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
        setSelectedDiffKeys((prev) => {
          const next = new Set(prev);
          for (const d of nodeDiffs) next.delete(getDiffKey(d));
          return next;
        });
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
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return;
        } finally {
          setApplyingId(null);
        }
      }
    }

    setDiffs((prev) => prev.filter((x) => x.nodeId !== nodeId));
    setSelectedDiffKeys((prev) => {
      const next = new Set(prev);
      for (const d of nodeDiffs) next.delete(getDiffKey(d));
      return next;
    });
  };

  const runSelectedBatch = async (action: BatchAction) => {
    const selected = diffs.filter((d) => selectedDiffKeys.has(getDiffKey(d)));
    if (selected.length === 0) return;

    setBatchSummary(null);
    setError(null);

    const successKeys = new Set<string>();
    const errors: string[] = [];
    let success = 0;
    let failed = 0;
    let skippedUnknown = 0;

    for (const d of selected) {
      const key = getDiffKey(d);
      setApplyingId(key);
      try {
        if (action === 'pull') {
          await applyPullDiff(d);
          successKeys.add(key);
          success++;
        } else if (action === 'push') {
          await applyPushDiff(d);
          successKeys.add(key);
          success++;
        } else {
          const freshness = resolveFreshness(d);
          if (freshness === 'unknown') {
            skippedUnknown++;
            continue;
          }

          if (freshness === 'remote') {
            await applyPullDiff(d);
          } else {
            await applyPushDiff(d);
          }

          successKeys.add(key);
          success++;
        }
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${d.nodeLabel} / ${d.fieldLabel}: ${msg}`);
      } finally {
        setApplyingId(null);
      }
    }

    if (successKeys.size > 0) {
      setDiffs((prev) => prev.filter((d) => !successKeys.has(getDiffKey(d))));
      setSelectedDiffKeys((prev) => {
        const next = new Set(prev);
        successKeys.forEach((key) => next.delete(key));
        return next;
      });
    }

    setBatchSummary({
      action,
      selected: selected.length,
      success,
      failed,
      skippedUnknown,
      errors,
    });
  };

  const areAllDiffsSelected =
    diffs.length > 0 && diffs.every((d) => selectedDiffKeys.has(getDiffKey(d)));
  const allNodeIds = Array.from(diffsByNode.keys());
  const allExpanded = allNodeIds.length > 0 && allNodeIds.every((id) => expandedNodes.has(id));

  if (!isOpen) return null;

  const title = manualSyncMode === 'conflicts' ? 'Разрешение конфликтов' : 'Ручная синхронизация';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-[760px] max-h-[85vh] flex flex-col">
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
              <span className="text-muted">
                Загрузка отличий... <span className="text-text">"{loadingInfo}"</span>
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-control p-3 text-sm text-danger bg-danger/15 border border-danger/45 mb-4">
              {error}
            </div>
          )}

          {batchSummary && (
            <div
              className={`rounded-control p-3 text-sm mb-4 border ${
                batchSummary.failed > 0 || batchSummary.skippedUnknown > 0
                  ? 'text-amber-300 bg-amber-500/10 border-amber-500/40'
                  : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40'
              }`}
            >
              <div>
                {batchSummary.action === 'pull'
                  ? 'Взять выбранное из Notion'
                  : batchSummary.action === 'push'
                    ? 'Залить выбранное в Notion'
                    : 'Объединить выбранное'}
                : выбрано {batchSummary.selected}, успешно {batchSummary.success}, ошибок {batchSummary.failed}
                , пропущено (неизвестно) {batchSummary.skippedUnknown}.
              </div>
              {batchSummary.errors.length > 0 && (
                <div className="mt-2 text-xs text-amber-200">
                  {batchSummary.errors.slice(0, 3).join(' | ')}
                  {batchSummary.errors.length > 3
                    ? ` | +${batchSummary.errors.length - 3} ещё`
                    : ''}
                </div>
              )}
            </div>
          )}

          {!loading && diffs.length === 0 && !error && (
            <div className="text-center py-12 text-muted">
              Отличий между графом и Notion нет.
            </div>
          )}

          {!loading && diffs.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedNodes(
                      allExpanded ? new Set<string>() : new Set<string>(allNodeIds)
                    )
                  }
                  disabled={allNodeIds.length === 0}
                  className="px-3 py-1.5 text-xs rounded-control bg-control-bg border border-control-border text-text hover:bg-control-hover-bg disabled:opacity-50"
                >
                  {allExpanded ? 'Свернуть всё' : 'Развернуть всё'}
                </button>
              </div>

              {Array.from(diffsByNode.entries()).map(([nodeId, nodeDiffs]) => {
                const first = nodeDiffs[0];
                const label = first?.nodeLabel || nodeId;
                const notionPageId = first?.notionPageId;
                const isExpanded = expandedNodes.has(nodeId);
                const selectedInNode = nodeDiffs.filter((d) => isSelected(d)).length;
                const allInNodeSelected = nodeDiffs.length > 0 && selectedInNode === nodeDiffs.length;
                const nodePartiallySelected = selectedInNode > 0 && selectedInNode < nodeDiffs.length;
                const freshnessCounts = nodeDiffs.reduce<Record<DiffFreshness, number>>(
                  (acc, d) => {
                    const f = resolveFreshness(d);
                    acc[f] += 1;
                    return acc;
                  },
                  { local: 0, remote: 0, unknown: 0 }
                );
                const freshnessOrder: DiffFreshness[] = ['local', 'remote', 'unknown'];

                return (
                  <div
                    key={nodeId}
                    className="border border-control-border rounded-control overflow-hidden bg-control-bg-muted"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleNodeExpanded(nodeId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleNodeExpanded(nodeId);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text hover:bg-control-hover-bg"
                    >
                      <span
                        className="inline-flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TriStateCheckbox
                          checked={allInNodeSelected}
                          indeterminate={nodePartiallySelected}
                          disabled={!!applyingId}
                          ariaLabel={`Выбрать все изменения ноды ${label}`}
                          onChange={() => toggleNode(nodeId)}
                        />
                      </span>

                      {isExpanded ? (
                        <ChevronDown size={16} strokeWidth={1.75} />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.75} />
                      )}
                      {notionPageId && (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-small hover:bg-control-hover-bg cursor-pointer"
                          title="Открыть страницу в Notion"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNotionPage(notionPageId);
                          }}
                        >
                          <NotionIcon size={14} className="text-accent" />
                        </span>
                      )}
                      <span>{label}</span>
                      <span className="text-xs text-muted">({nodeDiffs.length} отл., выбрано {selectedInNode})</span>
                      <div className="flex items-center gap-1">
                        {freshnessOrder.map((f) => {
                          const count = freshnessCounts[f];
                          if (count === 0) return null;
                          const style = freshnessMeta[f];
                          return (
                            <span
                              key={`${nodeId}-fresh-${f}`}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-small text-[11px] ${style.badgeClass}`}
                              title={style.label}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} />
                              {style.label} {count}
                            </span>
                          );
                        })}
                      </div>

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
                              void handlePushAllForNode(nodeId);
                            }}
                            disabled={!!applyingId}
                            className="text-xs px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                          >
                            Залить всё в Notion
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-control-border divide-y divide-control-border">
                        {nodeDiffs.map((d) => {
                          const notionAttr = getNotionAttributeForField(
                            d.field,
                            notionConfig?.columnMapping
                          );
                          const freshness = resolveFreshness(d);
                          const diffTimestamps = resolveDiffTimestamps(d);
                          const arrow =
                            freshness === 'local'
                              ? '\u2192'
                              : freshness === 'remote'
                                ? '\u2190'
                                : '\u2194';
                          const notionTone =
                            freshness === 'local'
                              ? 'bg-orange-500/10'
                              : freshness === 'remote'
                                ? 'bg-emerald-500/10'
                                : '';
                          const graphTone =
                            freshness === 'remote'
                              ? 'bg-orange-500/10'
                              : freshness === 'local'
                                ? 'bg-emerald-500/10'
                                : '';

                          return (
                            <div
                              key={getDiffKey(d)}
                              className="px-4 py-2 flex items-start gap-3 text-sm bg-modal-bg"
                            >
                              <div className="pt-1">
                                <TriStateCheckbox
                                  checked={isSelected(d)}
                                  disabled={!!applyingId}
                                  ariaLabel={`Выбрать изменение ${d.fieldLabel} для ноды ${d.nodeLabel}`}
                                  onChange={() => toggleDiff(d)}
                                />
                              </div>

                              <div className="w-64 shrink-0">
                                <div className="font-medium text-muted leading-tight">
                                  {d.fieldLabel} <span className="text-xs text-muted/80">("{notionAttr}")</span>
                                </div>
                              </div>

                              <div className={`min-w-0 flex-1 rounded-small px-2 py-1 ${notionTone}`}>
                                <div className="text-[11px] text-muted mb-0.5">Notion</div>
                                {d.kind === 'both' && (
                                  <div className="text-[10px] text-muted/80 mb-1">
                                    Изменено: {formatDisplayTimestamp(diffTimestamps.remoteIso)}
                                  </div>
                                )}
                                <div
                                  className="whitespace-pre-wrap break-words leading-snug text-text"
                                  title={formatValue(d.remoteValue)}
                                >
                                  {formatValue(d.remoteValue)}
                                </div>
                              </div>
                              <span className="text-muted mt-4">{arrow}</span>
                              <div className={`min-w-0 flex-1 rounded-small px-2 py-1 ${graphTone}`}>
                                <div className="text-[11px] text-muted mb-0.5">Граф</div>
                                {d.kind === 'both' && (
                                  <div className="text-[10px] text-muted/80 mb-1">
                                    Изменено: {formatDisplayTimestamp(diffTimestamps.localIso)}
                                  </div>
                                )}
                                <div
                                  className="whitespace-pre-wrap break-words leading-snug text-text"
                                  title={formatValue(d.localValue)}
                                >
                                  {formatValue(d.localValue)}
                                </div>
                              </div>

                              <div className="flex gap-1 shrink-0">
                                {d.kind === 'remoteOnly' ? (
                                  <button
                                    type="button"
                                    onClick={() => void handlePullToGraph(d)}
                                    disabled={!!applyingId}
                                    className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                                  >
                                    Добавить в граф
                                  </button>
                                ) : d.kind === 'localOnly' ? (
                                  <button
                                    type="button"
                                    onClick={() => void handlePushToNotion(d)}
                                    disabled={!!applyingId}
                                    className="px-2 py-1 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                                  >
                                    Добавить в Notion
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void handlePullToGraph(d)}
                                      disabled={!!applyingId}
                                      className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                                    >
                                      В граф
                                    </button>
                                    {d.notionPageId && (
                                      <button
                                        type="button"
                                        onClick={() => void handlePushToNotion(d)}
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && diffs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-panel-border flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted mr-2">Выбрано изменений: {selectedDiffKeys.size}</span>

              <button
                type="button"
                onClick={() => setSelectedDiffKeys(new Set(diffs.map(getDiffKey)))}
                disabled={!!applyingId || areAllDiffsSelected}
                className="px-3 py-1.5 text-xs rounded-control bg-control-bg border border-control-border text-text hover:bg-control-hover-bg disabled:opacity-50"
              >
                Выбрать всё
              </button>

              <button
                type="button"
                onClick={() => setSelectedDiffKeys(new Set())}
                disabled={!!applyingId || selectedDiffKeys.size === 0}
                className="px-3 py-1.5 text-xs rounded-control bg-control-bg border border-control-border text-text hover:bg-control-hover-bg disabled:opacity-50"
              >
                Снять выделение
              </button>

              <button
                type="button"
                onClick={() => void runSelectedBatch('pull')}
                disabled={!!applyingId || selectedDiffKeys.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
              >
                <Download size={16} strokeWidth={1.75} />
                Взять выбранное из Notion
              </button>

              <button
                type="button"
                onClick={() => void runSelectedBatch('push')}
                disabled={!!applyingId || selectedDiffKeys.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
              >
                <Upload size={16} strokeWidth={1.75} />
                Залить выбранное в Notion
              </button>

              <button
                type="button"
                onClick={() => void runSelectedBatch('merge')}
                disabled={!!applyingId || selectedDiffKeys.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-control bg-control-bg border border-control-border text-text hover:bg-control-hover-bg disabled:opacity-50"
              >
                <RefreshCw size={16} strokeWidth={1.75} />
                Объединить выбранное (новее побеждает)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
