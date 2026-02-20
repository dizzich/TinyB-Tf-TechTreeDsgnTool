import Papa from 'papaparse';
import { TechNode, TechEdge, ImportMapping, NodeData, NotionRef, IngredientEntry } from '../types';

/** Parse Notion link format: "Name (https://www.notion.so/pageId?pvs=21)" */
export const parseNotionLink = (s: string): NotionRef => {
  const trimmed = (s || '').trim();
  if (!trimmed) return { name: '' };
  const m = trimmed.match(/^(.+?)\s*\(https:\/\/www\.notion\.so\/([a-f0-9-]+)/);
  return m ? { name: m[1].trim(), pageId: m[2] } : { name: trimmed };
};

/** Build Notion link format: "Name (https://www.notion.so/pageId?pvs=21)" */
export const buildNotionLink = (ref: NotionRef): string => {
  if (!ref.name) return '';
  if (!ref.pageId) return ref.name;
  return `${ref.name} (https://www.notion.so/${ref.pageId}?pvs=21)`;
};

/** Split Notion relation string into entries (handles "Name (url), Name (url)" format) */
export const splitNotionRelations = (str: string): string[] => {
  if (!str || typeof str !== 'string') return [];
  // Split on comma that is NOT inside parentheses (Notion URLs contain parentheses)
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/** Parse relation entries into NotionRef array */
export const parseNotionRelations = (str: string): NotionRef[] => {
  return splitNotionRelations(str).map(parseNotionLink).filter(r => r.name);
};

/** Parse RecipeDetail — lines like "Бревно (url) 2шт\nПалка (url) 3шт" */
export const parseRecipeDetail = (str: string): IngredientEntry[] => {
  if (!str || typeof str !== 'string') return [];
  // Split by newlines or semicolons
  const lines = str.split(/[\n;]/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    // Extract quantity pattern: "2шт", "2 шт", "x2" at end of string
    const qtyMatch = line.match(/\s+(\d+)\s*(?:шт|pcs|x)?\s*$/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : undefined;
    // Remove quantity from line to parse the rest as Notion link
    const nameStr = qtyMatch ? line.slice(0, qtyMatch.index).trim() : line;
    const ref = parseNotionLink(nameStr);
    return { ...ref, qty };
  });
};

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
};

export const parseCSVString = (csvString: string): any[] => {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
};

export const generateGraphFromCSV = (
  data: any[],
  mapping: ImportMapping
): { nodes: TechNode[], edges: TechEdge[] } => {
  const nodes: TechNode[] = [];
  const edges: TechEdge[] = [];
  const idMap = new Map<string, string>(); // Map CSV ID/Name to Node ID

  // Detect if this is a Notion Crafts export (has TechCraftID and Notion-specific columns)
  const isNotionCrafts = data.length > 0 && (
    'TechCraftID' in (data[0] || {}) ||
    'CraftStatusInGame' in (data[0] || {})
  );

  // 1. Create Nodes
  data.forEach((row, index) => {
    const rawId = row[mapping.idColumn] || `node-${index}`;
    const nodeId = String(rawId).trim();

    idMap.set(nodeId, nodeId);
    const labelVal = row[mapping.labelColumn];
    if (labelVal) idMap.set(String(labelVal).trim(), nodeId);

    // Parse Notion-specific fields
    const ingredientsRaw = row.Ingridients || row.formulaIngridients || '';
    const usedStationRaw = row.UsedStation || '';
    const outputItemRaw = row.OutputItem || '';
    const recipeDetailRaw = row.RecipeDetail || '';
    const prevTechsRaw = mapping.dependencyColumn ? row[mapping.dependencyColumn] || '' : '';
    const nextTechsRaw = mapping.nextTechsColumn ? row[mapping.nextTechsColumn] || '' : '';

    // Parse output item (may be Notion link)
    const outputItemRef = outputItemRaw ? parseNotionLink(outputItemRaw) : undefined;

    // Determine notionPageId from the row's OutputItem or from ID patterns
    let notionPageId: string | undefined;
    if (outputItemRef?.pageId) {
      // If OutputItem has a Notion link, extract page ID for this craft's output
    }
    // Check if any field has a Notion URL containing this row's identity
    // For Notion exports, there's no direct "this page's ID" column,
    // but we store the TechCraftID as primary identifier

    const nodeData: NodeData = {
      // Spread all raw CSV fields for template engine access
      ...row,
      // Core mapped fields
      label: labelVal ?? row[mapping.labelColumn],
      act: row[mapping.actColumn],
      stage: row[mapping.stageColumn],
      category: row[mapping.categoryColumn],

      // Notion identifiers
      techCraftId: mapping.idColumn && row[mapping.idColumn]
        ? String(row[mapping.idColumn]).trim()
        : undefined,
      notionPageId,

      // Formula fields (plain text, no URLs)
      formulaIngridients: row.formulaIngridients,
      outputItem: row.OutputItem,

      // Parsed structured data
      ingredients: isNotionCrafts ? parseNotionRelations(ingredientsRaw) : undefined,
      recipeDetail: isNotionCrafts && recipeDetailRaw ? parseRecipeDetail(recipeDetailRaw) : undefined,
      usedStations: isNotionCrafts && usedStationRaw ? parseNotionRelations(usedStationRaw) : undefined,
      outputItemRef: isNotionCrafts ? outputItemRef : undefined,
      prevTechRefs: isNotionCrafts && prevTechsRaw ? parseNotionRelations(prevTechsRaw) : undefined,
      nextTechRefs: isNotionCrafts && nextTechsRaw ? parseNotionRelations(nextTechsRaw) : undefined,

      // Notion status fields
      powerType: row.CraftStationPowerType || undefined,
      gameStatus: row.CraftStatusInGame || undefined,
      designStatus: row.TechCraftDesignStatus || undefined,
      notionSyncStatus: row.TechCraftNotionStatus || undefined,
      techGameStatus: row.TechStatusInGame || undefined,
      techForAct: row.TechForAct || undefined,
      openCondition: row.OpenCondition || undefined,
      itemLootingInAct: row.ItemLootingInAct || undefined,
      electricCost: row.ElectricCost || undefined,
      researchTime: row.ResearchTime || undefined,
      notes: row.Notes || undefined,
      outputDetail: row.OutputDetail || undefined,

      // Timestamps
      createdAt: row['Created time'] || undefined,
      updatedAt: row['Last edited time'] || undefined,
    };

    nodes.push({
      id: nodeId,
      position: { x: 0, y: 0 },
      data: nodeData,
      type: 'techNode',
    });
  });

  // Helper: resolve ref (ID, name, or "Name (url)") to nodeId
  const resolveToNodeId = (ref: string): string | null => {
    const byId = idMap.get(ref.trim());
    if (byId) return byId;
    const { name } = parseNotionLink(ref);
    return name ? idMap.get(name) ?? null : null;
  };

  // 2. Create Edges
  data.forEach((row, index) => {
    const rawId = row[mapping.idColumn] || `node-${index}`;
    const nodeId = idMap.get(String(rawId).trim());
    if (!nodeId) return;

    // PrevTechs (incoming): source = prereq, target = this node
    const prevTechsStr = mapping.dependencyColumn ? row[mapping.dependencyColumn] : '';
    if (prevTechsStr) {
      const entries = splitNotionRelations(prevTechsStr);
      entries.forEach((entry) => {
        const otherId = resolveToNodeId(entry);
        if (otherId && otherId !== nodeId) {
          edges.push({
            id: `e-${otherId}-${nodeId}`,
            source: otherId,
            target: nodeId,
            type: 'default',
            animated: true,
          });
        }
      });
    }

    // NextTechs (outgoing): source = this node, target = next
    const nextTechsStr = mapping.nextTechsColumn ? row[mapping.nextTechsColumn] : '';
    if (nextTechsStr) {
      const entries = splitNotionRelations(nextTechsStr);
      entries.forEach((entry) => {
        const otherId = resolveToNodeId(entry);
        if (otherId && otherId !== nodeId) {
          edges.push({
            id: `e-${nodeId}-${otherId}`,
            source: nodeId,
            target: otherId,
            type: 'default',
            animated: true,
          });
        }
      });
    }
  });

  // Deduplicate edges
  const uniqueEdges = edges.filter((edge, index, self) =>
    index === self.findIndex((t) => (
      t.source === edge.source && t.target === edge.target
    ))
  );

  return { nodes, edges: uniqueEdges };
};
