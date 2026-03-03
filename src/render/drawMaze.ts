import type { RunnerOverlay } from "../algorithms/types";
import type { MazeModel } from "../maze/types";
import { keyPos } from "../maze/utils";
import type { OverlayToggles } from "../components/ControlsBar";
import { costToColor } from "./palette";

const COLORS = {
  visited: "rgba(0, 145, 255, 0.45)",   // Azul mais saturado e opaco
  frontier: "rgba(0, 255, 150, 0.65)",  // Verde esmeralda bem vibrante e mais opaco
  current: "rgba(255, 235, 59, 0.9)",
  path: "#ff2d55",
  start: "#00c853",
  goal: "#d50000",
  gridLine: "rgba(0,0,0,0.06)",
};

export function drawMaze(
  canvas: HTMLCanvasElement,
  maze: MazeModel,
  overlay: RunnerOverlay,
  toggles: OverlayToggles,
  viewport?: { widthPx: number; heightPx: number },
): void {
  const cell = computeCellSizePx(maze, viewport);
  if (cell <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const width = maze.cols * cell;
  const height = maze.rows * cell;

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

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cost = maze.grid[r]?.[c] ?? 0;
      ctx.fillStyle = costToColor(cost);
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  if (cell >= 6) {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    const crispOffset = Number.isInteger(cell) ? 0.5 : 0;
    for (let r = 0; r <= maze.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cell + crispOffset);
      ctx.lineTo(width, r * cell + crispOffset);
      ctx.stroke();
    }
    for (let c = 0; c <= maze.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cell + crispOffset, 0);
      ctx.lineTo(c * cell + crispOffset, height);
      ctx.stroke();
    }
  }

  if (toggles.showVisited) {
    ctx.fillStyle = COLORS.visited;
    for (const key of overlay.visitedKeys) fillCell(ctx, maze, key, cell);
  }

  if (toggles.showFrontier) {
    ctx.fillStyle = COLORS.frontier;
    for (const key of overlay.frontierKeys) fillCell(ctx, maze, key, cell);
  }

  if (toggles.showCurrent && overlay.currentKey !== undefined) {
    ctx.fillStyle = COLORS.current;
    fillCell(ctx, maze, overlay.currentKey, cell);
  }

  if (toggles.showPath && overlay.pathKeys && overlay.pathKeys.length > 1) {
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = Math.max(2, Math.min(5, cell * 0.22));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < overlay.pathKeys.length; i++) {
      const key = overlay.pathKeys[i]!;
      const { r, c } = keyPos(maze, key);
      const x = c * cell + cell / 2;
      const y = r * cell + cell / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawMarker(ctx, maze.start.r, maze.start.c, COLORS.start, cell);
  drawMarker(ctx, maze.goal.r, maze.goal.c, COLORS.goal, cell);
}

function fillCell(ctx: CanvasRenderingContext2D, maze: MazeModel, key: number, cell: number): void {
  const { r, c } = keyPos(maze, key);
  ctx.fillRect(c * cell, r * cell, cell, cell);
}

function drawMarker(ctx: CanvasRenderingContext2D, r: number, c: number, color: string, cell: number): void {
  const x = c * cell + cell / 2;
  const y = r * cell + cell / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, cell * 0.25), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function computeCellSizePx(maze: MazeModel, viewport?: { widthPx: number; heightPx: number }): number {
  if (!viewport) return 18;
  const maxW = viewport.widthPx;
  const maxH = viewport.heightPx;
  if (maxW <= 0 || maxH <= 0) return 0;
  const raw = Math.min(maxW / maze.cols, maxH / maze.rows);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}
