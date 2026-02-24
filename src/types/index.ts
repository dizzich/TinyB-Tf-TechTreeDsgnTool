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
  itemCodeName?: string;

  // --- Craft recipe data ---
  formulaIngridients?: string;
  outputItem?: string;
  /** Parsed ingredients with Notion refs */
  ingredients?: IngredientEntry[];
  /** Parsed recipe detail with quantities */
  recipeDetail?: IngredientEntry[];
  /** Output detail text */
  outputDetail?: string;
  /** Parsed used station(s) with Notion refs */
  usedStations?: NotionRef[];
  /** Resolved display: на чём крафтится (from UsedCraftStation relation) */
  usedCraftStation?: string;
  /** Notion refs for UsedCraftStation (links) */
  usedCraftStationRefs?: NotionRef[];
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
  /** Open conditions as Notion refs (when source is Relation); used for links to Notion */
  openConditionRefs?: NotionRef[];
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
  /** When position was last changed (local drag or received from remote). For field-level merge. */
  positionModifiedAt?: string;

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

export interface EdgeWaypoint {
  x: number;
  y: number;
}

export type EdgePathType = 'bezier' | 'straight' | 'orthogonal';

export interface TechEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  /** Intermediate bend points between source and target (manual edge mode) */
  waypoints?: EdgeWaypoint[];
  /** Per-edge routing style used in manual edge mode */
  pathType?: EdgePathType;
}

// --- Notion API / Sync types ---

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  /** Display name of the Notion database (from API) */
  databaseTitle?: string;
  /** Column mapping for the connected database */
  columnMapping: NotionColumnMapping;
}

export interface NotionColumnMapping {
  /** Notion property name → WorkingName (title) */
  workingName: string;
  /** Notion property → TechCraftID */
  techCraftId: string;
  /** Notion property → Act (e.g. TechForAct: 🌳Act 1, 🍄Act 2) */
  act: string;
  /** Notion property → ActStage (Стадия) */
  stage: string;
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
  /** Notion property (relation) → UsedCraftStation */
  usedCraftStation: string;
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
  /** Notion property (relation) → OpenCondition; push uses relation, pull can also read rich_text/rollup */
  openCondition?: string;
  /** Notion property (rich_text) → Edge line data as JSON (waypoints, pathType per outgoing edge) */
  lineData?: string;
  /** Notion property (relation) → ItemCodeName */
  itemCodeName?: string;
}

export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/** Background sync mode: what runs in real time when connected */
export type SyncMode = 'push' | 'pull' | 'bidirectional' | 'pause';

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

/** Single diff when comparing graph and Notion */
export interface SyncDiffItem {
  nodeId: string;
  nodeLabel: string;
  notionPageId?: string;
  /** position | label | act | stage | category | powerType | ... */
  field: string;
  fieldLabel: string;
  localValue: unknown;
  remoteValue: unknown;
  /** 'both' = in both sides, 'localOnly' = only local, 'remoteOnly' = only in Notion */
  kind: 'both' | 'localOnly' | 'remoteOnly';
}

/** ManualSyncModal open mode */
export type ManualSyncMode = 'diff' | 'conflicts';

export interface ImportMapping {
  idColumn: string;
  labelColumn: string;
  actColumn: string;
  stageColumn: string;
  categoryColumn: string;
  dependencyColumn: string; // Comma separated IDs or Names (PrevTechs)
  nextTechsColumn?: string; // Outgoing relations (NextTechs)
}

export type NodeColorBy =
  | 'category'
  | 'stage'
  | 'act'
  | 'powerType'
  | 'gameStatus'
  | 'openCondition'
  | 'ingredients'
  | 'usedCraftStation'
  | 'usedStation';

export const DEFAULT_NODE_COLOR_PALETTE = [
  '#6aa2ff', '#a78bfa', '#f59e42', '#34d399',
  '#f472b6', '#fbbf24', '#38bdf8', '#e36f6f',
];

/** Explicit value → color mapping. Keys are attribute values (empty string = no value). */
export type NodeColorMap = Record<string, string>;

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep';

export type NodeVisualPreset = 'default' | 'bold' | 'outline' | 'minimal' | 'striped';

export interface ProjectSettings {
  layoutDirection: 'LR' | 'TB';
  nodeTemplate: string;
  renderSimplification: boolean;
  nodeColorBy?: NodeColorBy;
  nodeColorPalette?: string[];
  /** Explicit value-to-color mapping. Overrides hash when set. */
  nodeColorMap?: NodeColorMap;
  /** Edge connection type: default (Bezier), straight, step (orthogonal), smoothstep (rounded orthogonal) */
  edgeType?: EdgeType;
  /** Edge stroke width (1-5), default 2 */
  edgeStrokeWidth?: number;
  /** Edge animation (running dots), default false */
  edgeAnimated?: boolean;

  /** Node visual: min width (px), default 200 */
  nodeMinWidth?: number;
  /** Node visual: max width (px), default 320 */
  nodeMaxWidth?: number;
  /** Node visual: min height (px), default 48 */
  nodeMinHeight?: number;
  /** Node visual: border width (1–6 px), default 2 */
  nodeBorderWidth?: number;
  /** Node visual: left strip width in default preset (2–12 px), default 3 */
  nodeLeftStripWidth?: number;
  /** Node text: horizontal alignment */
  nodeTextAlignH?: 'left' | 'center' | 'right';
  /** Node text: vertical alignment */
  nodeTextAlignV?: 'top' | 'center' | 'bottom';
  /** Node text: fit inside node (truncate) or allow overflow */
  nodeTextFit?: boolean;
  /** Node visual preset: default, bold, outline, minimal, striped */
  nodeVisualPreset?: NodeVisualPreset;
  /** When true, edges use manual waypoint-based routing instead of auto layout */
  manualEdgeMode?: boolean;
  /** Master switch: when false, no snapping. Default true. */
  snapEnabled?: boolean;
  /** Snap-to-grid step (px). 0 = off. Default 10. */
  snapGridSize?: number;
  /** Snap to neighboring nodes (align edges/centers when close). Default false. */
  snapToObjects?: boolean;
  /** Подсветка связанных нод/линий при клике. Default true. */
  highlightConnectedSubgraph?: boolean;
  /** Эффект стекла (blur) на панелях Узлы и Инспектор. Default true. */
  glassEffectEnabled?: boolean;
  /** Множитель интенсивности эффекта стекла (0.5–2.5), 1.2 = +20%. Default 1.2. */
  glassEffectModifier?: number;
  /** Скрывать узлы без входящих и исходящих связей в списке и на полотне. Default false. */
  hideUnconnectedNodes?: boolean;
  /** Вариант паттерна фона полотна: dots | lines | cross. Default 'dots'. */
  bgPatternVariant?: 'dots' | 'lines' | 'cross';
  /** Привязать шаг визуальной сетки к шагу привязки (snap). Default true. */
  bgPatternLinkedToSnap?: boolean;
  /** Шаг (gap) сетки в px. Default 20. Диапазон 10–100. Используется только при bgPatternLinkedToSnap=false. */
  bgPatternGap?: number;
  /** Размер элемента (size) сетки в px. Default 1. Диапазон 0.5–4. */
  bgPatternSize?: number;
}

/** Filter property — all node data fields usable for filtering */
export type FilterProperty =
  | 'act'
  | 'stage'
  | 'category'
  | 'powerType'
  | 'gameStatus'
  | 'designStatus'
  | 'notionSyncStatus'
  | 'techGameStatus'
  | 'techForAct'
  | 'openCondition'
  | 'openConditionRefs'
  | 'ingredients'
  | 'outputItem'
  | 'usedCraftStation'
  | 'usedStation'
  | 'itemLootingInAct'
  | 'electricCost'
  | 'researchTime';

/** Filter condition: is / isNot = value-based, isEmpty / isNotEmpty = presence-based */
export type FilterCondition = 'is' | 'isNot' | 'isNotEmpty' | 'isEmpty';

export interface FilterRule {
  id: string;
  property: FilterProperty;
  condition: FilterCondition;
  values: string[];
}

export interface CanvasFilter {
  enabled: boolean;
  rules: FilterRule[];
  /** dim = semi-transparent + darker, hide = don't render */
  hideMode: 'dim' | 'hide';
}

export interface ProjectMeta {
  name: string;
  updatedAt: string;
  version: string;
}

/** Notion field value → hex color (from Notion select/status options) */
export type NotionFieldColors = Record<string, Record<string, string>>;

/** Local deletion marker for a Notion page that should be archived on next sync */
export interface DeletedNotionTombstone {
  notionPageId: string;
  deletedAt: string;
  nodeLabel?: string;
  techCraftId?: string;
}

export interface ProjectFile {
  version: string;
  meta: ProjectMeta;
  settings: ProjectSettings;
  nodes: TechNode[];
  edges: TechEdge[];
  notionFieldColors?: NotionFieldColors;
  deletedNotionTombstones?: Record<string, DeletedNotionTombstone>;
}
