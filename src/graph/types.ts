export type GraphLayout = "random" | "geometric" | "star" | "circular";

export type GraphPos = { x: number; y: number };

export type GraphNode = GraphPos & {
  id: number;
  vx?: number;
  vy?: number;
};

export type GraphEdge = {
  from: number;
  to: number;
  weight: number;
};

export type GraphNeighbor = {
  to: number;
  weight: number;
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: GraphNeighbor[][];
  directed: boolean;
  weighted: boolean;
  startId: number;
  goalId: number;
};

export type GraphGenerateOptions = {
  layout: GraphLayout;
  nodes: number;
  density: number;
  directed: boolean;
  weighted: boolean;
};
