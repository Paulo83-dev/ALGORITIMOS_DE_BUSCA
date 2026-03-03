export const COST_PALETTE: Record<number, string> = {
  1: "#f5f5f5",
  2: "#fff2cc",
  3: "#ffd966",
  4: "#f4b183",
  5: "#e69138",
  6: "#cc4125",
  7: "#a61c00",
  8: "#7f0000",
};

export function costToColor(cost: number): string {
  if (cost <= 0) return "#1a1a1a";
  if (cost >= 9) return "#4d0000";
  return COST_PALETTE[cost] ?? COST_PALETTE[8];
}

