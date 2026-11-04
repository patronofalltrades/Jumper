/**
 * The layout of the level path of a project (the canvas of issue #152: square tiles joined by a path, after Mimo).
 * x is in percent of the board width (0 to 100). y is in pixels from the top of the board.
 */

/** The x of the left, middle and right column, in percent. */
export const COLUMNS = [18, 50, 82] as const;
/** The column of each tile, in turn: middle, right, middle, left. */
const PATTERN = [1, 2, 1, 0];
const ROW = 168;
const TOP = 84;
const BEND = { x: 7, y: 24 };

export type PathPoint = { x: number; y: number; col: number };

/** The center of each tile, one SVG path segment from each tile to the next, and the board height. */
export function pathLayout(count: number, cols: number[] = Array.from({ length: count }, (_, i) => PATTERN[i % PATTERN.length])) {
  const points: PathPoint[] = cols.slice(0, count).map((col, i) => ({ x: COLUMNS[col], y: TOP + i * ROW, col }));
  const segments = points.slice(1).map((b, i) => segment(points[i], b));
  const height = count === 0 ? 0 : TOP + (count - 1) * ROW + 110;
  return { points, segments, height };
}

// Across to the column of the next tile, a round bend, then down to it.
function segment(a: PathPoint, b: PathPoint) {
  if (a.x === b.x) return `M${a.x} ${a.y} V${b.y}`;
  const dir = b.x > a.x ? 1 : -1;
  return `M${a.x} ${a.y} H${b.x - dir * BEND.x} Q${b.x} ${a.y} ${b.x} ${a.y + BEND.y} V${b.y}`;
}

/** The percent of the levels that passed, rounded. */
export const progressPercent = (count: number, passed: number[]) => (count === 0 ? 0 : Math.round((passed.filter((n) => n >= 1 && n <= count).length / count) * 100));
