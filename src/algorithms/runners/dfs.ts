import type { Pos } from "../../maze/types";
import { neighborsURDL, posKey } from "../../maze/utils";
import { computePathCost, reconstructPathKeys } from "../path";
import { BaseRunner } from "../baseRunner";
import type { StepEvent } from "../types";

export class DFSRunner extends BaseRunner {
  readonly #stack: number[] = [];
  readonly #cameFrom = new Map<number, number>();

  constructor() {
    super("DFS");
  }

  protected onReset(): void {
    this.#stack.length = 0;
    this.#cameFrom.clear();
  }

  protected onStart(): void {
    this.#stack.length = 0;
    this.#cameFrom.clear();

    this.#stack.push(this.startKey);
    this.frontierKeys.add(this.startKey);
    this.visitedKeys.add(this.startKey);
    this.markFrontierSize(this.#stack.length);
  }

  step(): StepEvent {
    if (this.status !== "RUNNING") return this.noopEvent();
    if (!this.maze) return this.noopEvent();

    if (this.#stack.length === 0) {
      this.status = "NO_SOLUTION";
      this.currentKey = undefined;
      this.markFrontierSize(0);
      return this.noopEvent();
    }

    const current = this.#stack.pop()!;
    this.frontierKeys.delete(current);
    this.currentKey = current;
    this.expandedCount += 1;
    this.algoSteps += 1;

    const expanded = this.posFromKey(current);
    if (current === this.goalKey) {
      this.status = "FOUND";
      const pathKeys = reconstructPathKeys(this.#cameFrom, this.startKey, this.goalKey) ?? [this.startKey];
      this.pathKeys = pathKeys;
      this.pathLength = Math.max(0, pathKeys.length - 1);
      this.pathCost = computePathCost(this.maze, pathKeys);
      this.markFrontierSize(this.#stack.length);
      return {
        stepIndex: this.algoSteps,
        expanded,
        frontierSize: this.frontierSize,
        frontierMaxSize: this.frontierMaxSize,
        found: true,
        done: true,
      };
    }

    const neighbors = neighborsURDL(this.maze, expanded);
    const frontierAdded: Pos[] = [];
    const visitedAdded: Pos[] = [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const nPos = neighbors[i]!;
      const nKey = posKey(this.maze, nPos);
      if (this.visitedKeys.has(nKey)) continue;
      this.visitedKeys.add(nKey);
      this.#cameFrom.set(nKey, current);
      this.#stack.push(nKey);
      this.frontierKeys.add(nKey);
      frontierAdded.push(nPos);
      visitedAdded.push(nPos);
    }
    this.markFrontierSize(this.#stack.length);

    return {
      stepIndex: this.algoSteps,
      expanded,
      frontierAdded: frontierAdded.length ? frontierAdded : undefined,
      visitedAdded: visitedAdded.length ? visitedAdded : undefined,
      frontierSize: this.frontierSize,
      frontierMaxSize: this.frontierMaxSize,
      found: false,
      done: false,
    };
  }
}

