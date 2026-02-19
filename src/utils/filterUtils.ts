import type { TechNode, FilterRule, FilterProperty } from '../types';

function getPropertyValue(node: TechNode, property: FilterProperty): string {
  if (property === 'openConditionRefs') {
    const refs = node.data?.openConditionRefs;
    if (!Array.isArray(refs) || refs.length === 0) return '';
    return refs.map((r: { name?: string }) => r?.name ?? '').filter(Boolean).join('\x00');
  }
  const raw = node.data?.[property];
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

function getOpenConditionRefNames(node: TechNode): string[] {
  const refs = node.data?.openConditionRefs;
  if (!Array.isArray(refs)) return [];
  return refs.map((r: { name?: string }) => r?.name ?? '').filter(Boolean);
}

export function nodeMatchesRules(node: TechNode, rules: FilterRule[]): boolean {
  if (rules.length === 0) return true;
  return rules.every((rule) => {
    if (rule.property === 'openConditionRefs') {
      const refNames = getOpenConditionRefNames(node);
      const hasRefs = refNames.length > 0;
      if (rule.condition === 'isEmpty') return !hasRefs;
      if (rule.condition === 'isNotEmpty') return hasRefs;
      if (rule.condition === 'is') {
        return rule.values.length > 0 && rule.values.some((v) => refNames.includes(v));
      }
      if (rule.condition === 'isNot') {
        return rule.values.length === 0 || !rule.values.some((v) => refNames.includes(v));
      }
      return false;
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
    'openConditionRefs', 'outputItem', 'formulaUsedStation', 'itemLootingInAct',
    'electricCost', 'researchTime',
  ];
  const out: Record<string, string[]> = {};
  for (const p of props) {
    out[p] = collectUniqueValuesForFilter(nodes, p);
  }
  return out as Record<FilterProperty, string[]>;
}
