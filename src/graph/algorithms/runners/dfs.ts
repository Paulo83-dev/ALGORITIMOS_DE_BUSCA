import type { GraphPos } from "../../types";
import { computeGraphPathCost } from "../../utils";
import { reconstructPathKeys } from "../../../algorithms/path";
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
    if (!this.graph) return this.noopEvent();

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
      this.pathCost = computeGraphPathCost(this.graph, pathKeys);
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

    const neighbors = this.graph.adjacency[current] ?? [];
    const frontierAdded: GraphPos[] = [];
    const visitedAdded: GraphPos[] = [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const nKey = neighbors[i]!.to;
      if (this.visitedKeys.has(nKey)) continue;
      this.visitedKeys.add(nKey);
      this.#cameFrom.set(nKey, current);
      this.#stack.push(nKey);
      this.frontierKeys.add(nKey);
      const nPos = this.posFromKey(nKey);
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
