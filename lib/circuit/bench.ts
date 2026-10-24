import esp32s3 from "../../content/parts/esp32-s3-devkitc-1.json";
import uno from "../../content/parts/arduino-uno.json";
import perch from "../../content/benches/perch.json";

// The bench: the breadboards and the main board of a project, from content/benches/<project>.json.
// One unit is one hole pitch (2.54 mm). The bench lies in the x–z plane, seen from above:
// breadboard A on the left, column 1 nearest to you and column 30 farthest.
// - Perch: two breadboards, with the ESP32-S3-DevKitC-1 across them. Its pins are in breadboard holes.
// - Arduino Foundations: one breadboard, with the Arduino Uno on the table beside it. Its pins are sockets: a wire
//   goes into the pin itself.

export const COLUMNS = 30;
export const RAIL_HOLES = 25;
export const MAIN_ROWS = "abcdefghij";

/** Distance of each row from row a, across the board. Rows a–e and f–j are separated by the center gap. */
const ROW_X: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 7, g: 8, h: 9, i: 10, j: 11 };
/** The 4 rails, from left to right: L+ L− (beside row a) and R− R+ (beside row j). */
export const RAILS = { "L+": -3.3, "L-": -2.3, "R-": 13.3, "R+": 14.3 } as const;
export type Rail = keyof typeof RAILS;

/** Size of one breadboard, and the x distance from its row a to its center. */
export const BOARD = { width: 19.4, length: 32.5, centerX: 5.5 } as const;

export type Outline = { x0: number; x1: number; z0: number; z1: number };

export type Hole = {
  /** For example "A-c14" (board A, row c, column 14), "B-R+3" (board B, right + rail, hole 3) or "uno-D13" (a pin). */
  id: string;
  /** The breadboard ("A", "B"), or the id of the main board for a pin socket ("uno"). */
  board: string;
  /** "pin": a socket of the main board, not a breadboard hole. */
  kind: "main" | "rail" | "pin";
  /** Main hole: a–j. Rail hole: L+, L-, R- or R+. Pin: the pin name. */
  row: string;
  /** Main hole: column 1–30. Rail hole: position 1–25 along the rail. Pin: 0. */
  n: number;
  /** The holes that the metal clip under the board connects: 5 holes of a half-column, or a full rail. A pin: itself. */
  strip: string;
  x: number;
  z: number;
};

/** A pin of the main board. `socket`: a wire goes into the pin itself (Uno). Else the pin is in a breadboard hole (ESP32-S3). */
export type BoardPin = { hole: string; name: string; label: string; header: string; socket: boolean };

/** content/benches/<project>.json */
export type BenchSpec = {
  /** The part type of the main board, as in content/parts/. */
  board: "esp32-s3-devkitc-1" | "arduino-uno";
  /** The name of the main board in content/projects: `esp.GPIO4`, `uno.D13`. */
  id: string;
  /** The name of the main board for the learner, for example "ESP32-S3". */
  name: string;
  breadboards: { id: string; x: number }[];
  mount: { kind: "breadboard"; first_column: number; headers: Record<string, string> } | { kind: "table"; x: number; z: number };
  open_rails: Record<string, { "+": Rail; "-": Rail }>;
  view: { target: { x: number; z: number }; width: number; length: number };
};

export type Bench = {
  holes: Hole[];
  byId: Map<string, Hole>;
  pins: BoardPin[];
  pinAt: Map<string, BoardPin>;
  /** Holes under the main board. You cannot reach them. */
  covered: Set<string>;
  breadboards: { id: string; x: number }[];
  /** The rail that `bbA.+`, `bbA.-`, `bbB.+` and `bbB.-` name: the one that the main board does not cover. */
  openRail: Record<string, { "+": Rail; "-": Rail }>;
  /** The main board: its part type, its name in content/projects, its name for the learner, and its outline on the bench. */
  board: { type: BenchSpec["board"]; id: string; name: string; outline: Outline };
  /** The outline of everything on the bench. */
  area: Outline;
  view: BenchSpec["view"];
};

/** z of a column (1–30) or a rail position (1.5–29.5). Column 1 is nearest to you. */
export const columnZ = (column: number) => (COLUMNS + 1) / 2 - column;

/** Column position of rail hole 1–25: groups of 5 with a gap between the groups. */
export const railColumn = (n: number) => 0.5 + n + Math.floor((n - 1) / 5);

function boardHoles(board: string, x0: number): Hole[] {
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

/** The outline of one breadboard whose row a is at x = `x`. */
export function breadboardOutline(x: number): Outline {
  const center = x + BOARD.centerX;
  return { x0: center - BOARD.width / 2, x1: center + BOARD.width / 2, z0: -BOARD.length / 2, z1: BOARD.length / 2 };
}

/** The ESP32-S3 across two breadboards: each header in a row of holes, pin 1 in `first_column`. */
function espOnBreadboards(byId: Map<string, Hole>, mount: { first_column: number; headers: Record<string, string> }) {
  const labels: Record<string, string> = esp32s3.labels;
  const headers = esp32s3.headers as Record<string, string[]>;
  const pins: BoardPin[] = Object.entries(mount.headers).flatMap(([header, row]) =>
    headers[header].map((name, k) => ({
      hole: `${row}${mount.first_column + k}`,
      name,
      label: labels[name] ?? name.replace(/^GPIO/, ""),
      header,
      socket: false,
    })),
  );
  // The board is 25.5 mm wide and 63 mm long: it reaches half a pitch past each header, and past the last pins.
  const xs = pins.map((p) => byId.get(p.hole)!.x);
  const pinCount = Math.max(...Object.values(headers).map((h) => h.length));
  const outline = {
    x0: Math.min(...xs) - 0.5,
    x1: Math.max(...xs) + 0.5,
    z0: columnZ(mount.first_column + pinCount + 0.9),
    z1: columnZ(mount.first_column - 1.7),
  };
  return { pins, holes: [] as Hole[], outline };
}

/**
 * The place on the bench of the point (u, v) of the Uno, as in the Uno R3 drawing: u goes along the long side from the
 * USB end (left), v goes across from the power header (near you). The corner u = 0, v = 0 is at x0 and z1.
 */
export const unoAt = (outline: Outline, u: number, v: number) => ({ x: outline.x0 + u, z: outline.z1 - v });

/**
 * The Uno on the table, as in the Uno R3 drawing: the USB end on the left, the digital header far from you, and the
 * power header near you. `mount` is the corner at the USB end and the power header. Each pin is a socket: a hole of its
 * own, with its own strip.
 */
function unoOnTable(id: string, mount: { x: number; z: number }) {
  const outline = { x0: mount.x, x1: mount.x + uno.size.length, z0: mount.z - uno.size.width, z1: mount.z };
  const labels: Record<string, string> = uno.labels;
  const unused = new Set(uno.unused);
  const count = new Map<string, number>();
  for (const h of uno.headers) for (const name of h.pins) count.set(name, (count.get(name) ?? 0) + 1);
  const seen = new Map<string, number>();
  const pins: BoardPin[] = [];
  const holes: Hole[] = [];
  uno.headers.forEach((h, header) =>
    h.pins.forEach((name, k) => {
      if (unused.has(name)) return;
      // The 3 GND pins get the holes uno-GND1, uno-GND2 and uno-GND3. They have the same name, so they are one net.
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      const hole = `${id}-${name}${count.get(name)! > 1 ? n : ""}`;
      holes.push({ id: hole, board: id, kind: "pin", row: name, n: 0, strip: hole, ...unoAt(outline, h.u + k, h.v) });
      pins.push({ hole, name, label: labels[name] ?? name, header: String(header), socket: true });
    }),
  );
  return { pins, holes, outline };
}

/** Benches by their spec, so that the same spec gives the same bench object. */
const made = new Map<string, Bench>();

/** The bench of a content/benches/ file. */
export function createBench(spec: BenchSpec): Bench {
  const { board, id, name, breadboards, mount, open_rails, view } = spec;
  const key = JSON.stringify([board, id, name, breadboards, mount, open_rails, view]);
  const cached = made.get(key);
  if (cached) return cached;

  const boardHoleList = spec.breadboards.flatMap((b) => boardHoles(b.id, b.x));
  const byBoardHole = new Map(boardHoleList.map((h) => [h.id, h]));
  const main = spec.mount.kind === "breadboard" ? espOnBreadboards(byBoardHole, spec.mount) : unoOnTable(spec.id, spec.mount);
  const holes = [...boardHoleList, ...main.holes];
  const byId = new Map(holes.map((h) => [h.id, h]));
  const pinAt = new Map(main.pins.map((p) => [p.hole, p]));

  const { outline } = main;
  const covered = new Set(
    spec.mount.kind === "breadboard"
      ? boardHoleList.filter((h) => !pinAt.has(h.id) && h.x > outline.x0 && h.x < outline.x1 && h.z > outline.z0 && h.z < outline.z1).map((h) => h.id)
      : [],
  );
  const outlines = [outline, ...spec.breadboards.map((b) => breadboardOutline(b.x))];
  const area = {
    x0: Math.min(...outlines.map((o) => o.x0)),
    x1: Math.max(...outlines.map((o) => o.x1)),
    z0: Math.min(...outlines.map((o) => o.z0)),
    z1: Math.max(...outlines.map((o) => o.z1)),
  };

  const bench: Bench = {
    holes,
    byId,
    pins: main.pins,
    pinAt,
    covered,
    breadboards: spec.breadboards,
    openRail: spec.open_rails,
    board: { type: spec.board, id: spec.id, name: spec.name, outline },
    area,
    view: spec.view,
  };
  made.set(key, bench);
  return bench;
}

/** The Perch bench: A on the left, B on the right, J3 of the ESP32-S3 in row j of A and J1 in row a of B. */
export const perchBench = () => createBench(perch as unknown as BenchSpec);

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
