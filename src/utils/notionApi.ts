/**
 * Notion API client for bidirectional sync.
 *
 * Uses Notion's public API via a CORS proxy (since browser can't call Notion API directly).
 * The user provides their Integration Token and Database ID.
 *
 * Flow:
 * 1. Pull: Read all pages from Notion DB → convert to TechNodes + TechEdges
 * 2. Push: Convert local nodes/edges → update/create pages in Notion DB
 * 3. Bidirectional: Compare timestamps, resolve conflicts
 */

import { TechNode, TechEdge, NotionConfig, SyncResult, NodeData } from '../types';

// Notion API base URL — we use a lightweight CORS proxy approach.
// In production, this should be a backend proxy or Notion's official proxy.
// For local dev, users can use a CORS proxy or a small server.
const NOTION_API_VERSION = '2022-06-28';

interface NotionApiOptions {
  apiKey: string;
  /** Optional CORS proxy prefix. E.g. "https://cors-proxy.example.com/" */
  corsProxy?: string;
}

const NOTION_BASE = 'https://api.notion.com/v1';

/** Value for "use built-in proxy" (Vite dev server proxies /api/notion to Notion). Only works when running via `npm run dev`. */
export const NOTION_BUILTIN_PROXY = '__builtin__';

/** Notion API rounds last_edited_time to the nearest minute. Use this buffer so we detect and fetch edits that fall in the same minute as lastSyncTime. */
const NOTION_TIME_BUFFER_MS = 90_000;

const NOTION_NETWORK_ERROR_MSG =
  "Cannot reach Notion. If you're running in the browser, set a CORS proxy in the Notion Sync settings or use the built-in proxy (dev only).";

/** Strip non-ISO-8859-1 characters from a string (required for fetch headers) */
const sanitizeHeaderValue = (value: string): string => {
  // Remove BOM, zero-width spaces, and any chars outside ISO-8859-1 range
  // eslint-disable-next-line no-control-regex
  return value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/[^\x00-\xFF]/g, '');
};

/** Make a request to Notion API */
const notionFetch = async (
  path: string,
  options: NotionApiOptions,
  init: RequestInit = {}
): Promise<any> => {
  const apiKey = sanitizeHeaderValue(options.apiKey);
  if (!apiKey) {
    throw new Error('API key is empty after sanitization. Check that the key contains only ASCII characters.');
  }

  let baseUrl: string;
  const proxyVal = options.corsProxy?.trim() ?? '';
  if (
    options.corsProxy === NOTION_BUILTIN_PROXY ||
    proxyVal.replace(/\/+$/, '').endsWith('/api/notion')
  ) {
    // Built-in Vite dev proxy — always use relative path so the browser
    // sends the request to the same origin and Vite middleware intercepts it.
    baseUrl = '/api/notion';
  } else if (proxyVal) {
    // External CORS proxy: proxy URL + api.notion.com/v1 path.
    const proxy = proxyVal.replace(/\/+$/, '');
    baseUrl = `${proxy}/${NOTION_BASE.replace(/^https?:\/\//, '')}`;
  } else {
    baseUrl = NOTION_BASE;
  }

  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Merge additional headers from init, sanitizing values
  if (init.headers) {
    const extra = init.headers as Record<string, string>;
    for (const [k, v] of Object.entries(extra)) {
      headers[k] = sanitizeHeaderValue(v);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      err instanceof TypeError &&
      (msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource' || msg.includes('NetworkError'))
    ) {
      throw new Error(NOTION_NETWORK_ERROR_MSG);
    }
    throw err;
  }

  const body = await res.text();
  if (!res.ok) {
    const baseMsg = `Notion API error ${res.status}: ${body}`;
    if (res.status === 404) {
      throw new Error(
        `${baseMsg} Ensure your Integration is added to the Database connections in Notion (click ... > Connections > Add connection).`
      );
    }
    throw new Error(baseMsg);
  }

  if (body.trimStart().startsWith('<!') || body.toLowerCase().includes('<!doctype')) {
    throw new Error(
      'Server returned HTML instead of JSON. Ensure the app is open at the same address as the dev server (e.g. http://localhost:5173) and that you started it with "npm run dev" or START.bat, not with preview or static hosting. Enable "Use built-in proxy (dev only)" in the Notion Sync modal.'
    );
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid JSON response from Notion API.');
  }
};

/** Query all pages from a Notion database (handles pagination) */
export const queryAllPages = async (
  databaseId: string,
  options: NotionApiOptions
): Promise<any[]> => {
  const allPages: any[] = [];
  let startCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const response = await notionFetch(
      `/databases/${databaseId}/query`,
      options,
      { method: 'POST', body: JSON.stringify(body) }
    );

    allPages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return allPages;
};

/** Query pages with optional filter (e.g. last_edited_time after) */
const queryPagesFiltered = async (
  databaseId: string,
  options: NotionApiOptions,
  filter?: object
): Promise<any[]> => {
  const allPages: any[] = [];
  let startCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;
    if (filter) body.filter = filter;

    const response = await notionFetch(
      `/databases/${databaseId}/query`,
      options,
      { method: 'POST', body: JSON.stringify(body) }
    );

    allPages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return allPages;
};

/** Light query: fetch most recently edited page to check if Notion has updates since lastSyncTime */
export const checkForNotionUpdates = async (
  config: NotionConfig,
  lastSyncTime: string | null,
  corsProxy?: string
): Promise<{ hasUpdates: boolean; lastEditedTime?: string }> => {
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const body = {
    page_size: 1,
    sorts: [{ timestamp: 'last_edited_time' as const, direction: 'descending' as const }],
  };
  const response = await notionFetch(
    `/databases/${config.databaseId}/query`,
    options,
    { method: 'POST', body: JSON.stringify(body) }
  );
  const results = response.results || [];
  if (results.length === 0) return { hasUpdates: false };
  const lastEdited = (results[0] as any).last_edited_time;
  if (!lastSyncTime) return { hasUpdates: true, lastEditedTime: lastEdited };
  const remoteTime = new Date(lastEdited).getTime();
  const localTime = new Date(lastSyncTime).getTime();
  return { hasUpdates: remoteTime >= localTime - NOTION_TIME_BUFFER_MS, lastEditedTime: lastEdited };
};

/** Extract plain text from a Notion rich_text array */
const getPlainText = (richText: any[]): string => {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t: any) => t.plain_text || '').join('');
};

/** Extract title from Notion title property */
const getTitleText = (titleProp: any): string => {
  if (!titleProp || !titleProp.title) return '';
  return getPlainText(titleProp.title);
};

/** Extract select value */
const getSelectValue = (selectProp: any): string => {
  return selectProp?.select?.name || '';
};

/** Extract relation IDs */
const getRelationIds = (relationProp: any): string[] => {
  if (!relationProp?.relation) return [];
  return relationProp.relation.map((r: any) => r.id);
};

/** Parse an EditorPosition rich_text value into {x, y} or undefined */
const parseEditorPosition = (posText: string): { x: number; y: number } | undefined => {
  if (!posText) return undefined;
  try {
    const parsed = JSON.parse(posText);
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Try "x,y" fallback
    const parts = posText.split(',').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { x: parts[0], y: parts[1] };
    }
  }
  return undefined;
};

/** Convert a Notion page to NodeData + notionPageId + optional position */
export const notionPageToNodeData = (
  page: any,
  config: NotionConfig
): { notionPageId: string; data: NodeData; position?: { x: number; y: number } } => {
  const props = page.properties;
  const cm = config.columnMapping;

  const label = getTitleText(props[cm.workingName]);
  const techCraftId = getPlainText(props[cm.techCraftId]?.rich_text || props[cm.techCraftId]?.title || [])
    || props[cm.techCraftId]?.formula?.string
    || '';

  // Parse editor position if the column is mapped
  let position: { x: number; y: number } | undefined;
  if (cm.editorPosition && props[cm.editorPosition]) {
    const posText = getPlainText(props[cm.editorPosition]?.rich_text || []);
    position = parseEditorPosition(posText);
  }

  const data: NodeData = {
    label,
    techCraftId: techCraftId || undefined,
    notionPageId: page.id,
    act: getSelectValue(props[cm.actAndStage]) || getPlainText(props[cm.actAndStage]?.rich_text || []),
    stage: getSelectValue(props[cm.actStage]) || getPlainText(props[cm.actStage]?.rich_text || []),
    category: getSelectValue(props[cm.category]) || getPlainText(props[cm.category]?.rich_text || []),
    powerType: getSelectValue(props[cm.powerType]),
    gameStatus: getSelectValue(props[cm.gameStatus]),
    designStatus: getSelectValue(props[cm.designStatus]),
    notionSyncStatus: getSelectValue(props[cm.notionSyncStatus]),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };

  return { notionPageId: page.id, data, position };
};

/** Pull all data from Notion DB and convert to nodes + edges */
export const pullFromNotion = async (
  config: NotionConfig,
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[] }> => {
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const pages = await queryAllPages(config.databaseId, options);
  const cm = config.columnMapping;

  const nodes: TechNode[] = [];
  const edges: TechEdge[] = [];

  // First pass: create nodes and build ID maps
  const pageIdToNodeId = new Map<string, string>(); // Notion page ID → node ID
  const techCraftIdToNodeId = new Map<string, string>(); // TechCraftID → node ID

  pages.forEach((page, index) => {
    const { notionPageId, data, position } = notionPageToNodeData(page, config);
    const nodeId = data.techCraftId || `notion-${index}`;

    pageIdToNodeId.set(notionPageId, nodeId);
    if (data.techCraftId) {
      techCraftIdToNodeId.set(data.techCraftId, nodeId);
    }

    nodes.push({
      id: nodeId,
      position: position || { x: 0, y: 0 },
      data,
      type: 'techNode',
    });
  });

  // Second pass: create edges from relation properties
  pages.forEach((page) => {
    const props = page.properties;
    const nodeId = pageIdToNodeId.get(page.id);
    if (!nodeId) return;

    // PrevTechs relations (incoming)
    if (cm.prevTechs && props[cm.prevTechs]) {
      const relIds = getRelationIds(props[cm.prevTechs]);
      relIds.forEach(relPageId => {
        const sourceNodeId = pageIdToNodeId.get(relPageId);
        if (sourceNodeId && sourceNodeId !== nodeId) {
          edges.push({
            id: `e-${sourceNodeId}-${nodeId}`,
            source: sourceNodeId,
            target: nodeId,
            type: 'default',
            animated: true,
          });
        }
      });
    }

    // NextTechs relations (outgoing)
    if (cm.nextTechs && props[cm.nextTechs]) {
      const relIds = getRelationIds(props[cm.nextTechs]);
      relIds.forEach(relPageId => {
        const targetNodeId = pageIdToNodeId.get(relPageId);
        if (targetNodeId && targetNodeId !== nodeId) {
          edges.push({
            id: `e-${nodeId}-${targetNodeId}`,
            source: nodeId,
            target: targetNodeId,
            type: 'default',
            animated: true,
          });
        }
      });
    }
  });

  // Deduplicate edges
  const uniqueEdges = edges.filter((edge, i, self) =>
    i === self.findIndex(t => t.source === edge.source && t.target === edge.target)
  );

  return { nodes, edges: uniqueEdges };
};

/** Convert raw pages to nodes + edges (shared logic). pageIdToNodeId is pre-filled from local; pulled nodes use existing id when matching. */
const pagesToNodesAndEdges = (
  pages: any[],
  config: NotionConfig,
  pageIdToNodeId: Map<string, string>
): { nodes: TechNode[]; edges: TechEdge[] } => {
  const cm = config.columnMapping;
  const nodes: TechNode[] = [];
  const edges: TechEdge[] = [];

  pages.forEach((page, index) => {
    const { notionPageId, data, position } = notionPageToNodeData(page, config);
    const nodeId = pageIdToNodeId.get(notionPageId) ?? data.techCraftId ?? `notion-${index}`;
    pageIdToNodeId.set(notionPageId, nodeId);

    nodes.push({
      id: nodeId,
      position: position || { x: 0, y: 0 },
      data,
      type: 'techNode',
    });
  });

  pages.forEach((page) => {
    const props = page.properties;
    const nodeId = pageIdToNodeId.get(page.id);
    if (!nodeId) return;

    if (cm.prevTechs && props[cm.prevTechs]) {
      const relIds = getRelationIds(props[cm.prevTechs]);
      relIds.forEach((relPageId) => {
        const sourceNodeId = pageIdToNodeId.get(relPageId);
        if (sourceNodeId && sourceNodeId !== nodeId) {
          edges.push({
            id: `e-${sourceNodeId}-${nodeId}`,
            source: sourceNodeId,
            target: nodeId,
            type: 'default',
            animated: true,
          });
        }
      });
    }
    if (cm.nextTechs && props[cm.nextTechs]) {
      const relIds = getRelationIds(props[cm.nextTechs]);
      relIds.forEach((relPageId) => {
        const targetNodeId = pageIdToNodeId.get(relPageId);
        if (targetNodeId && targetNodeId !== nodeId) {
          edges.push({
            id: `e-${nodeId}-${targetNodeId}`,
            source: nodeId,
            target: targetNodeId,
            type: 'default',
            animated: true,
          });
        }
      });
    }
  });

  const uniqueEdges = edges.filter((edge, i, self) =>
    i === self.findIndex((t) => t.source === edge.source && t.target === edge.target)
  );
  return { nodes, edges: uniqueEdges };
};

/** Fetch changed pages as nodes/edges (no merge). Used by pullFromNotionIncremental and bidirectionalSync. */
const pullChangedPagesAsRemote = async (
  config: NotionConfig,
  lastSyncTime: string,
  localNodes: TechNode[],
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[] }> => {
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  // Notion API has minute-level precision for last_edited_time; use buffer so we include edits in the same minute as lastSyncTime
  const adjustedTime = new Date(new Date(lastSyncTime).getTime() - NOTION_TIME_BUFFER_MS).toISOString();
  const filter = {
    timestamp: 'last_edited_time' as const,
    last_edited_time: { on_or_after: adjustedTime },
  };
  const pages = await queryPagesFiltered(config.databaseId, options, filter);
  if (pages.length === 0) return { nodes: [], edges: [] };

  const pageIdToNodeId = new Map<string, string>();
  localNodes.forEach((n) => {
    if (n.data.notionPageId) pageIdToNodeId.set(n.data.notionPageId, n.id);
    if (n.data.techCraftId) pageIdToNodeId.set(n.data.techCraftId, n.id);
  });

  return pagesToNodesAndEdges(pages, config, pageIdToNodeId);
};

/** Incremental pull: fetch only pages edited after lastSyncTime and merge with local */
export const pullFromNotionIncremental = async (
  config: NotionConfig,
  lastSyncTime: string | null,
  localNodes: TechNode[],
  localEdges: TechEdge[],
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[] }> => {
  if (!lastSyncTime) {
    return pullFromNotion(config, corsProxy);
  }

  const { nodes: pulledNodes, edges: pulledEdges } = await pullChangedPagesAsRemote(
    config,
    lastSyncTime,
    localNodes,
    corsProxy
  );
  // No changes: return local state with new refs (no full pull to avoid scanning all)
  if (pulledNodes.length === 0) {
    return { nodes: [...localNodes], edges: [...localEdges] };
  }

  const pulledNodeIds = new Set(pulledNodes.map((n) => n.id));
  const pulledByNotionId = new Map(pulledNodes.map((n) => [n.data.notionPageId!, n]));
  const pulledByTechCraftId = new Map(
    pulledNodes.filter((n) => n.data.techCraftId).map((n) => [n.data.techCraftId!, n])
  );

  const mergedNodes = localNodes
    .filter((local) => {
      const pulled = local.data.notionPageId
        ? pulledByNotionId.get(local.data.notionPageId)
        : local.data.techCraftId
          ? pulledByTechCraftId.get(local.data.techCraftId)
          : undefined;
      return !pulled;
    })
    .concat(
      pulledNodes.map((pulled) => {
        const local = localNodes.find(
          (n) =>
            n.data.notionPageId === pulled.data.notionPageId ||
            (n.data.techCraftId && n.data.techCraftId === pulled.data.techCraftId)
        );
        if (local) return { ...pulled, position: local.position };
        return pulled;
      })
    );

  const mergedEdges = [
    ...localEdges.filter((e) => !pulledNodeIds.has(e.source) && !pulledNodeIds.has(e.target)),
    ...pulledEdges,
  ].filter(
    (edge, i, self) =>
      i === self.findIndex((t) => t.source === edge.source && t.target === edge.target)
  );

  return { nodes: mergedNodes, edges: mergedEdges };
};

/** Run async tasks with a concurrency limit (e.g. 3 parallel Notion API calls) */
const parallelLimit = async <T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> => {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const p = (async () => {
      results.push(await task());
    })();
    const tracked = p.then(() => { executing.delete(tracked); });
    executing.add(tracked);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
};

/** Build Notion properties object from NodeData for creating/updating a page */
const buildNotionProperties = (
  data: NodeData,
  config: NotionConfig,
  nodeMap: Map<string, TechNode>,
  edges: TechEdge[],
  nodeId: string,
  position?: { x: number; y: number }
): any => {
  const cm = config.columnMapping;
  const props: any = {};

  // Title property
  if (data.label) {
    props[cm.workingName] = {
      title: [{ text: { content: data.label } }],
    };
  }

  // Select properties
  if (data.act) {
    props[cm.actAndStage] = { select: { name: String(data.act) } };
  }
  if (data.stage) {
    props[cm.actStage] = { select: { name: String(data.stage) } };
  }
  if (data.category) {
    props[cm.category] = { select: { name: data.category } };
  }
  if (data.powerType) {
    props[cm.powerType] = { select: { name: data.powerType } };
  }
  if (data.gameStatus) {
    props[cm.gameStatus] = { select: { name: data.gameStatus } };
  }
  if (data.designStatus) {
    props[cm.designStatus] = { select: { name: data.designStatus } };
  }
  if (data.notionSyncStatus) {
    props[cm.notionSyncStatus] = { select: { name: data.notionSyncStatus } };
  }

  // Relations: PrevTechs — O(1) lookups via nodeMap
  const incomingEdges = edges.filter(e => e.target === nodeId);
  const prevRelations = incomingEdges
    .map(e => nodeMap.get(e.source)?.data?.notionPageId)
    .filter(Boolean)
    .map(pageId => ({ id: pageId }));

  if (cm.prevTechs && prevRelations.length > 0) {
    props[cm.prevTechs] = { relation: prevRelations };
  }

  // Relations: NextTechs — O(1) lookups via nodeMap
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  const nextRelations = outgoingEdges
    .map(e => nodeMap.get(e.target)?.data?.notionPageId)
    .filter(Boolean)
    .map(pageId => ({ id: pageId }));

  if (cm.nextTechs && nextRelations.length > 0) {
    props[cm.nextTechs] = { relation: nextRelations };
  }

  // EditorPosition — store node coordinates as JSON
  if (cm.editorPosition && position) {
    props[cm.editorPosition] = {
      rich_text: [{
        text: {
          content: JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) })
        }
      }]
    };
  }

  return props;
};

const PUSH_CONCURRENCY = 3; // Stay within Notion API ~3 req/s limit

const toSet = (ids: Set<string> | string[] | undefined): Set<string> | undefined => {
  if (!ids) return undefined;
  if (ids instanceof Set) return ids.size > 0 ? ids : undefined;
  return ids.length > 0 ? new Set(ids) : undefined;
};

/** Push local nodes to Notion — create new or update existing pages (parallelized).
 * When dirtyNodeIds is provided and non-empty, only pushes those nodes (incremental).
 * When dirtyNodeIds is empty, no-op. When not provided, full push. */
export const pushToNotion = async (
  nodes: TechNode[],
  edges: TechEdge[],
  config: NotionConfig,
  corsProxy?: string,
  onProgress?: (current: number, total: number) => void,
  dirtyNodeIds?: Set<string> | string[]
): Promise<SyncResult> => {
  const dirty = toSet(dirtyNodeIds);
  if (dirty !== undefined && dirty.size === 0) {
    return { added: 0, updated: 0, deleted: 0, conflicts: [], errors: [] };
  }
  const nodesToPush = dirty
    ? nodes.filter((n) => dirty.has(n.id))
    : nodes;

  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, conflicts: [], errors: [] };
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const tasks = nodesToPush.map((node, index) => async () => {
    try {
      const properties = buildNotionProperties(node.data, config, nodeMap, edges, node.id, node.position);

      if (node.data.notionPageId) {
        const response = await notionFetch(
          `/pages/${node.data.notionPageId}`,
          options,
          {
            method: 'PATCH',
            body: JSON.stringify({ properties }),
          }
        );
        if (response?.last_edited_time) node.data.updatedAt = response.last_edited_time;
        result.updated++;
      } else {
        const response = await notionFetch(
          '/pages',
          options,
          {
            method: 'POST',
            body: JSON.stringify({
              parent: { database_id: config.databaseId },
              properties,
            }),
          }
        );
        node.data.notionPageId = response.id;
        if (response?.last_edited_time) node.data.updatedAt = response.last_edited_time;
        result.added++;
      }
    } catch (err: any) {
      result.errors.push(`${node.data.label || node.id}: ${err.message}`);
    } finally {
      onProgress?.(index + 1, nodesToPush.length);
    }
  });

  await parallelLimit(tasks, PUSH_CONCURRENCY);
  return result;
};

/** Bidirectional sync: pull remote, compare with local, resolve conflicts */
export const bidirectionalSync = async (
  localNodes: TechNode[],
  localEdges: TechEdge[],
  config: NotionConfig,
  corsProxy?: string,
  lastSyncTime?: string | null
): Promise<{
  mergedNodes: TechNode[];
  mergedEdges: TechEdge[];
  result: SyncResult;
}> => {
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, conflicts: [], errors: [] };

  const remote = lastSyncTime
    ? await pullChangedPagesAsRemote(config, lastSyncTime, localNodes, corsProxy)
    : await pullFromNotion(config, corsProxy);

  if (lastSyncTime && remote.nodes.length === 0) {
    return { mergedNodes: localNodes, mergedEdges: localEdges, result };
  }

  // Build lookup maps
  const localByTechCraftId = new Map<string, TechNode>();
  const localByNotionPageId = new Map<string, TechNode>();
  localNodes.forEach(n => {
    if (n.data.techCraftId) localByTechCraftId.set(n.data.techCraftId, n);
    if (n.data.notionPageId) localByNotionPageId.set(n.data.notionPageId, n);
  });

  const remoteByTechCraftId = new Map<string, TechNode>();
  const remoteByNotionPageId = new Map<string, TechNode>();
  remote.nodes.forEach(n => {
    if (n.data.techCraftId) remoteByTechCraftId.set(n.data.techCraftId, n);
    if (n.data.notionPageId) remoteByNotionPageId.set(n.data.notionPageId, n);
  });

  const mergedNodes: TechNode[] = [];
  const processedRemoteIds = new Set<string>();

  // Merge local nodes with remote
  for (const localNode of localNodes) {
    const remoteNode = localNode.data.notionPageId
      ? remoteByNotionPageId.get(localNode.data.notionPageId)
      : localNode.data.techCraftId
        ? remoteByTechCraftId.get(localNode.data.techCraftId)
        : undefined;

    if (remoteNode) {
      processedRemoteIds.add(remoteNode.id);

      // Compare timestamps — newer wins
      const localTime = new Date(localNode.data.updatedAt || 0).getTime();
      const remoteTime = new Date(remoteNode.data.updatedAt || 0).getTime();

      if (remoteTime > localTime) {
        // Remote is newer — take remote data but keep local position
        mergedNodes.push({
          ...localNode,
          data: {
            ...remoteNode.data,
            // Preserve local-only fields
            notionPageId: remoteNode.data.notionPageId || localNode.data.notionPageId,
          },
        });
        result.updated++;
      } else {
        // Local is newer or same — keep local
        mergedNodes.push(localNode);
      }
    } else {
      // Only exists locally — keep it
      mergedNodes.push(localNode);
    }
  }

  // Add remote-only nodes (new from Notion)
  for (const remoteNode of remote.nodes) {
    if (!processedRemoteIds.has(remoteNode.id)) {
      // Check if already added by a different key
      const alreadyAdded = mergedNodes.some(n =>
        n.data.notionPageId === remoteNode.data.notionPageId ||
        (n.data.techCraftId && n.data.techCraftId === remoteNode.data.techCraftId)
      );
      if (!alreadyAdded) {
        mergedNodes.push(remoteNode);
        result.added++;
      }
    }
  }

  // Merge edges: combine local and remote, deduplicate
  const allEdges = [...localEdges, ...remote.edges];
  const mergedEdges = allEdges.filter((edge, i, self) =>
    i === self.findIndex(t => t.source === edge.source && t.target === edge.target)
  );

  return { mergedNodes, mergedEdges, result };
};

/** Test Notion API connection by fetching database info */
export const testNotionConnection = async (
  databaseId: string,
  apiKey: string,
  corsProxy?: string
): Promise<{ success: boolean; title?: string; error?: string; properties?: string[] }> => {
  try {
    const options: NotionApiOptions = { apiKey, corsProxy };
    const db = await notionFetch(`/databases/${databaseId}`, options);

    const title = db.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    const properties = Object.keys(db.properties || {});

    return { success: true, title, properties };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
