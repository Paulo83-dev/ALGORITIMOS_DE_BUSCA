import type { Pos } from "../../maze/types";
import { manhattan, neighborsURDL, posKey } from "../../maze/utils";
import { computePathCost, reconstructPathKeys } from "../path";
import { PriorityQueue } from "../priorityQueue";
import { BaseRunner } from "../baseRunner";
import type { StepEvent } from "../types";

type PQItem = { key: number; h: number; tie: number };

export class GreedyRunner extends BaseRunner {
  #pq: PriorityQueue<PQItem> | undefined;
  #tie = 0;
  readonly #cameFrom = new Map<number, number>();

  constructor() {
    super("Greedy");
  }

  protected onReset(): void {
    this.#tie = 0;
    this.#cameFrom.clear();
    this.#pq = new PriorityQueue<PQItem>((a, b) => (a.h - b.h) || (a.tie - b.tie));
  }

  protected onStart(): void {
    if (!this.maze) return;
    this.#tie = 0;
    this.#cameFrom.clear();
    this.#pq = new PriorityQueue<PQItem>((a, b) => (a.h - b.h) || (a.tie - b.tie));

    this.visitedKeys.add(this.startKey);
    this.frontierKeys.add(this.startKey);
    this.#pq.push({ key: this.startKey, h: this.#heuristic(this.startKey), tie: this.#tie++ });
    this.markFrontierSize(this.#pq.size);
  }

  #heuristic(key: number): number {
    if (!this.maze) return 0;
    const p = this.posFromKey(key);
    return manhattan(p, this.maze.goal);
  }

  step(): StepEvent {
    if (this.status !== "RUNNING") return this.noopEvent();
    if (!this.maze || !this.#pq) return this.noopEvent();

    const item = this.#pq.pop();
    if (!item) {
      this.status = "NO_SOLUTION";
      this.currentKey = undefined;
      this.frontierKeys.clear();
      this.markFrontierSize(0);
      return this.noopEvent();
    }

    const current = item.key;
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
      this.markFrontierSize(this.#pq.size);
      return {
        stepIndex: this.algoSteps,
        expanded,
        frontierSize: this.frontierSize,
        frontierMaxSize: this.frontierMaxSize,
        found: true,
        done: true,
      };
    }

    const frontierAdded: Pos[] = [];
    const visitedAdded: Pos[] = [];
    for (const nPos of neighborsURDL(this.maze, expanded)) {
      const nKey = posKey(this.maze, nPos);
      if (this.visitedKeys.has(nKey)) continue;
      this.visitedKeys.add(nKey);
      this.#cameFrom.set(nKey, current);
      this.frontierKeys.add(nKey);
      this.#pq.push({ key: nKey, h: this.#heuristic(nKey), tie: this.#tie++ });
      frontierAdded.push(nPos);
      visitedAdded.push(nPos);
    }
    this.markFrontierSize(this.#pq.size);

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

