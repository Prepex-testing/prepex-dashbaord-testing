/** Roughly how many gaps to aim for between gridlines. */
const GRID_TARGET = 4;

/**
 * A y-axis ceiling and tick list that are whole, readable numbers.
 *
 * Dividing the maximum into a fixed four gaps gives ticks like 0 / 6 / 13 /
 * 19 / 25, which nobody can read at a glance. Rounding the gap to 1, 2, 2.5, 5
 * or 10 (times a power of ten) first gives 0 / 5 / 10 / 15 / 20 / 25 instead,
 * at the cost of sometimes drawing one more line than asked for.
 *
 * The ceiling is derived from the data, so a chart that suddenly plots 250
 * students instead of 25 re-labels itself rather than clipping.
 */
export function niceScale(rawMax: number): { max: number; ticks: number[] } {
  const safeMax = Math.max(rawMax, 1);
  const rough = safeMax / GRID_TARGET;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const niceNormalized =
    normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const max = Math.ceil(safeMax / step) * step;
  const lines = Math.round(max / step);

  return {
    max,
    // Highest first, so the list maps straight onto a top-to-bottom axis.
    ticks: Array.from({ length: lines + 1 }, (_, index) => max - step * index),
  };
}
