import type { Pos } from "../../maze/types";
import { manhattan, neighborsURDL, posKey } from "../../maze/utils";
import { computePathCost, reconstructPathKeys } from "../path";
import { PriorityQueue } from "../priorityQueue";
import { BaseRunner } from "../baseRunner";
import type { StepEvent } from "../types";

type PQItem = { key: number; g: number; f: number; tie: number };

export class AStarRunner extends BaseRunner {
  #pq: PriorityQueue<PQItem> | undefined;
  #tie = 0;
  readonly #cameFrom = new Map<number, number>();
  readonly #gScore = new Map<number, number>();
  readonly #frontierCounts = new Map<number, number>();

  constructor() {
    super("A*");
  }

  protected onReset(): void {
    this.#tie = 0;
    this.#cameFrom.clear();
    this.#gScore.clear();
    this.#frontierCounts.clear();
    this.#pq = new PriorityQueue<PQItem>((a, b) => (a.f - b.f) || (a.tie - b.tie));
  }

  protected onStart(): void {
    this.#tie = 0;
    this.#cameFrom.clear();
    this.#gScore.clear();
    this.#frontierCounts.clear();
    this.#pq = new PriorityQueue<PQItem>((a, b) => (a.f - b.f) || (a.tie - b.tie));

    this.#gScore.set(this.startKey, 0);
    this.visitedKeys.add(this.startKey);
    this.#pushFrontier(this.startKey, 0);
    this.markFrontierSize(this.#pq.size);
  }

  #heuristic(key: number): number {
    if (!this.maze) return 0;
    const p = this.posFromKey(key);
    return manhattan(p, this.maze.goal);
  }

  #pushFrontier(key: number, g: number): void {
    if (!this.#pq) return;
    const f = g + this.#heuristic(key);
    this.#pq.push({ key, g, f, tie: this.#tie++ });
    const next = (this.#frontierCounts.get(key) ?? 0) + 1;
    this.#frontierCounts.set(key, next);
    this.frontierKeys.add(key);
  }

  #popFrontierKey(key: number): void {
    const next = (this.#frontierCounts.get(key) ?? 0) - 1;
    if (next <= 0) {
      this.#frontierCounts.delete(key);
      this.frontierKeys.delete(key);
      return;
    }
    this.#frontierCounts.set(key, next);
  }

  step(): StepEvent {
    if (this.status !== "RUNNING") return this.noopEvent();
    if (!this.maze || !this.#pq) return this.noopEvent();

    let item: PQItem | undefined;
    while (true) {
      item = this.#pq.pop();
      if (!item) {
        this.status = "NO_SOLUTION";
        this.currentKey = undefined;
        this.frontierKeys.clear();
        this.#frontierCounts.clear();
        this.markFrontierSize(0);
        return this.noopEvent();
      }
      this.#popFrontierKey(item.key);
      const bestG = this.#gScore.get(item.key);
      if (bestG === undefined) continue;
      if (item.g > bestG) continue;
      break;
    }

    const current = item.key;
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

    const bestG = this.#gScore.get(current) ?? 0;
    const frontierAdded: Pos[] = [];
    const visitedAdded: Pos[] = [];
    for (const nPos of neighborsURDL(this.maze, expanded)) {
      const nKey = posKey(this.maze, nPos);
      const tentativeG = bestG + this.maze.grid[nPos.r]![nPos.c]!;
      const prevG = this.#gScore.get(nKey);
      if (prevG !== undefined && tentativeG >= prevG) continue;
      this.#gScore.set(nKey, tentativeG);
      this.#cameFrom.set(nKey, current);
      if (prevG === undefined) {
        this.visitedKeys.add(nKey);
        visitedAdded.push(nPos);
      }
      this.#pushFrontier(nKey, tentativeG);
      frontierAdded.push(nPos);
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

