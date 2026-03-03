import type { RunnerOverlay } from "../graph/algorithms/types";
import type { GraphModel, GraphNode } from "../graph/types";
import type { OverlayToggles } from "../components/ControlsBar";

const COLORS = {
  edge: "rgba(255, 255, 255, 0.16)",
  edgeWeight: "rgba(255, 255, 255, 0.75)",
  node: "rgba(220, 235, 255, 0.9)",
  nodeStroke: "rgba(255, 255, 255, 0.65)",
  visited: "rgba(30, 144, 255, 0.28)",
  frontier: "rgba(50, 205, 50, 0.28)",
  current: "rgba(255, 235, 59, 0.9)",
  path: "#ff2d55",
  start: "#00c853",
  goal: "#d50000",
  label: "rgba(255, 255, 255, 0.85)",
};

export type GraphLayoutPoint = {
  node: GraphNode;
  x: number;
  y: number;
};

export function getGraphLayout(
  graph: GraphModel,
  viewport: { widthPx: number; heightPx: number },
  nodeScale = 1,
): { positions: GraphLayoutPoint[]; radius: number } {
  const width = Math.max(0, viewport.widthPx);
  const height = Math.max(0, viewport.heightPx);
  const pad = Math.max(12, Math.min(width, height) * 0.06);
  const size = Math.min(width, height) - pad * 2;
  const positions = graph.nodes.map((node) => ({
    node,
    x: pad + node.x * size,
    y: pad + node.y * size,
  }));
  const radius = computeNodeRadius(graph.nodes.length, size, nodeScale);
  return { positions, radius };
}

export function drawGraph(
  canvas: HTMLCanvasElement,
  graph: GraphModel,
  overlay: RunnerOverlay,
  toggles: OverlayToggles,
  viewport?: { widthPx: number; heightPx: number },
  nodeScale = 1,
): void {
  const width = Math.max(0, viewport?.widthPx ?? 360);
  const height = Math.max(0, viewport?.heightPx ?? 360);
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const wantW = Math.floor(width * dpr);
  const wantH = Math.floor(height * dpr);
  if (canvas.width !== wantW) canvas.width = wantW;
  if (canvas.height !== wantH) canvas.height = wantH;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const { positions, radius: nodeRadius } = getGraphLayout(graph, { widthPx: width, heightPx: height }, nodeScale);

  ctx.strokeStyle = COLORS.edge;
  ctx.lineWidth = 1;
  for (const edge of graph.edges) {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (graph.weighted && edge.weight > 1) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      ctx.fillStyle = COLORS.edgeWeight;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(edge.weight), mx, my);
    }

    if (graph.directed) drawArrow(ctx, from.x, from.y, to.x, to.y, nodeRadius);
  }

  if (toggles.showPath && overlay.pathKeys && overlay.pathKeys.length > 1) {
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = Math.max(2, Math.min(5, nodeRadius * 0.6));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < overlay.pathKeys.length; i++) {
      const fromKey = overlay.pathKeys[i - 1]!;
      const toKey = overlay.pathKeys[i]!;
      const from = positions[fromKey];
      const to = positions[toKey];
      if (!from || !to) continue;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  for (const p of positions) {
    drawNode(ctx, p.x, p.y, nodeRadius, COLORS.node, COLORS.nodeStroke);
  }

  if (toggles.showVisited) {
    ctx.fillStyle = COLORS.visited;
    for (const key of overlay.visitedKeys) {
      const p = positions[key];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (toggles.showFrontier) {
    ctx.fillStyle = COLORS.frontier;
    for (const key of overlay.frontierKeys) {
      const p = positions[key];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (toggles.showCurrent && overlay.currentKey !== undefined) {
    const p = positions[overlay.currentKey];
    if (p) {
      ctx.fillStyle = COLORS.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const p of positions) {
    if (p.node.id === graph.startId) drawMarker(ctx, p.x, p.y, COLORS.start, nodeRadius);
    if (p.node.id === graph.goalId) drawMarker(ctx, p.x, p.y, COLORS.goal, nodeRadius);
  }

  const showLabels = graph.nodes.length <= 40;
  if (showLabels) {
    ctx.fillStyle = COLORS.label;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of positions) {
      ctx.fillText(String(p.node.id), p.x, p.y);
    }
  }
}

function computeNodeRadius(count: number, size: number, nodeScale: number): number {
  const raw = size / Math.max(6, Math.sqrt(count) * 3.6);
  const scaled = raw * nodeScale;
  return Math.max(3, Math.min(16, Math.round(scaled)));
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  stroke: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(3, radius * 0.55), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, radius: number): void {
  const headlen = Math.max(6, radius * 0.8);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  const endX = x2 - (radius + 2) * Math.cos(angle);
  const endY = y2 - (radius + 2) * Math.sin(angle);
  const leftX = endX - headlen * Math.cos(angle - Math.PI / 6);
  const leftY = endY - headlen * Math.sin(angle - Math.PI / 6);
  const rightX = endX - headlen * Math.cos(angle + Math.PI / 6);
  const rightY = endY - headlen * Math.sin(angle + Math.PI / 6);

  ctx.fillStyle = COLORS.edge;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();
}
