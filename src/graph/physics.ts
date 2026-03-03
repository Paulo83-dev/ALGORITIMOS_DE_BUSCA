import type { GraphModel, GraphNode } from "./types";

type PhysicsOptions = {
  repelRadius: number;
  maxForce: number;
  friction: number;
  centerPull: number;
  margin: number;
  edgeSpring: number;
  edgeLength: number;
  degreeRepelBias: number;
};

const DEFAULT_OPTIONS: PhysicsOptions = {
  repelRadius: 0.2,
  maxForce: 0.002,
  friction: 0.9,
  centerPull: 0.002,
  margin: 0.05,
  edgeSpring: 0.004,
  edgeLength: 0.18,
  degreeRepelBias: 0,
};

export function stepGraphPhysics(graph: GraphModel, overrides: Partial<PhysicsOptions> = {}): GraphModel {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const nodes: GraphNode[] = graph.nodes.map((node) => ({
    ...node,
    vx: node.vx ?? 0,
    vy: node.vy ?? 0,
  }));
  const degrees = computeDegrees(graph, nodes.length);
  const maxDegree = degrees.length ? Math.max(...degrees) : 0;
  const degreeScale = degrees.map((deg) => {
    if (maxDegree <= 0) return 1 + options.degreeRepelBias;
    const normalized = deg / maxDegree;
    return 1 + options.degreeRepelBias * (1 - normalized);
  });

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) dist = 0.0001;
      if (dist > options.repelRadius) continue;

      const force = options.maxForce * (1 - dist / options.repelRadius);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const scaleA = degreeScale[i] ?? 1;
      const scaleB = degreeScale[j] ?? 1;
      a.vx = (a.vx ?? 0) + fx * scaleA;
      a.vy = (a.vy ?? 0) + fy * scaleA;
      b.vx = (b.vx ?? 0) - fx * scaleB;
      b.vy = (b.vy ?? 0) - fy * scaleB;
    }
  }

  for (const edge of graph.edges) {
    const a = nodes[edge.from];
    const b = nodes[edge.to];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) dist = 0.0001;
    const delta = dist - options.edgeLength;
    const force = options.edgeSpring * delta;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx = (a.vx ?? 0) + fx;
    a.vy = (a.vy ?? 0) + fy;
    b.vx = (b.vx ?? 0) - fx;
    b.vy = (b.vy ?? 0) - fy;
  }

  for (const node of nodes) {
    node.vx = (node.vx ?? 0) * options.friction;
    node.vy = (node.vy ?? 0) * options.friction;

    node.vx += (0.5 - node.x) * options.centerPull;
    node.vy += (0.5 - node.y) * options.centerPull;

    node.x = clamp(node.x + node.vx, options.margin, 1 - options.margin);
    node.y = clamp(node.y + node.vy, options.margin, 1 - options.margin);
  }

  return {
    ...graph,
    nodes,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeDegrees(graph: GraphModel, count: number): number[] {
  const degrees = Array.from({ length: count }, () => 0);
  for (const edge of graph.edges) {
    if (degrees[edge.from] !== undefined) degrees[edge.from] += 1;
    if (degrees[edge.to] !== undefined) degrees[edge.to] += 1;
  }
  return degrees;
}
