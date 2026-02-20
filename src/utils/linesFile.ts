import type { TechEdge, LinesFile, LineGeometry, EdgePathType } from '../types';

const VALID_PATH_TYPES: EdgePathType[] = ['bezier', 'straight', 'orthogonal'];

function isValidPathType(s: unknown): s is EdgePathType {
  return typeof s === 'string' && VALID_PATH_TYPES.includes(s as EdgePathType);
}

function isValidEndpoint(obj: unknown): obj is { mode: 'floating' | 'fixed'; anchor?: { x: number; y: number } } {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (o.mode === 'floating' || o.mode === 'fixed') && (o.anchor == null || (typeof o.anchor === 'object' && typeof (o.anchor as { x?: number; y?: number }).x === 'number' && typeof (o.anchor as { x?: number; y?: number }).y === 'number'));
}

function isValidWaypoint(obj: unknown): obj is { x: number; y: number } {
  return obj != null && typeof obj === 'object' && typeof (obj as { x?: number; y?: number }).x === 'number' && typeof (obj as { x?: number; y?: number }).y === 'number';
}

function parseGeometry(val: unknown): LineGeometry | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  const result: LineGeometry = {};

  if (Array.isArray(o.waypoints) && o.waypoints.every(isValidWaypoint)) {
    result.waypoints = o.waypoints as { x: number; y: number }[];
  }
  if (isValidPathType(o.pathType)) {
    result.pathType = o.pathType;
  }
  if (isValidEndpoint(o.sourceEndpoint)) {
    result.sourceEndpoint = o.sourceEndpoint;
  }
  if (isValidEndpoint(o.targetEndpoint)) {
    result.targetEndpoint = o.targetEndpoint;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** Parse a lines file JSON string. Returns null on parse failure or invalid format. */
export function parseLinesFile(json: string): LinesFile | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    const version = typeof parsed.version === 'string' ? parsed.version : '1.0';
    const edgesObj = parsed.edges;
    if (!edgesObj || typeof edgesObj !== 'object') {
      return { version, edges: {} };
    }
    const edges: Record<string, LineGeometry> = {};
    for (const [id, val] of Object.entries(edgesObj)) {
      if (typeof id !== 'string') continue;
      const geom = parseGeometry(val);
      if (geom) edges[id] = geom;
    }
    return { version, edges };
  } catch {
    return null;
  }
}

/** Serialize a LinesFile to JSON string. */
export function serializeLinesFile(data: LinesFile): string {
  return JSON.stringify(data, null, 2);
}

/** Merge geometry from LinesFile into an edge. Does not modify source/target. */
export function mergeLineGeometry(edge: TechEdge, geometry: LineGeometry): TechEdge {
  const result = { ...edge };
  if (geometry.waypoints?.length) result.waypoints = [...geometry.waypoints];
  else if (geometry.waypoints && geometry.waypoints.length === 0) result.waypoints = undefined;
  if (geometry.pathType != null) result.pathType = geometry.pathType;
  if (geometry.sourceEndpoint != null) result.sourceEndpoint = { ...geometry.sourceEndpoint };
  if (geometry.targetEndpoint != null) result.targetEndpoint = { ...geometry.targetEndpoint };
  return result;
}

/** Extract geometry fields from an edge. Returns null if no geometry. */
export function extractLineGeometry(edge: TechEdge): LineGeometry | null {
  const hasWaypoints = edge.waypoints && edge.waypoints.length > 0;
  const hasPathType = edge.pathType != null;
  const hasSource = edge.sourceEndpoint != null;
  const hasTarget = edge.targetEndpoint != null;
  if (!hasWaypoints && !hasPathType && !hasSource && !hasTarget) return null;
  const geom: LineGeometry = {};
  if (hasWaypoints) geom.waypoints = [...edge.waypoints!];
  if (hasPathType) geom.pathType = edge.pathType!;
  if (hasSource) geom.sourceEndpoint = { ...edge.sourceEndpoint! };
  if (hasTarget) geom.targetEndpoint = { ...edge.targetEndpoint! };
  return geom;
}

/** Build LinesFile from edges array. */
export function buildLinesFileFromEdges(edges: TechEdge[]): LinesFile {
  const edgesMap: Record<string, LineGeometry> = {};
  for (const e of edges) {
    const geom = extractLineGeometry(e);
    if (geom) edgesMap[e.id] = geom;
  }
  return { version: '1.0', edges: edgesMap };
}

/** Apply LinesFile geometry to edges array (mutates edges in place). Returns number of edges updated. */
export function applyLinesFileToEdges(edges: TechEdge[], linesFile: LinesFile): number {
  let updated = 0;
  for (const e of edges) {
    const geom = linesFile.edges[e.id];
    if (!geom) continue;
    if (geom.waypoints?.length) e.waypoints = [...geom.waypoints];
    else if (geom.waypoints && geom.waypoints.length === 0) e.waypoints = undefined;
    if (geom.pathType != null) e.pathType = geom.pathType;
    if (geom.sourceEndpoint != null) e.sourceEndpoint = { ...geom.sourceEndpoint };
    if (geom.targetEndpoint != null) e.targetEndpoint = { ...geom.targetEndpoint };
    updated++;
  }
  return updated;
}
