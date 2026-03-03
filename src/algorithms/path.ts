import type { MazeModel, Pos } from "../maze/types";
import { cellCost, keyPos } from "../maze/utils";

export function reconstructPathKeys(
  cameFrom: ReadonlyMap<number, number>,
  startKey: number,
  goalKey: number,
): number[] | undefined {
  if (startKey === goalKey) return [startKey];
  if (!cameFrom.has(goalKey)) return undefined;
  const path: number[] = [];
  let cur = goalKey;
  path.push(cur);
  while (cur !== startKey) {
    const parent = cameFrom.get(cur);
    if (parent === undefined) return undefined;
    cur = parent;
    path.push(cur);
  }
  path.reverse();
  return path;
}

export function pathKeysToPositions(maze: Pick<MazeModel, "cols">, keys: number[]): Pos[] {
  return keys.map((k) => keyPos(maze, k));
}

export function computePathCost(maze: MazeModel, keys: number[]): number {
  if (keys.length <= 1) return 0;
  let cost = 0;
  for (let i = 1; i < keys.length; i++) {
    const pos = keyPos(maze, keys[i]!);
    cost += cellCost(maze, pos);
  }
  return cost;
}

export function moveCost(maze: MazeModel, to: Pos): number {
  return cellCost(maze, to);
}

export function computePathCostFromPositions(maze: MazeModel, path: Pos[]): number {
  if (path.length <= 1) return 0;
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    cost += moveCost(maze, path[i]!);
  }
  return cost;
}
