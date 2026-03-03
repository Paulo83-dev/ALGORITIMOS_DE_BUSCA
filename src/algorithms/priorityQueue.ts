export type Compare<T> = (a: T, b: T) => number;

export class PriorityQueue<T> {
  readonly #data: T[] = [];
  readonly #compare: Compare<T>;

  constructor(compare: Compare<T>) {
    this.#compare = compare;
  }

  get size(): number {
    return this.#data.length;
  }

  peek(): T | undefined {
    return this.#data[0];
  }

  push(item: T): void {
    this.#data.push(item);
    this.#bubbleUp(this.#data.length - 1);
  }

  pop(): T | undefined {
    if (this.#data.length === 0) return undefined;
    const root = this.#data[0]!;
    const last = this.#data.pop()!;
    if (this.#data.length > 0) {
      this.#data[0] = last;
      this.#bubbleDown(0);
    }
    return root;
  }

  #bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.#compare(this.#data[index]!, this.#data[parent]!) >= 0) return;
      [this.#data[index], this.#data[parent]] = [this.#data[parent]!, this.#data[index]!];
      index = parent;
    }
  }

  #bubbleDown(index: number): void {
    const length = this.#data.length;
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (left < length && this.#compare(this.#data[left]!, this.#data[smallest]!) < 0) {
        smallest = left;
      }
      if (right < length && this.#compare(this.#data[right]!, this.#data[smallest]!) < 0) {
        smallest = right;
      }
      if (smallest === index) return;
      [this.#data[index], this.#data[smallest]] = [this.#data[smallest]!, this.#data[index]!];
      index = smallest;
    }
  }
}

