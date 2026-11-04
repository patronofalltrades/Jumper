// The tile path of the lobby (issue #152, after the Mimo level list): square level tiles on a dot grid, one on each row,
// joined by wires with rounded bends. Pure TypeScript: the positions and the SVG paths, in a 340-wide box.

export const PATH_WIDTH = 340;
const COLUMNS = [60, 170, 280];
const ZIGZAG = [1, 2, 1, 0]; // center, right, center, left
const TOP = 60;
const ROW = 120;
const BOTTOM = 80;
const BEND = 24;

type Point = readonly [number, number];

// One wire from tile a to tile b: across, a rounded bend, then down. Straight down when both are in one column.
function segment([ax, ay]: Point, [bx, by]: Point): string {
  if (ax === bx) return `M${ax} ${ay} V${by}`;
  const dir = bx > ax ? 1 : -1;
  return `M${ax} ${ay} H${bx - dir * BEND} Q${bx} ${ay} ${bx} ${ay + BEND} V${by}`;
}

/**
 * The tiles and wires for `count` tiles, of which the first `passed` are done. The done wire goes from tile 1 up to
 * the tile after the last passed one (the tile to play now); the rest is the to-do wire.
 */
export function tilePath(count: number, passed: number) {
  const points: Point[] = Array.from({ length: count }, (_, i) => [COLUMNS[ZIGZAG[i % ZIGZAG.length]], TOP + i * ROW]);
  const segments = points.slice(1).map((p, i) => segment(points[i], p));
  const split = Math.min(Math.max(passed, 0), segments.length);
  return {
    points,
    done: segments.slice(0, split).join(" "),
    todo: segments.slice(split).join(" "),
    height: TOP + (count - 1) * ROW + BOTTOM,
  };
}

/** The share of passed levels, as a whole percent. */
export const progressPercent = (count: number, passed: number) => (count > 0 ? Math.round((passed / count) * 100) : 0);
