import inmp441 from "../../content/parts/inmp441.json";
import max98357a from "../../content/parts/max98357a.json";
import pushbutton from "../../content/parts/pushbutton.json";
import st7789 from "../../content/parts/st7789-154.json";
import { MAIN_ROWS, type Bench, type Hole } from "./bench.ts";

// Modules: parts with many pins (button, mic, amplifier, screen). The pin layouts are data in content/parts/.
// The learner selects the hole for pin 1; the layout gives the hole of each other pin.

export type FootprintPin = {
  /** The name in content/projects, for example "WS" in `mic1.WS`. Pins with the same name connect inside the part. */
  name: string;
  /** The text printed on the part. */
  label: string;
  /** Rows (a, b, c…) and columns from pin 1. */
  row: number;
  col: number;
  /** A screw terminal on top of the module: the pin is not in a breadboard hole. Speaker leads and wires go into it. */
  terminal?: boolean;
};

export type Footprint = {
  type: string;
  title: string;
  /** The start of the part id: `mic` gives mic1, mic2… */
  prefix: string;
  source_url: string;
  /** True: the part must go across the center gap. False: all its pins stay on one side. */
  across: boolean;
  pins: FootprintPin[];
  /** The body covers the holes within `margin` pitches of the pins. */
  body: { margin: number; height: number; color: string };
};

export const FOOTPRINTS = {
  pushbutton: pushbutton as Footprint,
  inmp441: inmp441 as Footprint,
  max98357a: max98357a as Footprint,
  "st7789-154": st7789 as Footprint,
} as const;

export type ModuleType = keyof typeof FOOTPRINTS;

export const isModuleType = (type: string): type is ModuleType => type in FOOTPRINTS;

/** A pin and its hole. For a terminal pin, `hole` is the hole under the terminal: it gives the place, not a connection. */
export type PinHole = { name: string; label: string; hole: string; terminal?: boolean };

/**
 * The hole of each pin when pin 1 is in hole `at`. Null if `at` is not a main hole, or a pin is off the breadboard.
 * A terminal pin gets the hole under it, for its place on the bench.
 */
export function footprintHoles(bench: Bench, type: ModuleType, at: string): PinHole[] | null {
  const first = bench.byId.get(at);
  if (!first || first.kind !== "main") return null;
  const row0 = MAIN_ROWS.indexOf(first.row);
  const out: PinHole[] = [];
  for (const pin of FOOTPRINTS[type].pins) {
    const row = MAIN_ROWS[row0 + pin.row];
    const hole = row && bench.byId.get(`${first.board}-${row}${first.n + pin.col}`);
    if (!hole) return null;
    out.push({ name: pin.name, label: pin.label, hole: hole.id, ...(pin.terminal && { terminal: true }) });
  }
  return out;
}

/** The outline of the body on the bench: the pins, plus the margin. */
export function bodyOutline(bench: Bench, type: ModuleType, pins: PinHole[]) {
  const m = FOOTPRINTS[type].body.margin;
  const holes = pins.map((p) => bench.byId.get(p.hole)!);
  const xs = holes.map((h) => h.x);
  const zs = holes.map((h) => h.z);
  return { x0: Math.min(...xs) - m, x1: Math.max(...xs) + m, z0: Math.min(...zs) - m, z1: Math.max(...zs) + m };
}

/** The holes under the body, without the holes of the pins that go into the breadboard. Nothing can go in them. */
export function bodyHoles(bench: Bench, type: ModuleType, pins: PinHole[]): Hole[] {
  const { x0, x1, z0, z1 } = bodyOutline(bench, type, pins);
  const own = new Set(pins.filter((p) => !p.terminal).map((p) => p.hole));
  return bench.holes.filter((h) => !own.has(h.id) && h.x > x0 && h.x < x1 && h.z > z0 && h.z < z1);
}

/** True when the breadboard pins are on the two sides of the center gap. */
export function crossesGap(bench: Bench, pins: PinHole[]): boolean {
  const halves = new Set(pins.filter((p) => !p.terminal).map((p) => "abcde".includes(bench.byId.get(p.hole)!.row)));
  return halves.size === 2;
}
