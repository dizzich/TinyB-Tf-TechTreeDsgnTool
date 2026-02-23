/**
 * Notion API client for bidirectional sync.
 *
 * Uses Notion's public API via a CORS proxy (since browser can't call Notion API directly).
 * The user provides their Integration Token and Database ID.
 *
 * Flow:
 * 1. Pull: Read all pages from Notion DB -> convert to TechNodes + TechEdges
 * 2. Push: Convert local nodes/edges -> update/create pages in Notion DB
 * 3. Bidirectional: Compare timestamps, resolve conflicts
 */

import { TechNode, TechEdge, NotionConfig, SyncResult, NodeData, SyncDiffItem, NotionColumnMapping } from '../types';

// Notion API base URL - we use a lightweight CORS proxy approach.
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

  if (proxyVal === NOTION_BUILTIN_PROXY || !proxyVal) {
    // Default to built-in proxy if none specified or explicitly set to builtin.
    // In dev: handled by Vite. In production: handled by Apache -> Node proxy.
    baseUrl = '/api/notion';
  } else if (proxyVal.replace(/\/+$/, '').endsWith('/api/notion')) {
    // Already points to the proxy endpoint
    baseUrl = '/api/notion';
  } else {
    // External CORS proxy: proxy URL + api.notion.com/v1 path.
    const proxy = proxyVal.replace(/\/+$/, '');
    baseUrl = `${proxy}/${NOTION_BASE.replace(/^https?:\/\//, '')}`;
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

/** Retrieve a page by ID and return its title (first title property). Returns "" on error or 404. */
export const retrievePageTitle = async (
  pageId: string,
  options: NotionApiOptions
): Promise<string> => {
  try {
    const page = await notionFetch(`/pages/${pageId}`, options);
    const props = page?.properties;
    if (!props || typeof props !== 'object') return '';
    const titleProp = Object.values(props).find((p: any) => p?.type === 'title') as any;
    if (!titleProp?.title) return '';
    return getPlainText(titleProp.title);
  } catch {
    return '';
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

/** Notion named colors -> hex (for select/status chips) */
const NOTION_COLOR_TO_HEX: Record<string, string> = {
  default: '#9ca3af',
  gray: '#9ca3af',
  brown: '#92400e',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green: '#16a34a',
  blue: '#2563eb',
  purple: '#7c3aed',
  pink: '#db2777',
  red: '#dc2626',
};

function notionColorToHex(color?: string): string | undefined {
  if (!color) return undefined;
  return NOTION_COLOR_TO_HEX[color] ?? undefined;
}

/** Extract select value */
const getSelectValue = (selectProp: any): string => {
  return selectProp?.select?.name || '';
};

/** Extract select value and Notion color. Returns [value, hexColor] */
function getSelectValueAndColor(selectProp: any): { value: string; color?: string } {
  const sel = selectProp?.select;
  if (!sel?.name) return { value: '' };
  return {
    value: sel.name,
    color: notionColorToHex(sel.color),
  };
}

/** Extract first value from multi_select */
const getMultiSelectValue = (prop: any): string => {
  const arr = prop?.multi_select;
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr[0]?.name || '';
};

/** Extract first multi_select value and color */
function getMultiSelectValueAndColor(prop: any): { value: string; color?: string } {
  const arr = prop?.multi_select;
  if (!Array.isArray(arr) || arr.length === 0) return { value: '' };
  const first = arr[0];
  return {
    value: first?.name || '',
    color: notionColorToHex(first?.color),
  };
}

/** Extract status value */
const getStatusValue = (prop: any): string => {
  return prop?.status?.name || '';
};

/** Extract status value and color */
function getStatusValueAndColor(prop: any): { value: string; color?: string } {
  const st = prop?.status;
  if (!st?.name) return { value: '' };
  return {
    value: st.name,
    color: notionColorToHex(st.color),
  };
}

/** Extract relation IDs */
const getRelationIds = (relationProp: any): string[] => {
  if (!relationProp?.relation) return [];
  return relationProp.relation.map((r: any) => r.id);
};

/** Extract string from a Notion formula property */
const getFormulaValue = (prop: any): string => {
  if (!prop?.formula) return '';
  const f = prop.formula;
  if (f.type === 'string' && f.string) return f.string;
  if (f.type === 'number' && f.number != null) return String(f.number);
  if (f.type === 'boolean') return String(f.boolean);
  if (f.type === 'date' && f.date) return f.date.start || '';
  return '';
};

/** Get single value from a rollup array item (select, multi_select, status, title, rich_text) */
function getRollupItemValue(item: any): string {
  if (!item) return '';
  if (item.type === 'select' && item.select?.name) return item.select.name;
  if (item.type === 'multi_select' && Array.isArray(item.multi_select) && item.multi_select[0]?.name) return item.multi_select[0].name;
  if (item.type === 'status' && item.status?.name) return item.status.name;
  if (item.type === 'title' && item.title) return getPlainText(item.title);
  if (item.type === 'rich_text' && item.rich_text) return getPlainText(item.rich_text);
  return '';
}

/** Extract first non-empty value from a Notion rollup of type "array" (e.g. CategoryFromItem rollup via Relation) */
const getRollupArrayValue = (prop: any): string => {
  if (prop?.type !== 'rollup' || prop?.rollup?.type !== 'array' || !Array.isArray(prop.rollup.array)) {
    return '';
  }
  for (const item of prop.rollup.array) {
    const v = getRollupItemValue(item);
    if (v) return v;
  }
  return '';
};

/** Extract all non-empty values from a Notion rollup array and join with ", " (e.g. OpenCondition rollup) */
const getRollupArrayAllValues = (prop: any): string => {
  if (prop?.type !== 'rollup' || prop?.rollup?.type !== 'array' || !Array.isArray(prop.rollup.array)) {
    return '';
  }
  const values = prop.rollup.array.map((item: any) => getRollupItemValue(item)).filter(Boolean);
  return values.join(', ');
};

/** Extract first value+color from a Notion rollup of type "array" (e.g. Category from Relation rollup) */
function getRollupArrayValueAndColor(prop: any): { value: string; color?: string } | null {
  if (prop?.type !== 'rollup' || prop?.rollup?.type !== 'array' || !Array.isArray(prop.rollup.array)) {
    return null;
  }
  for (const item of prop.rollup.array) {
    if (!item) continue;
    if (item.type === 'select' && item.select?.name) {
      const color = notionColorToHex(item.select.color);
      return { value: item.select.name, color };
    }
    if (item.type === 'multi_select' && Array.isArray(item.multi_select) && item.multi_select[0]) {
      const first = item.multi_select[0];
      const color = notionColorToHex(first.color);
      return { value: first.name || '', color };
    }
    if (item.type === 'status' && item.status?.name) {
      const color = notionColorToHex(item.status.color);
      return { value: item.status.name, color };
    }
  }
  return null;
}

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

/** Parse a LineData rich_text value into edge routing map, or empty map on failure */
const parseLineData = (text: string): Record<string, { waypoints?: { x: number; y: number }[]; pathType?: string }> => {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch { /* ignore */ }
  return {};
};

/** Apply LineData from pulled pages onto the edge array (mutates in-place for performance) */
const applyLineDataToEdges = (
  pages: any[],
  config: NotionConfig,
  edges: TechEdge[]
): void => {
  const cm = config.columnMapping;
  if (!cm.lineData) return;
  const edgeMap = new Map(edges.map((e) => [e.id, e]));
  for (const page of pages) {
    const prop = page.properties?.[cm.lineData];
    if (!prop) continue;
    const text = getPlainText(prop?.rich_text || []);
    const lineData = parseLineData(text);
    for (const [edgeId, data] of Object.entries(lineData)) {
      const edge = edgeMap.get(edgeId);
      if (edge) {
        if (data.waypoints?.length) edge.waypoints = data.waypoints;
        if (data.pathType) edge.pathType = data.pathType as TechEdge['pathType'];
      }
    }
  }
};

/** Resolve openCondition from page props: rich_text, formula, relation (with id->title map), rollup (all values), select, status, title */
function resolveOpenCondition(
  prop: any,
  relationIdToTitle?: Map<string, string>
): string {
  if (!prop) return '';
  const rich = getPlainText(prop?.rich_text || []);
  if (rich) return rich;
  const formula = getFormulaValue(prop);
  if (formula) return formula;
  if (relationIdToTitle && prop?.type === 'relation' && prop?.relation) {
    const ids = getRelationIds(prop);
    const titles = ids.map((id) => relationIdToTitle.get(id) ?? id).filter(Boolean);
    if (titles.length) return titles.join(', ');
  }
  const rollupAll = getRollupArrayAllValues(prop);
  if (rollupAll) return rollupAll;
  const sel = getSelectValue(prop) || getStatusValue(prop);
  if (sel) return sel;
  return getTitleText(prop) || '';
}

/** Convert a Notion page to NodeData + notionPageId + optional position */
export const notionPageToNodeData = (
  page: any,
  config: NotionConfig,
  relationIdToTitle?: Map<string, string>,
  relationIdToTitleIngredients?: Map<string, string>,
  relationIdToTitleUsedCraftStation?: Map<string, string>,
  relationIdToTitleUsedStation?: Map<string, string>
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

  const actCol = cm.act ?? (cm as any).actAndStage;
  const techForActVal = actCol
    ? (getSelectValue(props[actCol]) || getStatusValue(props[actCol]) || getPlainText(props[actCol]?.rich_text || []))
    : '';

  const stageCol = cm.stage ?? (cm as any).actStage;
  const stageVal = stageCol
    ? (getSelectValue(props[stageCol]) || getStatusValue(props[stageCol]) || getRollupArrayValue(props[stageCol]) || getFormulaValue(props[stageCol]) || getPlainText(props[stageCol]?.rich_text || []))
    : '';

  const data: NodeData = {
    label,
    techCraftId: techCraftId || undefined,
    notionPageId: page.id,
    techForAct: techForActVal || undefined,
    stage: stageVal || undefined,
    category: cm.category ? (getSelectValue(props[cm.category]) || getMultiSelectValue(props[cm.category]) || getStatusValue(props[cm.category]) || getRollupArrayValue(props[cm.category]) || getPlainText(props[cm.category]?.rich_text || []) || getFormulaValue(props[cm.category]) || '') : undefined,
    powerType: getSelectValue(props[cm.powerType]) || getStatusValue(props[cm.powerType]) || getRollupArrayValue(props[cm.powerType]),
    gameStatus: getSelectValue(props[cm.gameStatus]) || getStatusValue(props[cm.gameStatus]),
    designStatus: getSelectValue(props[cm.designStatus]) || getStatusValue(props[cm.designStatus]),
    notionSyncStatus: getSelectValue(props[cm.notionSyncStatus]) || getStatusValue(props[cm.notionSyncStatus]),
    ...(cm.openCondition
      ? (() => {
        const prop = props[cm.openCondition];
        const openCondition = resolveOpenCondition(prop, relationIdToTitle) || '';
        const openConditionRefs =
          relationIdToTitle && prop?.type === 'relation' && prop?.relation
            ? getRelationIds(prop).map((id) => ({
              name: relationIdToTitle.get(id) ?? id,
              pageId: id,
            }))
            : undefined;
        return {
          openCondition,
          ...(openConditionRefs?.length ? { openConditionRefs } : {}),
        };
      })()
      : {}),
    ...(cm.ingredients
      ? (() => {
        const prop = props[cm.ingredients];
        const map = relationIdToTitleIngredients;
        const refs =
          map && prop?.type === 'relation' && prop?.relation
            ? getRelationIds(prop).map((id) => ({
              name: map.get(id) ?? id,
              pageId: id,
            }))
            : undefined;
        return refs?.length ? { ingredients: refs } : {};
      })()
      : {}),
    ...(cm.usedCraftStation
      ? (() => {
        const prop = props[cm.usedCraftStation];
        const map = relationIdToTitleUsedCraftStation;
        const refs =
          map && prop?.type === 'relation' && prop?.relation
            ? getRelationIds(prop).map((id) => ({
              name: map.get(id) ?? id,
              pageId: id,
            }))
            : undefined;
        const str = refs?.map((r) => r.name).filter(Boolean).join(', ') || '';
        return {
          usedCraftStation: str || undefined,
          ...(refs?.length ? { usedCraftStationRefs: refs } : {}),
        };
      })()
      : {}),
    ...(cm.usedStation
      ? (() => {
        const prop = props[cm.usedStation];
        const map = relationIdToTitleUsedStation;
        const refs =
          map && prop?.type === 'relation' && prop?.relation
            ? getRelationIds(prop).map((id) => ({
              name: map.get(id) ?? id,
              pageId: id,
            }))
            : undefined;
        return refs?.length ? { usedStations: refs } : {};
      })()
      : {}),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
    positionModifiedAt: page.last_edited_time,
  };

  return { notionPageId: page.id, data, position };
};

/** Field keys we use in NodeData -> Notion column mapping keys */
const FIELD_TO_COLUMN: Record<string, string> = {
  act: 'act',
  techForAct: 'act',
  stage: 'stage',
  ingredients: 'ingredients',
  usedCraftStation: 'usedCraftStation',
  usedStation: 'usedStation',
  category: 'category',
  powerType: 'powerType',
  gameStatus: 'gameStatus',
  designStatus: 'designStatus',
  notionSyncStatus: 'notionSyncStatus',
  openCondition: 'openCondition',
};

/** Extract value+color from a Notion property. Tries select, multi_select, status, rollup (array). */
function extractValueAndColor(prop: any): { value: string; color?: string } | null {
  if (!prop) return null;
  const sel = getSelectValueAndColor(prop);
  if (sel.value && sel.color) return sel;
  const multi = getMultiSelectValueAndColor(prop);
  if (multi.value && multi.color) return multi;
  const status = getStatusValueAndColor(prop);
  if (status.value && status.color) return status;
  const rollup = getRollupArrayValueAndColor(prop);
  if (rollup?.value && rollup.color) return rollup;
  return null;
}

/** Build notionFieldColors from pages. Maps fieldKey -> { value -> hexColor } */
export function buildNotionFieldColors(
  pages: any[],
  config: NotionConfig
): Record<string, Record<string, string>> {
  const cm = config.columnMapping;
  const result: Record<string, Record<string, string>> = {};

  const tryAdd = (fieldKey: string, props: any) => {
    const col = FIELD_TO_COLUMN[fieldKey] ?? fieldKey;
    const colName = (cm as any)[col];
    if (!colName || !props || !props[colName]) return;
    const extracted = extractValueAndColor(props[colName]);
    if (extracted?.value && extracted.color) {
      if (!result[fieldKey]) result[fieldKey] = {};
      result[fieldKey][extracted.value] = extracted.color;
    }
  };

  for (const page of pages) {
    const props = page.properties || {};
    tryAdd('act', props);
    tryAdd('techForAct', props);
    tryAdd('stage', props);
    tryAdd('category', props);
    tryAdd('powerType', props);
    tryAdd('gameStatus', props);
    tryAdd('designStatus', props);
    tryAdd('notionSyncStatus', props);
    tryAdd('openCondition', props);
    tryAdd('ingredients', props);
  }

  return result;
}

const OPEN_CONDITION_FETCH_BATCH_SIZE = 10;

/** Collect all unique relation IDs from a relation column and fetch their page titles. Returns id -> title map. */
async function fetchRelationIdToTitle(
  pages: any[],
  columnName: string | undefined,
  options: NotionApiOptions
): Promise<Map<string, string>> {
  if (!columnName) return new Map();
  const ids = new Set<string>();
  for (const page of pages) {
    const prop = page.properties?.[columnName];
    if (prop?.type === 'relation') {
      getRelationIds(prop).forEach((id) => ids.add(id));
    }
  }
  const map = new Map<string, string>();
  const arr = Array.from(ids);
  for (let i = 0; i < arr.length; i += OPEN_CONDITION_FETCH_BATCH_SIZE) {
    const chunk = arr.slice(i, i + OPEN_CONDITION_FETCH_BATCH_SIZE);
    const titles = await Promise.all(chunk.map((id) => retrievePageTitle(id, options)));
    chunk.forEach((id, j) => {
      if (titles[j]) map.set(id, titles[j]);
    });
  }
  return map;
}

/** Collect all unique relation IDs from openCondition props and fetch their page titles. Returns id → title map. */
async function fetchOpenConditionRelationIdToTitle(
  pages: any[],
  config: NotionConfig,
  options: NotionApiOptions
): Promise<Map<string, string>> {
  return fetchRelationIdToTitle(pages, config.columnMapping.openCondition, options);
}

/** Collect all unique relation IDs from Ingridients props and fetch their page titles. Returns id → title map. */
async function fetchIngredientsRelationIdToTitle(
  pages: any[],
  config: NotionConfig,
  options: NotionApiOptions
): Promise<Map<string, string>> {
  return fetchRelationIdToTitle(pages, config.columnMapping.ingredients, options);
}

/** Collect all unique relation IDs from UsedCraftStation props and fetch their page titles. Returns id → title map. */
async function fetchUsedCraftStationRelationIdToTitle(
  pages: any[],
  config: NotionConfig,
  options: NotionApiOptions
): Promise<Map<string, string>> {
  return fetchRelationIdToTitle(pages, config.columnMapping.usedCraftStation, options);
}

/** Collect all unique relation IDs from UsedStation props and fetch their page titles. Returns id → title map. */
async function fetchUsedStationRelationIdToTitle(
  pages: any[],
  config: NotionConfig,
  options: NotionApiOptions
): Promise<Map<string, string>> {
  return fetchRelationIdToTitle(pages, config.columnMapping.usedStation, options);
}

/** Pull all data from Notion DB and convert to nodes + edges */
export const pullFromNotion = async (
  config: NotionConfig,
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[]; notionFieldColors: Record<string, Record<string, string>> }> => {
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const pages = await queryAllPages(config.databaseId, options);
  const cm = config.columnMapping;
  const notionFieldColors = buildNotionFieldColors(pages, config);
  const [
    relationIdToTitle,
    relationIdToTitleIngredients,
    relationIdToTitleUsedCraftStation,
    relationIdToTitleUsedStation,
  ] = await Promise.all([
    fetchOpenConditionRelationIdToTitle(pages, config, options),
    fetchIngredientsRelationIdToTitle(pages, config, options),
    fetchUsedCraftStationRelationIdToTitle(pages, config, options),
    fetchUsedStationRelationIdToTitle(pages, config, options),
  ]);

  const nodes: TechNode[] = [];
  const edges: TechEdge[] = [];

  // First pass: create nodes and build ID maps
  const pageIdToNodeId = new Map<string, string>(); // Notion page ID -> node ID
  const techCraftIdToNodeId = new Map<string, string>(); // TechCraftID -> node ID

  pages.forEach((page, index) => {
    const { notionPageId, data, position } = notionPageToNodeData(
      page,
      config,
      relationIdToTitle,
      relationIdToTitleIngredients,
      relationIdToTitleUsedCraftStation,
      relationIdToTitleUsedStation
    );
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

  applyLineDataToEdges(pages, config, uniqueEdges);

  return { nodes, edges: uniqueEdges, notionFieldColors };
};

/** Convert raw pages to nodes + edges (shared logic). pageIdToNodeId is pre-filled from local; pulled nodes use existing id when matching. */
const pagesToNodesAndEdges = (
  pages: any[],
  config: NotionConfig,
  pageIdToNodeId: Map<string, string>,
  relationIdToTitle?: Map<string, string>,
  relationIdToTitleIngredients?: Map<string, string>,
  relationIdToTitleUsedCraftStation?: Map<string, string>,
  relationIdToTitleUsedStation?: Map<string, string>
): { nodes: TechNode[]; edges: TechEdge[]; notionFieldColors: Record<string, Record<string, string>> } => {
  const cm = config.columnMapping;
  const nodes: TechNode[] = [];
  const edges: TechEdge[] = [];

  pages.forEach((page, index) => {
    const { notionPageId, data, position } = notionPageToNodeData(
      page,
      config,
      relationIdToTitle,
      relationIdToTitleIngredients,
      relationIdToTitleUsedCraftStation,
      relationIdToTitleUsedStation
    );
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
  applyLineDataToEdges(pages, config, uniqueEdges);
  const notionFieldColors = buildNotionFieldColors(pages, config);
  return { nodes, edges: uniqueEdges, notionFieldColors };
};

/** Fetch changed pages as nodes/edges (no merge). Used by pullFromNotionIncremental and bidirectionalSync. */
const pullChangedPagesAsRemote = async (
  config: NotionConfig,
  lastSyncTime: string,
  localNodes: TechNode[],
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[]; notionFieldColors: Record<string, Record<string, string>> }> => {
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const adjustedTime = new Date(new Date(lastSyncTime).getTime() - NOTION_TIME_BUFFER_MS).toISOString();
  const filter = {
    timestamp: 'last_edited_time' as const,
    last_edited_time: { on_or_after: adjustedTime },
  };
  const pages = await queryPagesFiltered(config.databaseId, options, filter);
  if (pages.length === 0) return { nodes: [], edges: [], notionFieldColors: {} };

  const pageIdToNodeId = new Map<string, string>();
  localNodes.forEach((n) => {
    if (n.data.notionPageId) pageIdToNodeId.set(n.data.notionPageId, n.id);
    if (n.data.techCraftId) pageIdToNodeId.set(n.data.techCraftId, n.id);
  });

  const [
    relationIdToTitle,
    relationIdToTitleIngredients,
    relationIdToTitleUsedCraftStation,
    relationIdToTitleUsedStation,
  ] = await Promise.all([
    fetchOpenConditionRelationIdToTitle(pages, config, options),
    fetchIngredientsRelationIdToTitle(pages, config, options),
    fetchUsedCraftStationRelationIdToTitle(pages, config, options),
    fetchUsedStationRelationIdToTitle(pages, config, options),
  ]);
  return pagesToNodesAndEdges(
    pages,
    config,
    pageIdToNodeId,
    relationIdToTitle,
    relationIdToTitleIngredients,
    relationIdToTitleUsedCraftStation,
    relationIdToTitleUsedStation
  );
};

/** Incremental pull: fetch only pages edited after lastSyncTime and merge with local */
export const pullFromNotionIncremental = async (
  config: NotionConfig,
  lastSyncTime: string | null,
  localNodes: TechNode[],
  localEdges: TechEdge[],
  corsProxy?: string
): Promise<{ nodes: TechNode[]; edges: TechEdge[]; notionFieldColors: Record<string, Record<string, string>> }> => {
  if (!lastSyncTime) {
    return pullFromNotion(config, corsProxy);
  }

  const { nodes: pulledNodes, edges: pulledEdges, notionFieldColors: pulledColors } = await pullChangedPagesAsRemote(
    config,
    lastSyncTime,
    localNodes,
    corsProxy
  );
  if (pulledNodes.length === 0) {
    return { nodes: [...localNodes], edges: [...localEdges], notionFieldColors: pulledColors };
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
        if (local) return mergeNodeFieldLevel(local, pulled, lastSyncTime);
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

  return { nodes: mergedNodes, edges: mergedEdges, notionFieldColors: pulledColors };
};

/** Field keys and display labels for diff comparison */
export const DIFF_FIELD_LABELS: Record<string, string> = {
  position: 'Позиция',
  label: 'Название',
  techForAct: 'Акт',
  stage: 'Стадия',
  category: 'Категория',
  incomingLinks: 'Входящие связи',
  outgoingLinks: 'Исходящие связи',
  powerType: 'Тип питания',
  gameStatus: 'Статус в игре',
  designStatus: 'Статус дизайна',
  notionSyncStatus: 'Статус Notion',
  openCondition: 'Условие открытия',
  ingredients: 'Ингредиенты',
  lineData: 'Маршруты линий',
};
const DIFF_FIELDS: { key: string; label: string }[] = Object.entries(DIFF_FIELD_LABELS).map(([key, label]) => ({
  key,
  label,
}));

const norm = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).trim();
};

const nodeToken = (node: TechNode): string => {
  if (node.data.notionPageId) return `p:${node.data.notionPageId}`;
  if (node.data.techCraftId) return `t:${node.data.techCraftId}`;
  return `i:${node.id}`;
};

const collectNeighborTokens = (
  node: TechNode,
  edges: TechEdge[],
  nodeMapById: Map<string, TechNode>,
  direction: 'incoming' | 'outgoing'
): string[] => {
  const rel = edges.filter((e) =>
    direction === 'incoming' ? e.target === node.id : e.source === node.id
  );
  const tokens = rel
    .map((e) => (direction === 'incoming' ? nodeMapById.get(e.source) : nodeMapById.get(e.target)))
    .filter(Boolean)
    .map((n) => nodeToken(n as TechNode));
  return Array.from(new Set(tokens)).sort();
};

const tokensToLabels = (
  tokens: string[],
  localLabelByToken: Map<string, string>,
  remoteLabelByToken: Map<string, string>
): string[] =>
  tokens.map((t) => localLabelByToken.get(t) || remoteLabelByToken.get(t) || t);
/** Compare local and remote nodes, return list of per-field diffs for manual sync UI */
export const computeSyncDiffs = (
  localNodes: TechNode[],
  remoteNodes: TechNode[],
  _columnMapping: NotionColumnMapping,
  localEdges: TechEdge[] = [],
  remoteEdges: TechEdge[] = []
): SyncDiffItem[] => {
  const diffs: SyncDiffItem[] = [];
  const remoteByPageId = new Map(remoteNodes.map((n) => [n.data.notionPageId!, n]));
  const remoteByTechCraftId = new Map(
    remoteNodes.filter((n) => n.data.techCraftId).map((n) => [n.data.techCraftId!, n])
  );
  const localByPageId = new Map(localNodes.filter((n) => n.data.notionPageId).map((n) => [n.data.notionPageId!, n]));
  const localByTechCraftId = new Map(
    localNodes.filter((n) => n.data.techCraftId).map((n) => [n.data.techCraftId!, n])
  );
  const localById = new Map(localNodes.map((n) => [n.id, n]));
  const remoteById = new Map(remoteNodes.map((n) => [n.id, n]));
  const localLabelByToken = new Map(localNodes.map((n) => [nodeToken(n), n.data.label || n.id]));
  const remoteLabelByToken = new Map(remoteNodes.map((n) => [nodeToken(n), n.data.label || n.id]));

  for (const local of localNodes) {
    const remote = local.data.notionPageId
      ? remoteByPageId.get(local.data.notionPageId)
      : local.data.techCraftId
        ? remoteByTechCraftId.get(local.data.techCraftId)
        : undefined;

    if (remote) {
      for (const { key, label } of DIFF_FIELDS) {
        let localVal: unknown;
        let remoteVal: unknown;
        if (key === 'position') {
          localVal = local.position;
          remoteVal = remote.position;
        } else if (key === 'label') {
          localVal = local.data.label;
          remoteVal = remote.data.label;
        } else if (key === 'techForAct') {
          localVal = local.data.techForAct ?? local.data.act;
          remoteVal = remote.data.techForAct ?? remote.data.act;
        } else if (key === 'openCondition') {
          localVal = local.data.openCondition ?? '';
          remoteVal = remote.data.openCondition ?? '';
        } else if (key === 'lineData') {
          // Local line data: outgoing edges' waypoints and pathType
          const localOutgoing = localEdges.filter((e) => e.source === local.id);
          const lineDataObj: Record<string, any> = {};
          for (const edge of localOutgoing) {
            if (edge.waypoints?.length || edge.pathType) {
              lineDataObj[edge.id] = {
                ...(edge.waypoints?.length ? { waypoints: edge.waypoints } : {}),
                ...(edge.pathType ? { pathType: edge.pathType } : {}),
              };
            }
          }
          localVal = Object.keys(lineDataObj).length > 0 ? lineDataObj : null;

          // Remote line data: already computed and stored in remoteEdges
          const remoteOutgoing = remoteEdges.filter((e) => e.source === remote.id);
          const remLineDataObj: Record<string, any> = {};
          for (const edge of remoteOutgoing) {
            if (edge.waypoints?.length || edge.pathType) {
              remLineDataObj[edge.id] = {
                ...(edge.waypoints?.length ? { waypoints: edge.waypoints } : {}),
                ...(edge.pathType ? { pathType: edge.pathType } : {}),
              };
            }
          }
          remoteVal = Object.keys(remLineDataObj).length > 0 ? remLineDataObj : null;
        } else if (key === 'incomingLinks' || key === 'outgoingLinks') {
          continue;
        } else {
          localVal = (local.data as any)[key];
          remoteVal = (remote.data as any)[key];
        }
        if (norm(localVal) !== norm(remoteVal)) {
          diffs.push({
            nodeId: local.id,
            nodeLabel: local.data.label || local.id,
            notionPageId: local.data.notionPageId,
            field: key,
            fieldLabel: label,
            localValue: localVal,
            remoteValue: remoteVal,
            kind: 'both',
          });
        }
      }

      const localIncomingTokens = collectNeighborTokens(local, localEdges, localById, 'incoming');
      const localOutgoingTokens = collectNeighborTokens(local, localEdges, localById, 'outgoing');
      const remoteIncomingTokens = collectNeighborTokens(remote, remoteEdges, remoteById, 'incoming');
      const remoteOutgoingTokens = collectNeighborTokens(remote, remoteEdges, remoteById, 'outgoing');

      if (norm(localIncomingTokens) !== norm(remoteIncomingTokens)) {
        diffs.push({
          nodeId: local.id,
          nodeLabel: local.data.label || local.id,
          notionPageId: local.data.notionPageId,
          field: 'incomingLinks',
          fieldLabel: DIFF_FIELD_LABELS.incomingLinks,
          localValue: tokensToLabels(localIncomingTokens, localLabelByToken, remoteLabelByToken),
          remoteValue: tokensToLabels(remoteIncomingTokens, localLabelByToken, remoteLabelByToken),
          kind: 'both',
        });
      }

      if (norm(localOutgoingTokens) !== norm(remoteOutgoingTokens)) {
        diffs.push({
          nodeId: local.id,
          nodeLabel: local.data.label || local.id,
          notionPageId: local.data.notionPageId,
          field: 'outgoingLinks',
          fieldLabel: DIFF_FIELD_LABELS.outgoingLinks,
          localValue: tokensToLabels(localOutgoingTokens, localLabelByToken, remoteLabelByToken),
          remoteValue: tokensToLabels(remoteOutgoingTokens, localLabelByToken, remoteLabelByToken),
          kind: 'both',
        });
      }
    } else if (local.data.notionPageId || local.data.techCraftId) {
      diffs.push({
        nodeId: local.id,
        nodeLabel: local.data.label || local.id,
        notionPageId: local.data.notionPageId,
        field: '_node',
        fieldLabel: 'Нода (только локально)',
        localValue: local,
        remoteValue: null,
        kind: 'localOnly',
      });
    }
  }

  for (const remote of remoteNodes) {
    const local = remote.data.notionPageId
      ? localByPageId.get(remote.data.notionPageId)
      : remote.data.techCraftId
        ? localByTechCraftId.get(remote.data.techCraftId)
        : undefined;
    if (!local) {
      diffs.push({
        nodeId: remote.id,
        nodeLabel: remote.data.label || remote.id,
        notionPageId: remote.data.notionPageId,
        field: '_node',
        fieldLabel: 'Нода (только в Notion)',
        localValue: null,
        remoteValue: remote,
        kind: 'remoteOnly',
      });
    }
  }

  return diffs;
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

  // Select/Status: Act (TechForAct)
  const actCol = cm.act ?? (cm as any).actAndStage;
  const actVal = data.techForAct ?? data.act;
  if (actCol && actVal) {
    props[actCol] = { select: { name: String(actVal) } };
  }
  const stageCol = cm.stage ?? (cm as any).actStage;
  if (stageCol && data.stage) {
    props[stageCol] = { select: { name: String(data.stage) } };
  }
  if (data.category) {
    props[cm.category] = { select: { name: data.category } };
  }
  if (data.powerType) {
    props[cm.powerType] = { select: { name: data.powerType } };
  }
  // Status properties (Notion type "status", not "select")
  if (data.gameStatus) {
    props[cm.gameStatus] = { status: { name: data.gameStatus } };
  }
  if (data.designStatus) {
    props[cm.designStatus] = { status: { name: data.designStatus } };
  }
  if (data.notionSyncStatus) {
    props[cm.notionSyncStatus] = { status: { name: data.notionSyncStatus } };
  }
  // OpenCondition: Notion type "relation" - build from openConditionRefs (pageId or resolve by name via nodeMap)
  if (cm.openCondition && data.openConditionRefs?.length) {
    const openConditionRelation = data.openConditionRefs
      .map((ref) => {
        if (ref.pageId) return ref.pageId;
        const byName = Array.from(nodeMap.values()).find((n) => n.data?.label === ref.name);
        return byName?.data?.notionPageId;
      })
      .filter(Boolean)
      .map((pageId) => ({ id: pageId as string }));
    if (openConditionRelation.length > 0) {
      props[cm.openCondition] = { relation: openConditionRelation };
    }
  }

  // UsedCraftStation: Notion type "relation" - build from usedCraftStationRefs
  if (cm.usedCraftStation && data.usedCraftStationRefs?.length) {
    const usedCraftStationRelation = data.usedCraftStationRefs
      .map((ref) => {
        if (ref.pageId) return ref.pageId;
        const byName = Array.from(nodeMap.values()).find((n) => n.data?.label === ref.name);
        return byName?.data?.notionPageId;
      })
      .filter(Boolean)
      .map((pageId) => ({ id: pageId as string }));
    if (usedCraftStationRelation.length > 0) {
      props[cm.usedCraftStation] = { relation: usedCraftStationRelation };
    }
  }

  // Ingridients: Notion type "relation" — build from ingredients
  if (cm.ingredients && data.ingredients?.length) {
    const ingredientsRelation = data.ingredients
      .map((ref) => {
        if (ref.pageId) return ref.pageId;
        const byName = Array.from(nodeMap.values()).find((n) => n.data?.label === ref.name);
        return byName?.data?.notionPageId;
      })
      .filter(Boolean)
      .map((pageId) => ({ id: pageId as string }));
    if (ingredientsRelation.length > 0) {
      props[cm.ingredients] = { relation: ingredientsRelation };
    }
  }

  // UsedStation: Notion type "relation" - build from usedStations
  if (cm.usedStation && data.usedStations?.length) {
    const usedStationRelation = data.usedStations
      .map((ref) => {
        if (ref.pageId) return ref.pageId;
        const byName = Array.from(nodeMap.values()).find((n) => n.data?.label === ref.name);
        return byName?.data?.notionPageId;
      })
      .filter(Boolean)
      .map((pageId) => ({ id: pageId as string }));
    if (usedStationRelation.length > 0) {
      props[cm.usedStation] = { relation: usedStationRelation };
    }
  }

  // Relations: PrevTechs - O(1) lookups via nodeMap
  const incomingEdges = edges.filter(e => e.target === nodeId);
  const prevRelations = incomingEdges
    .map(e => nodeMap.get(e.source)?.data?.notionPageId)
    .filter(Boolean)
    .map(pageId => ({ id: pageId }));

  if (cm.prevTechs && prevRelations.length > 0) {
    props[cm.prevTechs] = { relation: prevRelations };
  }

  // Relations: NextTechs - O(1) lookups via nodeMap
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  const nextRelations = outgoingEdges
    .map(e => nodeMap.get(e.target)?.data?.notionPageId)
    .filter(Boolean)
    .map(pageId => ({ id: pageId }));

  if (cm.nextTechs && nextRelations.length > 0) {
    props[cm.nextTechs] = { relation: nextRelations };
  }

  // EditorPosition - store node coordinates as JSON
  if (cm.editorPosition && position) {
    props[cm.editorPosition] = {
      rich_text: [{
        text: {
          content: JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) })
        }
      }]
    };
  }

  // LineData - serialize outgoing edge waypoints/pathType as JSON
  if (cm.lineData) {
    const lineDataObj: Record<string, { waypoints?: { x: number; y: number }[]; pathType?: string }> = {};
    for (const edge of outgoingEdges) {
      if (edge.waypoints?.length || edge.pathType) {
        lineDataObj[edge.id] = {
          ...(edge.waypoints?.length ? { waypoints: edge.waypoints } : {}),
          ...(edge.pathType ? { pathType: edge.pathType } : {}),
        };
      }
    }
    const content = Object.keys(lineDataObj).length > 0 ? JSON.stringify(lineDataObj) : '';
    props[cm.lineData] = {
      rich_text: [{ text: { content } }],
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

/** Push local nodes to Notion - create new or update existing pages (parallelized).
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

export const archiveNotionPages = async (
  pageIds: Iterable<string>,
  config: NotionConfig,
  corsProxy?: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ archivedIds: string[]; errors: string[] }> => {
  const unique = Array.from(
    new Set(
      Array.from(pageIds).filter((pageId): pageId is string => typeof pageId === 'string' && pageId.length > 0)
    )
  );
  if (unique.length === 0) return { archivedIds: [], errors: [] };

  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  const archivedIds: string[] = [];
  const errors: string[] = [];

  const tasks = unique.map((pageId, index) => async () => {
    try {
      await notionFetch(`/pages/${pageId}`, options, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true }),
      });
      archivedIds.push(pageId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Treat missing/already-removed pages as already archived (idempotent behavior).
      if (msg.includes('Notion API error 404')) {
        archivedIds.push(pageId);
      } else {
        errors.push(`${pageId}: ${msg}`);
      }
    } finally {
      onProgress?.(index + 1, unique.length);
    }
  });

  await parallelLimit(tasks, PUSH_CONCURRENCY);
  return { archivedIds, errors };
};

/** Build a single Notion property for PATCH (partial update) */
function buildSingleNotionProperty(
  field: string,
  value: unknown,
  config: NotionConfig,
  nodeMap?: Map<string, TechNode>,
  edges?: TechEdge[],
  nodeId?: string
): Record<string, unknown> | null {
  const cm = config.columnMapping;
  if (field === 'position') {
    const pos = value as { x: number; y: number };
    if (!cm.editorPosition || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return null;
    return {
      [cm.editorPosition]: {
        rich_text: [{ text: { content: JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }) } }],
      },
    };
  }
  if (field === 'label') {
    if (!cm.workingName) return null;
    return { [cm.workingName]: { title: [{ text: { content: String(value ?? '') } }] } };
  }
  if (field === 'ingredients' && cm.ingredients) {
    const refs = Array.isArray(value) ? (value as Array<{ name?: string; pageId?: string }>) : [];
    const relation = refs
      .map((ref) => {
        if (ref?.pageId) return ref.pageId;
        if (!ref?.name || !nodeMap) return undefined;
        const byName = Array.from(nodeMap.values()).find((n) => n.data?.label === ref.name);
        return byName?.data?.notionPageId;
      })
      .filter(Boolean)
      .map((pageId) => ({ id: pageId as string }));
    return { [cm.ingredients]: { relation } };
  }
  const strVal = value != null ? String(value) : '';
  if (field === 'techForAct' && cm.act) return { [cm.act]: { select: { name: strVal } } };
  if (field === 'stage' && cm.stage) return { [cm.stage]: { select: { name: strVal } } };
  if (field === 'category' && cm.category) return { [cm.category]: { select: { name: strVal } } };
  if (field === 'powerType' && cm.powerType) return { [cm.powerType]: { select: { name: strVal } } };
  if (field === 'gameStatus' && cm.gameStatus) return { [cm.gameStatus]: { status: { name: strVal } } };
  if (field === 'designStatus' && cm.designStatus) return { [cm.designStatus]: { status: { name: strVal } } };
  if (field === 'notionSyncStatus' && cm.notionSyncStatus) return { [cm.notionSyncStatus]: { status: { name: strVal } } };
  if ((field === 'incomingLinks' || field === 'outgoingLinks') && nodeMap && edges && nodeId) {
    if (field === 'incomingLinks' && cm.prevTechs) {
      const incomingRelations = edges
        .filter((e) => e.target === nodeId)
        .map((e) => nodeMap.get(e.source)?.data?.notionPageId)
        .filter(Boolean)
        .map((pageId) => ({ id: pageId as string }));
      return { [cm.prevTechs]: { relation: incomingRelations } };
    }
    if (field === 'outgoingLinks' && cm.nextTechs) {
      const outgoingRelations = edges
        .filter((e) => e.source === nodeId)
        .map((e) => nodeMap.get(e.target)?.data?.notionPageId)
        .filter(Boolean)
        .map((pageId) => ({ id: pageId as string }));
      return { [cm.nextTechs]: { relation: outgoingRelations } };
    }
  }
  return null;
}

/** Patch a single property of a Notion page. Returns updated page or throws. */
export const pushNodePropertyToNotion = async (
  pageId: string,
  field: string,
  value: unknown,
  config: NotionConfig,
  corsProxy?: string,
  node?: TechNode,
  nodeMap?: Map<string, TechNode>,
  edges?: TechEdge[]
): Promise<void> => {
  const props = buildSingleNotionProperty(
    field,
    value,
    config,
    nodeMap,
    edges,
    node?.id
  );
  if (!props || Object.keys(props).length === 0) {
    throw new Error(`Cannot push field "${field}" to Notion`);
  }
  const options: NotionApiOptions = { apiKey: config.apiKey, corsProxy };
  await notionFetch(`/pages/${pageId}`, options, {
    method: 'PATCH',
    body: JSON.stringify({ properties: props }),
  });
};

/** Field-level merge: take position/data from whichever was modified after lastSyncTime. */
const mergeNodeFieldLevel = (
  local: TechNode,
  remote: TechNode,
  lastSyncTime: string | null | undefined
): TechNode => {
  const cutoff = lastSyncTime || '1970-01-01T00:00:00Z';
  const cutoffMs = new Date(cutoff).getTime();

  const useLocalPosition =
    new Date(local.data.positionModifiedAt || 0).getTime() > cutoffMs;
  const useLocalData =
    new Date(local.data.localModifiedAt || 0).getTime() > cutoffMs;

  const position = useLocalPosition ? local.position : remote.position;
  const data: NodeData = useLocalData
    ? { ...local.data, notionPageId: remote.data.notionPageId || local.data.notionPageId }
    : { ...remote.data, notionPageId: remote.data.notionPageId || local.data.notionPageId };

  return {
    ...local,
    position,
    data,
  };
};

/** Bidirectional sync: pull remote, compare with local, resolve conflicts */
export const bidirectionalSync = async (
  localNodes: TechNode[],
  localEdges: TechEdge[],
  config: NotionConfig,
  corsProxy?: string,
  lastSyncTime?: string | null,
  options?: {
    ignoreNotionPageIds?: Set<string>;
  }
): Promise<{
  mergedNodes: TechNode[];
  mergedEdges: TechEdge[];
  result: SyncResult;
  notionFieldColors: Record<string, Record<string, string>>;
}> => {
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, conflicts: [], errors: [] };

  const remote = lastSyncTime
    ? await pullChangedPagesAsRemote(config, lastSyncTime, localNodes, corsProxy)
    : await pullFromNotion(config, corsProxy);

  if (lastSyncTime && remote.nodes.length === 0) {
    return { mergedNodes: localNodes, mergedEdges: localEdges, result, notionFieldColors: remote.notionFieldColors || {} };
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
  const ignorePageIds = options?.ignoreNotionPageIds ?? new Set<string>();
  const ignoredRemoteNodeIds = new Set<string>();
  remote.nodes.forEach(n => {
    if (n.data.techCraftId) remoteByTechCraftId.set(n.data.techCraftId, n);
    if (n.data.notionPageId) remoteByNotionPageId.set(n.data.notionPageId, n);
    if (n.data.notionPageId && ignorePageIds.has(n.data.notionPageId)) {
      ignoredRemoteNodeIds.add(n.id);
    }
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
      const merged = mergeNodeFieldLevel(localNode, remoteNode, lastSyncTime);
      mergedNodes.push(merged);
      result.updated++;
    } else {
      // Only exists locally - keep it
      mergedNodes.push(localNode);
    }
  }

  // Add remote-only nodes (new from Notion)
  for (const remoteNode of remote.nodes) {
    if (!processedRemoteIds.has(remoteNode.id)) {
      if (remoteNode.data.notionPageId && ignorePageIds.has(remoteNode.data.notionPageId)) {
        continue;
      }
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
  const allowedNodeIds = new Set(mergedNodes.map((n) => n.id));
  const allEdges = [
    ...localEdges,
    ...remote.edges.filter(
      (edge) =>
        !ignoredRemoteNodeIds.has(edge.source) &&
        !ignoredRemoteNodeIds.has(edge.target)
    ),
  ];
  const mergedEdges = allEdges
    .filter(
      (edge, i, self) =>
        i === self.findIndex((t) => t.source === edge.source && t.target === edge.target)
    )
    .filter((edge) => allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target));

  return { mergedNodes, mergedEdges, result, notionFieldColors: remote.notionFieldColors || {} };
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
