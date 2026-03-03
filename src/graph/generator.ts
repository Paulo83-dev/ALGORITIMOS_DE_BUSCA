import type { GraphEdge, GraphGenerateOptions, GraphLayout, GraphModel, GraphNode } from "./types";
import { buildAdjacency } from "./utils";

const MIN_NODES = 4;
const MAX_NODES = 200;
const POS_MARGIN = 0.08;

export function generateGraph(options: GraphGenerateOptions): GraphModel {
  const count = clamp(Math.round(options.nodes), MIN_NODES, MAX_NODES);
  const density = clamp(options.density, 0, 100);
  const layout: GraphLayout = options.layout;

  const nodes = createNodes(count, layout);
  const edges = createEdges(nodes, layout, density, options.directed, options.weighted);
  const adjacency = buildAdjacency(nodes.length, edges, options.directed);

  return {
    nodes,
    edges,
    adjacency,
    directed: options.directed,
    weighted: options.weighted,
    startId: 0,
    goalId: Math.max(0, nodes.length - 1),
  };
}

export function updateGraphWeights(graph: GraphModel, weighted: boolean): GraphModel {
  const edges = graph.edges.map((edge) => ({
    ...edge,
    weight: weighted ? randomWeight() : 1,
  }));
  const adjacency = buildAdjacency(graph.nodes.length, edges, graph.directed);
  return {
    ...graph,
    edges,
    adjacency,
    weighted,
  };
}

function createNodes(count: number, layout: GraphLayout): GraphNode[] {
  const nodes: GraphNode[] = [];
  if (layout === "circular" || layout === "star") {
    const cx = 0.5;
    const cy = 0.5;
    const r = 0.42;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      nodes.push({
        id: i,
        x: clamp(x, POS_MARGIN, 1 - POS_MARGIN),
        y: clamp(y, POS_MARGIN, 1 - POS_MARGIN),
        vx: 0,
        vy: 0,
      });
    }
    if (layout === "star" && nodes[0]) {
      nodes[0] = { id: 0, x: 0.5, y: 0.5, vx: 0, vy: 0 };
    }
    return nodes;
  }

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: i,
      x: randInRange(POS_MARGIN, 1 - POS_MARGIN),
      y: randInRange(POS_MARGIN, 1 - POS_MARGIN),
      vx: 0,
      vy: 0,
    });
  }
  return nodes;
}

function createEdges(
  nodes: GraphNode[],
  layout: GraphLayout,
  density: number,
  directed: boolean,
  weighted: boolean,
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  const addEdge = (from: number, to: number) => {
    if (from === to) return;
    const key = `${from}-${to}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from, to, weight: weighted ? randomWeight() : 1 });
  };

  if (layout === "random") {
    const p = density / 100;
    if (directed) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          if (Math.random() < p) addEdge(i, j);
        }
      }
    } else {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (Math.random() < p) addEdge(i, j);
        }
      }
    }
  }

  if (layout === "geometric") {
    const threshold = 0.1 + (density / 100) * 0.55;
    if (directed) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          if (dist(nodes[i]!, nodes[j]!) < threshold) addEdge(i, j);
        }
      }
    } else {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (dist(nodes[i]!, nodes[j]!) < threshold) addEdge(i, j);
        }
      }
    }
  }

  if (layout === "star") {
    for (let i = 1; i < nodes.length; i++) addEdge(0, i);
    const extra = (density / 100) * 0.25;
    for (let i = 1; i < nodes.length; i++) {
      if (Math.random() < extra) {
        const target = 1 + Math.floor(Math.random() * (nodes.length - 1));
        if (target !== i) addEdge(i, target);
      }
    }
  }

  if (layout === "circular") {
    for (let i = 0; i < nodes.length; i++) {
      addEdge(i, (i + 1) % nodes.length);
    }
    const p = (density / 100) * 0.6;
    for (let i = 0; i < nodes.length; i++) {
      if (Math.random() < p) {
        const target = Math.floor(Math.random() * nodes.length);
        if (target !== i && target !== (i + 1) % nodes.length) addEdge(i, target);
      }
    }
  }

  return edges;
}

function randomWeight(): number {
  return Math.floor(Math.random() * 9) + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function dist(a: GraphNode, b: GraphNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
