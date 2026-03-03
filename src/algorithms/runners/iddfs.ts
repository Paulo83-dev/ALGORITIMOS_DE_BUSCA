import type { Pos } from "../../maze/types";
import { neighborsURDL, posKey } from "../../maze/utils";
import { computePathCost } from "../path";
import { BaseRunner } from "../baseRunner";
import type { StepEvent } from "../types";

type Frame = {
  key: number;
  depth: number;
  nextIndex: number;
  neighbors: number[] | undefined;
};

export class IDDFSRunner extends BaseRunner {
  readonly #stack: Frame[] = [];
  readonly #bestDepth = new Map<number, number>();
  #depthLimit = 0;
  #iteration = 0;
  #maxDepth = 0;

  constructor() {
    super("IDDFS");
  }

  protected onReset(): void {
    this.#stack.length = 0;
    this.#bestDepth.clear();
    this.#depthLimit = 0;
    this.#iteration = 0;
    this.#maxDepth = 0;
  }

  protected onStart(): void {
    if (!this.maze) return;
    this.#maxDepth = Math.max(0, this.maze.rows * this.maze.cols);
    this.#depthLimit = 0;
    this.#iteration = 0;
    this.#initIteration();
  }

  #initIteration(): void {
    this.#stack.length = 0;
    this.#bestDepth.clear();
    this.frontierKeys.clear();
    this.currentKey = undefined;

    const startFrame: Frame = { key: this.startKey, depth: 0, nextIndex: 0, neighbors: undefined };
    this.#stack.push(startFrame);
    this.#bestDepth.set(this.startKey, 0);
    this.frontierKeys.add(this.startKey);
    this.iterationInfo = { depthLimit: this.#depthLimit, iteration: this.#iteration };
    this.markFrontierSize(this.#stack.length);
  }

  step(): StepEvent {
    if (this.status !== "RUNNING") return this.noopEvent();
    if (!this.maze) return this.noopEvent();

    while (true) {
      if (this.#stack.length === 0) {
        if (this.#depthLimit >= this.#maxDepth) {
          this.status = "NO_SOLUTION";
          this.currentKey = undefined;
          this.markFrontierSize(0);
          return this.noopEvent();
        }
        this.#depthLimit += 1;
        this.#iteration += 1;
        this.#initIteration();
      }

      const frame = this.#stack[this.#stack.length - 1]!;
      if (!frame.neighbors) {
        this.currentKey = frame.key;
        this.expandedCount += 1;
        this.algoSteps += 1;

        const expanded = this.posFromKey(frame.key);
        const visitedAdded: Pos[] = [];
        if (!this.visitedKeys.has(frame.key)) {
          this.visitedKeys.add(frame.key);
          visitedAdded.push(expanded);
        }

        if (frame.key === this.goalKey) {
          this.status = "FOUND";
          const pathKeys = this.#stack.map((f) => f.key);
          this.pathKeys = pathKeys;
          this.pathLength = Math.max(0, pathKeys.length - 1);
          this.pathCost = computePathCost(this.maze, pathKeys);
          this.iterationInfo = { depthLimit: this.#depthLimit, iteration: this.#iteration };
          this.markFrontierSize(this.#stack.length);
          return {
            stepIndex: this.algoSteps,
            expanded,
            visitedAdded: visitedAdded.length ? visitedAdded : undefined,
            frontierSize: this.frontierSize,
            frontierMaxSize: this.frontierMaxSize,
            found: true,
            done: true,
            iterationInfo: this.iterationInfo,
          };
        }

        frame.neighbors = neighborsURDL(this.maze, expanded).map((p) => posKey(this.maze!, p));
        frame.nextIndex = 0;
        this.iterationInfo = { depthLimit: this.#depthLimit, iteration: this.#iteration };
        this.markFrontierSize(this.#stack.length);
        return {
          stepIndex: this.algoSteps,
          expanded,
          visitedAdded: visitedAdded.length ? visitedAdded : undefined,
          frontierSize: this.frontierSize,
          frontierMaxSize: this.frontierMaxSize,
          found: false,
          done: false,
          iterationInfo: this.iterationInfo,
        };
      }

      if (frame.depth >= this.#depthLimit || frame.nextIndex >= frame.neighbors.length) {
        const popped = this.#stack.pop()!;
        this.frontierKeys.delete(popped.key);
        this.markFrontierSize(this.#stack.length);
        continue;
      }

      const child = frame.neighbors[frame.nextIndex++]!;
      const childDepth = frame.depth + 1;
      const prevBestDepth = this.#bestDepth.get(child);
      if (prevBestDepth !== undefined && prevBestDepth <= childDepth) continue;
      this.#bestDepth.set(child, childDepth);

      const childFrame: Frame = { key: child, depth: childDepth, nextIndex: 0, neighbors: undefined };
      this.#stack.push(childFrame);
      this.frontierKeys.add(child);
      this.markFrontierSize(this.#stack.length);
    }
  }
}
