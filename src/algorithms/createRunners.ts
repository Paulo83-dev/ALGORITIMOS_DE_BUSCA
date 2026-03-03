import type { SearchRunner } from "./types";
import { AStarRunner } from "./runners/astar";
import { BFSRunner } from "./runners/bfs";
import { DFSRunner } from "./runners/dfs";
import { GreedyRunner } from "./runners/greedy";
import { IDDFSRunner } from "./runners/iddfs";
import { UCSRunner } from "./runners/ucs";

export function createRunners(): SearchRunner[] {
  return [new DFSRunner(), new BFSRunner(), new UCSRunner(), new GreedyRunner(), new AStarRunner(), new IDDFSRunner()];
}

