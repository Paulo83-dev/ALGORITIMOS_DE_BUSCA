import type { GraphModel, GraphPos } from "../types";

export type RunnerStatus = "IDLE" | "RUNNING" | "PAUSED" | "FOUND" | "NO_SOLUTION";

export type IterationInfo = { depthLimit?: number; iteration?: number };

export type StepEvent = {
  stepIndex: number;
  expanded?: GraphPos;
  frontierAdded?: GraphPos[];
  visitedAdded?: GraphPos[];
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
  current?: GraphPos;
  path?: GraphPos[];
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
  reset(graph: GraphModel): void;
  start(): void;
  pause(): void;
  resume(): void;
  addElapsedMs(deltaMs: number): void;
  step(): StepEvent;
  snapshot(): RunnerSnapshot;
  overlay(): RunnerOverlay;
}
