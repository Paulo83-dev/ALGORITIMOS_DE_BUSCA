import type { MazeModel, Pos } from "../maze/types";
import { keyPos, posKey } from "../maze/utils";
import type { IterationInfo, RunnerOverlay, RunnerSnapshot, RunnerStatus, SearchRunner, StepEvent } from "./types";

export abstract class BaseRunner implements SearchRunner {
  readonly name: string;

  protected maze: MazeModel | undefined;
  protected startKey = 0;
  protected goalKey = 0;

  protected status: RunnerStatus = "IDLE";
  protected elapsedMs = 0;
  protected algoSteps = 0;
  protected expandedCount = 0;

  protected visitedKeys = new Set<number>();
  protected frontierKeys = new Set<number>();
  protected frontierSize = 0;
  protected frontierMaxSize = 0;

  protected currentKey: number | undefined;
  protected pathKeys: number[] | undefined;
  protected pathLength: number | undefined;
  protected pathCost: number | undefined;
  protected iterationInfo: IterationInfo | undefined;

  constructor(name: string) {
    this.name = name;
  }

  reset(maze: MazeModel): void {
    this.maze = maze;
    this.startKey = posKey(maze, maze.start);
    this.goalKey = posKey(maze, maze.goal);

    this.status = "IDLE";
    this.elapsedMs = 0;
    this.algoSteps = 0;
    this.expandedCount = 0;
    this.visitedKeys.clear();
    this.frontierKeys.clear();
    this.frontierSize = 0;
    this.frontierMaxSize = 0;
    this.currentKey = undefined;
    this.pathKeys = undefined;
    this.pathLength = undefined;
    this.pathCost = undefined;
    this.iterationInfo = undefined;

    this.onReset();
  }

  protected onReset(): void {}

  start(): void {
    if (this.status !== "IDLE") return;
    if (!this.maze) throw new Error(`${this.name}: reset(maze) must be called before start()`);
    this.status = "RUNNING";
    this.onStart();
  }

  protected abstract onStart(): void;

  pause(): void {
    if (this.status !== "RUNNING") return;
    this.status = "PAUSED";
  }

  resume(): void {
    if (this.status !== "PAUSED") return;
    this.status = "RUNNING";
  }

  addElapsedMs(deltaMs: number): void {
    if (this.status !== "RUNNING") return;
    this.elapsedMs += deltaMs;
  }

  abstract step(): StepEvent;

  snapshot(): RunnerSnapshot {
    const maze = this.maze;
    return {
      status: this.status,
      elapsedMs: this.elapsedMs,
      algoSteps: this.algoSteps,
      expandedCount: this.expandedCount,
      visitedCount: this.visitedKeys.size,
      frontierSize: this.frontierSize,
      frontierMaxSize: this.frontierMaxSize,
      current: maze && this.currentKey !== undefined ? keyPos(maze, this.currentKey) : undefined,
      path: maze && this.pathKeys ? this.pathKeys.map((k) => keyPos(maze, k)) : undefined,
      pathLength: this.pathLength,
      pathCost: this.pathCost,
      iterationInfo: this.iterationInfo,
    };
  }

  overlay(): RunnerOverlay {
    return {
      visitedKeys: this.visitedKeys,
      frontierKeys: this.frontierKeys,
      currentKey: this.currentKey,
      pathKeys: this.pathKeys,
    };
  }

  protected markFrontierSize(size: number): void {
    this.frontierSize = size;
    if (size > this.frontierMaxSize) this.frontierMaxSize = size;
  }

  protected done(): boolean {
    return this.status === "FOUND" || this.status === "NO_SOLUTION";
  }

  protected noopEvent(): StepEvent {
    return {
      stepIndex: this.algoSteps,
      frontierSize: this.frontierSize,
      frontierMaxSize: this.frontierMaxSize,
      found: this.status === "FOUND",
      done: this.done(),
      iterationInfo: this.iterationInfo,
    };
  }

  protected posFromKey(key: number): Pos {
    if (!this.maze) throw new Error(`${this.name}: maze not set`);
    return keyPos(this.maze, key);
  }
}

