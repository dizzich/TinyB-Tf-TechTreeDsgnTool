import type { NodeColorBy } from '../types';
import { DEFAULT_NODE_COLOR_PALETTE } from '../types';

/** Parse hex color to r,g,b (0-255). Supports #abc and #aabbcc. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const raw = m[1];
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

/** Darken a hex color by multiplying RGB by factor (0–1). Returns hex. */
export function darkenHex(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const r = Math.round(Math.max(0, rgb.r * factor));
  const g = Math.round(Math.max(0, rgb.g * factor));
  const b = Math.round(Math.max(0, rgb.b * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by blending toward white. Factor 0 = unchanged, 1 = white. Returns hex. */
export function lightenHex(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const r = Math.round(Math.min(255, rgb.r + (255 - rgb.r) * factor));
  const g = Math.round(Math.min(255, rgb.g + (255 - rgb.g) * factor));
  const b = Math.round(Math.min(255, rgb.b + (255 - rgb.b) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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
      return (data.techForAct ?? data.act) != null ? String(data.techForAct ?? data.act) : undefined;
    case 'powerType':
      return data.powerType;
    case 'gameStatus':
      return data.gameStatus;
    case 'openCondition':
      return data.openCondition;
    case 'usedCraftStation':
      return data.usedCraftStationRefs?.[0]?.name ?? data.usedCraftStation ?? data.usedCraftStationRefs?.map((r: { name?: string }) => r.name).filter(Boolean).join(', ') ?? undefined;
    case 'usedStation':
      return data.usedStations?.[0]?.name ?? data.usedStations?.map((r: { name?: string }) => r.name).filter(Boolean).join(', ') ?? undefined;
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

