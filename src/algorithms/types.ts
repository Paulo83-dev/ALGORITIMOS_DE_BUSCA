import type { MazeModel, Pos } from "../maze/types";

export type RunnerStatus = "IDLE" | "RUNNING" | "PAUSED" | "FOUND" | "NO_SOLUTION";

export type IterationInfo = { depthLimit?: number; iteration?: number };

export type StepEvent = {
  stepIndex: number;
  expanded?: Pos;
  frontierAdded?: Pos[];
  visitedAdded?: Pos[];
  frontierSize: number;
  frontierMaxSize: number;
  found: boolean;
  done: boolean;
  iterationInfo?: IterationInfo;
};

export type RunnerSnapshot = {
  status: RunnerStatus;
  elapsedMs: number;
  algoSteps: number;
  expandedCount: number;
  visitedCount: number;
  frontierSize: number;
  frontierMaxSize: number;
  current?: Pos;
  path?: Pos[];
  pathLength?: number;
  pathCost?: number;
  iterationInfo?: IterationInfo;
};

export type RunnerOverlay = {
  visitedKeys: ReadonlySet<number>;
  frontierKeys: ReadonlySet<number>;
  currentKey?: number;
  pathKeys?: ReadonlyArray<number>;
};

export interface SearchRunner {
  readonly name: string;
  reset(maze: MazeModel): void;
  start(): void;
  pause(): void;
  resume(): void;
  addElapsedMs(deltaMs: number): void;
  step(): StepEvent;
  snapshot(): RunnerSnapshot;
  overlay(): RunnerOverlay;
}

