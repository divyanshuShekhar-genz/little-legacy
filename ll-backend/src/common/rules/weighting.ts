/** Area weighting (guide §8). Weighted average and chart shares are different results. */

export interface WeightedArea {
  value: number;
  weight: number;
}

export interface WeightingResult {
  /** Σ(value·weight) / Σ(weight). */
  weightedAverage: number;
  /** Each area's weighted value as a percentage of the total weighted value; sums to 100. */
  shares: number[];
}

/** Null when there is not enough information (all weighted values zero) — never invent a result. */
export function weightAreas(areas: WeightedArea[]): WeightingResult | null {
  const weighted = areas.map((a) => a.value * a.weight);
  const total = weighted.reduce((s, v) => s + v, 0);
  const totalWeight = areas.reduce((s, a) => s + a.weight, 0);
  if (total === 0 || totalWeight === 0) return null;
  return {
    weightedAverage: total / totalWeight,
    shares: weighted.map((v) => (v / total) * 100),
  };
}

/**
 * Percentages that add up to exactly 100 at `decimals` places (prototype: "largest-remainder
 * method so the total is exactly 100.00%"). Null when everything is 0 — "Not enough assessment
 * data", never an invented result.
 */
export function largestRemainderPercents(values: number[], decimals = 2): number[] | null {
  const total = values.reduce((s, v) => s + v, 0);
  if (!(total > 0)) return null;
  const scale = 10 ** decimals;
  const exact = values.map((v) => (v / total) * 100 * scale);
  const floors = exact.map(Math.floor);
  let left = 100 * scale - floors.reduce((s, v) => s + v, 0);
  // Hand the remaining units to the largest fractional parts (ties: earlier first).
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]!++;
    left--;
  }
  return floors.map((v) => v / scale);
}
