import type { TechNode, TechEdge, FilterRule, FilterProperty } from '../types';

/** Returns Set of node IDs that have at least one edge (as source or target). */
export function getConnectedNodeIds(edges: TechEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const e of edges) {
    ids.add(e.source);
    ids.add(e.target);
  }
  return ids;
}

function getIngredientNames(node: TechNode): string[] {
  const items = node.data?.ingredients;
  if (!Array.isArray(items)) return [];
  return items.map((i: { name?: string }) => i?.name ?? '').filter(Boolean);
}

function getOpenConditionRefNames(node: TechNode): string[] {
  const refs = node.data?.openConditionRefs;
  if (!Array.isArray(refs)) return [];
  return refs.map((r: { name?: string }) => r?.name ?? '').filter(Boolean);
}

function matchesAnyValueRule(valuesFromNode: string[], rule: FilterRule): boolean {
  const hasValues = valuesFromNode.length > 0;
  if (rule.condition === 'isEmpty') return !hasValues;
  if (rule.condition === 'isNotEmpty') return hasValues;
  if (rule.condition === 'is') {
    return rule.values.length > 0 && rule.values.some((v) => valuesFromNode.includes(v));
  }
  if (rule.condition === 'isNot') {
    return rule.values.length === 0 || !rule.values.some((v) => valuesFromNode.includes(v));
  }
  return false;
}

function getPropertyValue(node: TechNode, property: FilterProperty): string {
  if (property === 'openConditionRefs') {
    return getOpenConditionRefNames(node).join('\x00');
  }
  if (property === 'ingredients') {
    return getIngredientNames(node).join('\x00');
  }
  if (property === 'act') {
    const raw = node.data?.techForAct ?? node.data?.act;
    if (raw === undefined || raw === null) return '';
    return String(raw).trim();
  }
  if (property === 'usedCraftStation') {
    const raw = node.data?.usedCraftStation ?? node.data?.usedCraftStationRefs?.map((r: { name?: string }) => r.name).filter(Boolean).join(', ');
    if (raw === undefined || raw === null || raw === '') return '';
    return String(raw).trim();
  }
  if (property === 'formulaUsedStation' || property === 'usedStation') {
    const raw = node.data?.usedStations?.map((r: { name?: string }) => r.name).filter(Boolean).join(', ');
    if (raw === undefined || raw === null || raw === '') return '';
    return String(raw).trim();
  }
  const raw = node.data?.[property];
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

export function nodeMatchesRules(node: TechNode, rules: FilterRule[]): boolean {
  if (rules.length === 0) return true;
  return rules.every((rule) => {
    if (rule.property === 'openConditionRefs') {
      return matchesAnyValueRule(getOpenConditionRefNames(node), rule);
    }
    if (rule.property === 'ingredients') {
      return matchesAnyValueRule(getIngredientNames(node), rule);
    }
    const val = getPropertyValue(node, rule.property);
    const isEmpty = !val;
    if (rule.condition === 'isEmpty') return isEmpty;
    if (rule.condition === 'isNotEmpty') return !isEmpty;
    if (rule.condition === 'is') return rule.values.length > 0 && rule.values.includes(val);
    if (rule.condition === 'isNot') return rule.values.length === 0 || !rule.values.includes(val);
    return false;
  });
}

/** Collect unique values for a filter property from nodes */
export function collectUniqueValuesForFilter(
  nodes: TechNode[],
  property: FilterProperty
): string[] {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (property === 'openConditionRefs') {
      for (const name of getOpenConditionRefNames(node)) {
        if (name) seen.add(name);
      }
    } else if (property === 'ingredients') {
      for (const name of getIngredientNames(node)) {
        if (name) seen.add(name);
      }
    } else {
      const val = getPropertyValue(node, property);
      if (val) seen.add(val);
    }
  }
  return Array.from(seen).sort();
}

/** Build uniqueValues map for all filter properties */
export function buildUniqueValuesMap(nodes: TechNode[]): Record<FilterProperty, string[]> {
  const props: FilterProperty[] = [
    'act', 'stage', 'category', 'powerType', 'gameStatus', 'designStatus',
    'notionSyncStatus', 'techGameStatus', 'techForAct', 'openCondition',
    'openConditionRefs', 'ingredients', 'outputItem', 'usedCraftStation', 'usedStation', 'itemLootingInAct',
    'electricCost', 'researchTime',
  ];
  const out: Record<string, string[]> = {};
  for (const p of props) {
    out[p] = collectUniqueValuesForFilter(nodes, p);
  }
  return out as Record<FilterProperty, string[]>;
}
