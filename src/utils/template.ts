type NotionRef = { name?: string };
type IngredientEntry = { name?: string; qty?: number };

function formatNotionRefs(arr: unknown): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr
    .map((r: NotionRef) => r?.name ?? '')
    .filter(Boolean)
    .join(', ');
}

function formatIngredientEntries(arr: unknown): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr
    .map((r: IngredientEntry) => {
      const name = r?.name ?? '';
      const qty = r?.qty;
      return qty != null ? `${name} ×${qty}` : name;
    })
    .filter(Boolean)
    .join(', ');
}

export const renderTemplate = (template: string, data: any): string => {
  return template.replace(/%([a-zA-Z0-9_]+)%/g, (_match, key) => {
    const val = data[key];

    switch (key) {
      case 'act':
        return val !== undefined && val !== null ? String(val) : (data.techForAct != null ? String(data.techForAct) : '');
      case 'usedStation':
        return formatNotionRefs(data.usedStations);
      case 'tags':
        return Array.isArray(val) ? val.filter(Boolean).join(', ') : val != null ? String(val) : '';
      case 'ingredients':
        return formatIngredientEntries(val);
      case 'recipeDetail':
        return formatIngredientEntries(val);
      case 'outputItemRef':
        if (val && typeof val === 'object' && 'name' in val) return val.name ?? '';
        return data.outputItem != null ? String(data.outputItem) : '';
      case 'openConditionRefs':
        return formatNotionRefs(val);
      case 'usedCraftStationRefs':
        return formatNotionRefs(val);
      case 'prevTechRefs':
        return formatNotionRefs(val);
      case 'nextTechRefs':
        return formatNotionRefs(val);
      default:
        return val !== undefined && val !== null ? String(val) : '';
    }
  });
};
