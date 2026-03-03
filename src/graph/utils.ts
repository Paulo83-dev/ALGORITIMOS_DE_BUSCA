import type { GraphEdge, GraphModel, GraphNeighbor, GraphPos } from "./types";

export function buildAdjacency(nodeCount: number, edges: GraphEdge[], directed: boolean): GraphNeighbor[][] {
  const adjacency: GraphNeighbor[][] = Array.from({ length: nodeCount }, () => []);
  for (const edge of edges) {
    adjacency[edge.from]!.push({ to: edge.to, weight: edge.weight });
    if (!directed) {
      adjacency[edge.to]!.push({ to: edge.from, weight: edge.weight });
    }
  }
  return adjacency;
}

export function nodePos(graph: GraphModel, id: number): GraphPos {
  const node = graph.nodes[id];
  if (!node) return { x: 0, y: 0 };
  return { x: node.x, y: node.y };
}

export function edgeWeight(graph: GraphModel, from: number, to: number): number | undefined {
  const neighbors = graph.adjacency[from];
  if (!neighbors) return undefined;
  const match = neighbors.find((n) => n.to === to);
  return match?.weight;
}

export function computeGraphPathCost(graph: GraphModel, keys: number[]): number {
  if (keys.length <= 1) return 0;
  let cost = 0;
  for (let i = 1; i < keys.length; i++) {
    const weight = edgeWeight(graph, keys[i - 1]!, keys[i]!);
    if (weight === undefined) return cost;
    cost += weight;
  }
  return cost;
}

export function euclidean(a: GraphPos, b: GraphPos): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
