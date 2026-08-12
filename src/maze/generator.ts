import type { MazeModel } from "./types";

const CELL_WALL = 0;
const CELL_PATH = 1;
const CELL_TRAFFIC_MAX = 7;

const MIN_SIZE = 5;
const MAX_SIZE = 121;

type GenerateOptions = {
  rows: number;
  cols: number;
  braidFactor: number;
};

type QueueNode = { r: number; c: number; val: number };

const CARVE_DIRS = [
  { dr: -2, dc: 0 },
  { dr: 0, dc: 2 },
  { dr: 2, dc: 0 },
  { dr: 0, dc: -2 },
];

const NEIGHBOR_DIRS = [
  { dr: -1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
];

export function generateMaze({ rows, cols, braidFactor }: GenerateOptions): MazeModel {
  const height = ensureOddSize(rows);
  const width = ensureOddSize(cols);
  const braid = clamp(braidFactor, 0, 2);
  const grid = createGrid(height, width, CELL_WALL);

  const stack: Array<{ r: number; c: number }> = [{ r: 1, c: 1 }];
  grid[1]![1] = CELL_PATH;

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;
    const dirs = [...CARVE_DIRS];
    shuffle(dirs);

    let carved = false;
    for (const dir of dirs) {
      const nr = current.r + dir.dr;
      const nc = current.c + dir.dc;

      if (nr <= 0 || nr >= height - 1 || nc <= 0 || nc >= width - 1) continue;
      if (grid[nr]![nc] !== CELL_WALL) continue;

      grid[nr]![nc] = CELL_PATH;
      grid[current.r + dir.dr / 2]![current.c + dir.dc / 2] = CELL_PATH;
      stack.push({ r: nr, c: nc });
      carved = true;
      break;
    }

    if (!carved) stack.pop();
  }

  applyBraiding(grid, height, width, braid);

  const start = { r: 1, c: 1 };
  const goal = { r: height - 2, c: width - 2 };
  grid[start.r]![start.c] = CELL_PATH;
  grid[goal.r]![goal.c] = CELL_PATH;

  return {
    rows: height,
    cols: width,
    start,
    goal,
    grid,
  };
}

export function addTraffic(maze: MazeModel, probabilityPercent: number): MazeModel {
  const percent = clamp(probabilityPercent, 0, 100);
  const grid: number[][] = maze.grid.map((row) => row.map((cell) => (cell === CELL_WALL ? CELL_WALL : CELL_PATH)));
  const candidates: Array<{ r: number; c: number }> = [];

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      if (grid[r]![c] === CELL_PATH) candidates.push({ r, c });
    }
  }

  const sourcesCount = Math.floor(candidates.length * (percent / 100));
  shuffle(candidates);

  const queue: QueueNode[] = [];
  for (let i = 0; i < sourcesCount; i++) {
    const { r, c } = candidates[i]!;
    grid[r]![c] = CELL_TRAFFIC_MAX;
    queue.push({ r, c, val: CELL_TRAFFIC_MAX });
  }

  propagateTraffic(grid, maze.rows, maze.cols, queue);

  return {
    ...maze,
    grid,
  };
}

function applyBraiding(grid: number[][], rows: number, cols: number, factor: number): void {
  if (factor <= 0) return;
  const baseFactor = Math.min(factor, 1);

  for (let r = 1; r < rows; r += 2) {
    for (let c = 1; c < cols; c += 2) {
      if (grid[r]![c] !== CELL_PATH) continue;

      let openCount = 0;
      for (const dir of NEIGHBOR_DIRS) {
        if (grid[r + dir.dr]![c + dir.dc] !== CELL_WALL) openCount++;
      }

      if (openCount !== 1) continue;
      if (Math.random() >= baseFactor) continue;

      const dirs = [...NEIGHBOR_DIRS];
      shuffle(dirs);
      for (const dir of dirs) {
        const nr = r + dir.dr * 2;
        const nc = c + dir.dc * 2;
        const wr = r + dir.dr;
        const wc = c + dir.dc;

        if (nr <= 0 || nr >= rows - 1 || nc <= 0 || nc >= cols - 1) continue;
        if (grid[nr]![nc] !== CELL_WALL && grid[wr]![wc] === CELL_WALL) {
          grid[wr]![wc] = CELL_PATH;
          break;
        }
      }
    }
  }

  applyExtraBraiding(grid, rows, cols, factor - 1);
}

function applyExtraBraiding(grid: number[][], rows: number, cols: number, extraFactor: number): void {
  const factor = clamp(extraFactor, 0, 1);
  if (factor <= 0) return;

  const dirs = [
    { dr: 0, dc: 2 },
    { dr: 2, dc: 0 },
  ];

  for (let r = 1; r < rows - 1; r += 2) {
    for (let c = 1; c < cols - 1; c += 2) {
      if (grid[r]![c] !== CELL_PATH) continue;

      for (const dir of dirs) {
        const nr = r + dir.dr;
        const nc = c + dir.dc;
        const wr = r + dir.dr / 2;
        const wc = c + dir.dc / 2;

        if (nr <= 0 || nr >= rows - 1 || nc <= 0 || nc >= cols - 1) continue;
        if (grid[nr]![nc] !== CELL_PATH) continue;
        if (grid[wr]![wc] !== CELL_WALL) continue;
        if (Math.random() <= factor) grid[wr]![wc] = CELL_PATH;
      }
    }
  }
}

function propagateTraffic(grid: number[][], rows: number, cols: number, queue: QueueNode[]): void {
  while (queue.length > 0) {
    queue.sort((a, b) => b.val - a.val);
    const current = queue.shift();
    if (!current) return;

    for (const dir of NEIGHBOR_DIRS) {
      const nr = current.r + dir.dr;
      const nc = current.c + dir.dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr]![nc] === CELL_WALL) continue;

      const decayed = getDecayedValue(current.val);
      if (decayed > 1 && decayed > grid[nr]![nc]) {
        grid[nr]![nc] = decayed;
        queue.push({ r: nr, c: nc, val: decayed });
      }
    }
  }
}

function getDecayedValue(sourceVal: number): number {
  if (sourceVal <= 2) return 1;

  const r = Math.random();
  let drop = 1;
  if (r < 0.6) drop = 1;
  else if (r < 0.85) drop = 2;
  else if (r < 0.95) drop = 3;
  else drop = 4;

  return Math.max(1, sourceVal - drop);
}

function ensureOddSize(value: number): number {
  const clamped = clamp(Math.round(value), MIN_SIZE, MAX_SIZE);
  if (clamped % 2 !== 0) return clamped;
  return clamped + 1 <= MAX_SIZE ? clamped + 1 : clamped - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createGrid(rows: number, cols: number, fill: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function shuffle<T>(list: T[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}
