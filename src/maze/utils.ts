import type { MazeModel, Pos } from "./types";

export function posKey(maze: Pick<MazeModel, "cols">, pos: Pos): number {
  return pos.r * maze.cols + pos.c;
}

export function keyPos(maze: Pick<MazeModel, "cols">, key: number): Pos {
  return { r: Math.floor(key / maze.cols), c: key % maze.cols };
}

export function inBounds(maze: Pick<MazeModel, "rows" | "cols">, pos: Pos): boolean {
  return pos.r >= 0 && pos.r < maze.rows && pos.c >= 0 && pos.c < maze.cols;
}

export function cellCost(maze: MazeModel, pos: Pos): number {
  return maze.grid[pos.r]?.[pos.c] ?? 0;
}

export function isWall(maze: MazeModel, pos: Pos): boolean {
  return cellCost(maze, pos) === 0;
}

const NEIGHBOR_DIRS: ReadonlyArray<Readonly<Pos>> = [
  { r: -1, c: 0 }, // U
  { r: 0, c: 1 }, // R
  { r: 1, c: 0 }, // D
  { r: 0, c: -1 }, // L
];

export function neighborsURDL(maze: MazeModel, pos: Pos): Pos[] {
  const result: Pos[] = [];
  for (const d of NEIGHBOR_DIRS) {
    const n = { r: pos.r + d.r, c: pos.c + d.c };
    if (!inBounds(maze, n)) continue;
    if (isWall(maze, n)) continue;
    result.push(n);
  }
  return result;
}

export function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

