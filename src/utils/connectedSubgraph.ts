/**
 * Computes the connected subgraph reachable from source and target of a clicked edge.
 * Returns node IDs and edge IDs in that component (undirected traversal).
 */
export function getConnectedSubgraph(
  clickedEdge: { source: string; target: string },
  edges: { id: string; source: string; target: string }[]
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.target)!.push(e.source);
  }

  const nodeIds = new Set<string>();
  const queue = [clickedEdge.source, clickedEdge.target];

  for (const id of queue) {
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);
    const neighbors = adj.get(id) ?? [];
    for (const n of neighbors) {
      if (!nodeIds.has(n)) queue.push(n);
    }
  }

  const edgeIds = new Set<string>();
  for (const e of edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      edgeIds.add(e.id);
    }
  }

  return { nodeIds, edgeIds };
}
