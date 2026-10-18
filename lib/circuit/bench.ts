import esp32s3 from "../../content/parts/esp32-s3-devkitc-1.json";

// The bench: two 400-hole breadboards with the ESP32-S3-DevKitC-1 across them.
// One unit is one hole pitch (2.54 mm). The bench lies in the x–z plane, seen from above:
// breadboard A on the left, breadboard B on the right, column 1 nearest to you and column 30 farthest.

export const COLUMNS = 30;
export const RAIL_HOLES = 25;
export const MAIN_ROWS = "abcdefghij";

/** Distance of each row from row a, across the board. Rows a–e and f–j are separated by the center gap. */
const ROW_X: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 7, g: 8, h: 9, i: 10, j: 11 };
/** The 4 rails, from left to right: L+ L− (beside row a) and R− R+ (beside row j). */
export const RAILS = { "L+": -3.3, "L-": -2.3, "R-": 13.3, "R+": 14.3 } as const;
export type Rail = keyof typeof RAILS;

/** Size of one breadboard, and the x distance from row a of A to row a of B. */
export const BOARD = { width: 19.4, length: 32.5, centerX: 5.5 } as const;
export const BOARD_B_X = 20;

export type Hole = {
  /** For example "A-c14" (board A, row c, column 14) or "B-R+3" (board B, right + rail, hole 3). */
  id: string;
  board: "A" | "B";
  kind: "main" | "rail";
  /** Main hole: a–j. Rail hole: L+, L-, R- or R+. */
  row: string;
  /** Main hole: column 1–30. Rail hole: position 1–25 along the rail. */
  n: number;
  /** The holes that the metal clip under the board connects: 5 holes of a half-column, or a full rail. */
  strip: string;
  x: number;
  z: number;
};

export type EspPin = { hole: string; name: string; label: string; header: "J1" | "J3" };

export type Bench = {
  holes: Hole[];
  byId: Map<string, Hole>;
  pins: EspPin[];
  pinAt: Map<string, EspPin>;
  /** Holes under the ESP32-S3 board. You cannot reach them. */
  covered: Set<string>;
  /** The rail that `bbA.+`, `bbA.-`, `bbB.+` and `bbB.-` name: the one that the ESP32-S3 does not cover. */
  openRail: Record<"A" | "B", { "+": Rail; "-": Rail }>;
  /** The outline of the ESP32-S3 board on the bench. */
  esp: { x0: number; x1: number; z0: number; z1: number };
};

/** z of a column (1–30) or a rail position (1.5–29.5). Column 1 is nearest to you. */
export const columnZ = (column: number) => (COLUMNS + 1) / 2 - column;

/** Column position of rail hole 1–25: groups of 5 with a gap between the groups. */
export const railColumn = (n: number) => 0.5 + n + Math.floor((n - 1) / 5);

function boardHoles(board: "A" | "B", x0: number): Hole[] {
  const holes: Hole[] = [];
  for (let c = 1; c <= COLUMNS; c++) {
    for (const r of MAIN_ROWS) {
      const half = ROW_X[r] <= 4 ? "a-e" : "f-j";
      holes.push({ id: `${board}-${r}${c}`, board, kind: "main", row: r, n: c, strip: `${board}-${c}${half}`, x: x0 + ROW_X[r], z: columnZ(c) });
    }
  }
  for (const [rail, x] of Object.entries(RAILS)) {
    for (let n = 1; n <= RAIL_HOLES; n++) {
      holes.push({ id: `${board}-${rail}${n}`, board, kind: "rail", row: rail, n, strip: `${board}-${rail}`, x: x0 + x, z: columnZ(railColumn(n)) });
    }
  }
  return holes;
}

/** Pin 1 of each header sits in this column. The antenna end of the board is near column 1. */
const ESP_FIRST_COLUMN = 5;
const ESP_HEADERS = [
  { header: "J3", row: "A-j" },
  { header: "J1", row: "B-a" },
] as const;

/** The Perch bench: A on the left, B on the right, J3 of the ESP32-S3 in row j of A and J1 in row a of B. */
export function perchBench(): Bench {
  const holes = [...boardHoles("A", 0), ...boardHoles("B", BOARD_B_X)];
  const byId = new Map(holes.map((h) => [h.id, h]));
  const labels: Record<string, string> = esp32s3.labels;

  const pins: EspPin[] = ESP_HEADERS.flatMap(({ header, row }) =>
    esp32s3.headers[header].map((name, k) => ({
      hole: `${row}${ESP_FIRST_COLUMN + k}`,
      name,
      label: labels[name] ?? name.replace(/^GPIO/, ""),
      header,
    })),
  );
  const pinAt = new Map(pins.map((p) => [p.hole, p]));

  // The board is 25.5 mm wide and 63 mm long: it reaches half a pitch past each header, and past the last pins.
  const pinCount = esp32s3.headers.J1.length;
  const esp = {
    x0: ROW_X.j - 0.5,
    x1: BOARD_B_X + 0.5,
    z0: columnZ(ESP_FIRST_COLUMN + pinCount + 0.9),
    z1: columnZ(ESP_FIRST_COLUMN - 1.7),
  };
  const covered = new Set(
    holes.filter((h) => !pinAt.has(h.id) && h.x > esp.x0 && h.x < esp.x1 && h.z > esp.z0 && h.z < esp.z1).map((h) => h.id),
  );

  return {
    holes,
    byId,
    pins,
    pinAt,
    covered,
    openRail: { A: { "+": "L+", "-": "L-" }, B: { "+": "R+", "-": "R-" } },
    esp,
  };
}

/** The nearest hole to a point on the bench, if one is closer than `radius` (default: half a pitch). */
export function nearestHole(bench: Bench, x: number, z: number, radius = 0.5): Hole | null {
  let best: Hole | null = null;
  let bestDistance = radius;
  for (const h of bench.holes) {
    const d = Math.hypot(h.x - x, h.z - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = h;
    }
  }
  return best;
}

/** Distance between two holes, in hole pitches. */
export const holeDistance = (a: Hole, b: Hole) => Math.hypot(a.x - b.x, a.z - b.z);
