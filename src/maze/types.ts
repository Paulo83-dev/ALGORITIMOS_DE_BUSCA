export type Pos = { r: number; c: number };

export type MazeModel = {
  rows: number;
  cols: number;
  grid: number[][]; // 0=wall; >=1 cost (entering the cell)
  start: Pos;
  goal: Pos;
};

