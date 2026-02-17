export interface Position {
  x: number;
  y: number;
}

/** Parsed Notion relation entry: name + optional Notion page ID */
export interface NotionRef {
  name: string;
  pageId?: string;
}

/** Ingredient with quantity parsed from RecipeDetail */
export interface IngredientEntry {
  name: string;
  pageId?: string;
  qty?: number;
}

export interface NodeData {
  label?: string; // For compatibility/display if template fails
  act?: string | number;
  stage?: string | number;
  category?: string;
  tags?: string[];
  description?: string;

  // --- Notion identifiers ---
  notionPageId?: string;
  techCraftId?: string;

  // --- Craft recipe data ---
  formulaIngridients?: string;
  formulaUsedStation?: string;
  outputItem?: string;
  /** Parsed ingredients with Notion refs */
  ingredients?: IngredientEntry[];
  /** Parsed recipe detail with quantities */
  recipeDetail?: IngredientEntry[];
  /** Output detail text */
  outputDetail?: string;
  /** Parsed used station(s) with Notion refs */
  usedStations?: NotionRef[];
  /** Parsed output item with Notion ref */
  outputItemRef?: NotionRef;

  // --- Relations (edges stored separately, but raw refs kept for sync) ---
  prevTechs?: string[];
  nextTechs?: string[];
  /** Parsed prev techs with Notion refs */
  prevTechRefs?: NotionRef[];
  /** Parsed next techs with Notion refs */
  nextTechRefs?: NotionRef[];

  // --- Notion status fields ---
  /** Power type: none, WindUp, Electricity */
  powerType?: string;
  /** In-game status: implemented, to update, to remove */
  gameStatus?: string;
  /** Design status: done, proposal, to rework, Canceled, outdated */
  designStatus?: string;
  /** Notion sync status: Synchronized, to update/sync, Draft, Archived */
  notionSyncStatus?: string;
  /** Tech game status: to do, backlog, was planned */
  techGameStatus?: string;
  /** Tech act: 🌳Act 1, 🍄Act 2, etc. */
  techForAct?: string;
  /** Open condition text */
  openCondition?: string;
  /** Item looting in act */
  itemLootingInAct?: string;
  /** Electric cost */
  electricCost?: string;
  /** Research time */
  researchTime?: string;
  /** Notes */
  notes?: string;

  // --- Timestamps ---
  createdAt?: string;
  updatedAt?: string;
  /** Last modified in editor (ISO). Used for sync to decide push. */
  localModifiedAt?: string;

  // Custom fields for template engine
  [key: string]: any;
}


export interface TechNode {
  id: string;
  position: Position;
  data: NodeData;
  type?: string;
  selected?: boolean;
}

export interface TechEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

// --- Notion API / Sync types ---

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  /** Column mapping for the connected database */
  columnMapping: NotionColumnMapping;
}

export interface NotionColumnMapping {
  /** Notion property name → WorkingName (title) */
  workingName: string;
  /** Notion property → TechCraftID */
  techCraftId: string;
  /** Notion property → ActAndStage */
  actAndStage: string;
  /** Notion property → ActStage */
  actStage: string;
  /** Notion property → CategoryFromItem */
  category: string;
  /** Notion relation property → PrevTechs */
  prevTechs: string;
  /** Notion relation property → NextTechs */
  nextTechs: string;
  /** Notion property → Ingridients (relation) */
  ingredients: string;
  /** Notion property → UsedStation (relation) */
  usedStation: string;
  /** Notion property → OutputItem (relation) */
  outputItem: string;
  /** Notion property → CraftStationPowerType */
  powerType: string;
  /** Notion property → CraftStatusInGame */
  gameStatus: string;
  /** Notion property → TechCraftDesignStatus */
  designStatus: string;
  /** Notion property → TechCraftNotionStatus */
  notionSyncStatus: string;
  /** Notion property (rich_text) → Editor node position as JSON {"x":num,"y":num} */
  editorPosition: string;
}

export type SyncDirection = 'pull' | 'push' | 'bidirectional';

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  conflicts: SyncConflict[];
  errors: string[];
}

export interface SyncConflict {
  nodeId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolvedTo?: 'local' | 'remote';
}

export interface ImportMapping {
  idColumn: string;
  labelColumn: string;
  actColumn: string;
  stageColumn: string;
  categoryColumn: string;
  dependencyColumn: string; // Comma separated IDs or Names (PrevTechs)
  nextTechsColumn?: string; // Outgoing relations (NextTechs)
}

export interface ProjectSettings {
  layoutDirection: 'LR' | 'TB';
  nodeTemplate: string;
  renderSimplification: boolean;
}

export interface ProjectMeta {
  name: string;
  updatedAt: string;
  version: string;
}

export interface ProjectFile {
  version: string;
  meta: ProjectMeta;
  settings: ProjectSettings;
  nodes: TechNode[];
  edges: TechEdge[];
}
