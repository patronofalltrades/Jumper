import { holeDistance, type Bench } from "./bench.ts";
import { bodyHoles, crossesGap, footprintHoles, FOOTPRINTS, isModuleType, type ModuleType, type PinHole } from "./modules.ts";

export type LegType = "wire" | "resistor" | "led" | "speaker";

/** A two-leg part on the bench. For an LED, `a` is the + leg (anode) and `b` is the − leg (cathode). */
export type LegPart = { id: string; type: LegType; a: string; b: string; color?: string };
/** A module on the bench, with pin 1 in hole `at` (TRD 6.3). */
export type ModulePart = { id: string; type: ModuleType; at: string };
export type Part = LegPart | ModulePart;
export type PartType = Part["type"];

export const isModule = (p: Part): p is ModulePart => isModuleType(p.type);

/** Endpoint pin names of each two-leg part type: `r1.1`, `led1.anode`, `spk1.+`. */
export const LEG_NAMES: Record<LegType, [string, string]> = {
  wire: ["a", "b"],
  resistor: ["1", "2"],
  led: ["anode", "cathode"],
  speaker: ["+", "-"],
};

const ID_PREFIX: Record<LegType, string> = { wire: "w", resistor: "r", led: "led", speaker: "spk" };

/** The next free id for a part type: w1, w2… r1… led1… mic1… */
export function nextPartId(parts: Part[], type: PartType): string {
  const prefix = isModuleType(type) ? FOOTPRINTS[type].prefix : ID_PREFIX[type];
  const used = new Set(parts.map((p) => p.id));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** The pins of a part and their holes. */
export function partPins(bench: Bench, p: Part): PinHole[] {
  if (isModule(p)) return footprintHoles(bench, p.type, p.at) ?? [];
  const [na, nb] = LEG_NAMES[p.type];
  return [
    { name: na, label: na, hole: p.a },
    { name: nb, label: nb, hole: p.b },
  ];
}

/** The part with a leg or a pin in this hole. */
export const partAt = (bench: Bench, parts: Part[], hole: string) => parts.find((p) => partPins(bench, p).some((pin) => pin.hole === hole));

/** The module whose body is on top of this hole. */
export const moduleOver = (bench: Bench, parts: Part[], hole: string) =>
  parts.find((p) => isModule(p) && bodyHoles(bench, p.type, partPins(bench, p)).some((h) => h.id === hole));

export type PlaceProblem =
  | "no_hole"
  | "covered"
  | "esp_pin"
  | "taken"
  | "part_pin"
  | "under_part"
  | "led_span"
  | "resistor_span"
  | "off_board"
  | "rail_pin"
  | "needs_gap"
  | "on_gap"
  | "on_part";

/** LED legs reach at most 3 holes apart. A resistor needs 2 to 10 holes between its legs. */
const SPAN: Partial<Record<LegType, [number, number]>> = { led: [0.9, 3.2], resistor: [1.9, 10.2] };

/** Why a leg cannot go into this hole, or null if it can. Each hole holds one leg or wire end. */
export function checkHole(bench: Bench, parts: Part[], hole: string): PlaceProblem | null {
  if (!bench.byId.has(hole)) return "no_hole";
  if (bench.covered.has(hole)) return "covered";
  if (bench.pinAt.has(hole)) return "esp_pin";
  const part = partAt(bench, parts, hole);
  if (part) return isModule(part) ? "part_pin" : "taken";
  if (moduleOver(bench, parts, hole)) return "under_part";
  return null;
}

/** Why this part cannot go from hole `a` to hole `b`, or null if it can. */
export function checkPlacement(bench: Bench, parts: Part[], type: LegType, a: string, b: string): PlaceProblem | null {
  const problem = checkHole(bench, parts, a) ?? checkHole(bench, parts, b);
  if (problem) return problem;
  const span = SPAN[type];
  if (!span) return null;
  const d = holeDistance(bench.byId.get(a)!, bench.byId.get(b)!);
  if (d < span[0] || d > span[1]) return type === "led" ? "led_span" : "resistor_span";
  return null;
}

/** Why this module cannot go with pin 1 in hole `at`, or null if it can. */
export function checkModule(bench: Bench, parts: Part[], type: ModuleType, at: string): PlaceProblem | null {
  const first = bench.byId.get(at);
  if (!first) return "no_hole";
  if (first.kind === "rail") return "rail_pin";
  const pins = footprintHoles(bench, type, at);
  if (!pins) return "off_board";
  const across = FOOTPRINTS[type].across;
  if (crossesGap(bench, pins) !== across) return across ? "needs_gap" : "on_gap";
  for (const pin of pins) {
    const problem = checkHole(bench, parts, pin.hole);
    if (problem) return problem === "part_pin" ? "taken" : problem;
  }
  // The body must not sit on the ESP32-S3 or on another part.
  for (const h of bodyHoles(bench, type, pins)) {
    if (bench.covered.has(h.id) || bench.pinAt.has(h.id)) return "covered";
    if (partAt(bench, parts, h.id) || moduleOver(bench, parts, h.id)) return "on_part";
  }
  return null;
}
