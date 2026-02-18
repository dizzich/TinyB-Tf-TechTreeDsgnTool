import type { NodeColorBy } from '../types';
import { DEFAULT_NODE_COLOR_PALETTE } from '../types';

/** Key for nodes with no value in the colored attribute */
export const EMPTY_VALUE_KEY = '';

/** Get the string value used for coloring from node data */
export function getColorValue(data: Record<string, any>, colorBy: NodeColorBy): string | undefined {
  switch (colorBy) {
    case 'category':
      return data.category;
    case 'stage':
      return data.stage != null ? String(data.stage) : undefined;
    case 'act':
      return data.act != null ? String(data.act) : undefined;
    case 'powerType':
      return data.powerType;
    case 'gameStatus':
      return data.gameStatus;
    case 'openCondition':
      return data.openCondition;
    default:
      return data.category;
  }
}

/** Internal: normalize value for map key */
function toMapKey(value: string | undefined): string {
  return value === undefined || value === '' ? EMPTY_VALUE_KEY : value;
}

/** Resolve color for a value: explicit map first, then Notion defaults, then hash from palette */
export function resolveNodeColor(
  value: string | undefined,
  colorMap?: Record<string, string>,
  palette?: string[],
  notionDefaults?: Record<string, string>
): string {
  const key = toMapKey(value);
  if (colorMap && colorMap[key]) return colorMap[key];
  if (notionDefaults && notionDefaults[key]) return notionDefaults[key];

  const colors = palette?.length ? palette : DEFAULT_NODE_COLOR_PALETTE;
  if (!value) return colors[0];

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Collect unique values from nodes for the given attribute, plus empty */
export function collectUniqueValues(
  nodes: { data?: Record<string, any> }[],
  colorBy: NodeColorBy
): { value: string; displayLabel: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    const raw = getColorValue(node.data ?? {}, colorBy);
    const key = raw === undefined || raw === '' ? EMPTY_VALUE_KEY : raw;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([key, count]) => ({
    value: key,
    displayLabel: key === EMPTY_VALUE_KEY ? '(без значения)' : key,
    count,
  }));
}

