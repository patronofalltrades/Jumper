import { holeDistance, type Bench, type Hole } from "./bench.ts";
import { bodyHoles, crossesGap, footprintHoles, FOOTPRINTS, isModuleType, type ModuleType, type PinHole } from "./modules.ts";

export type LegType = "wire" | "resistor" | "led" | "speaker";

/**
 * A two-leg part on the bench. For an LED, `a` is the + leg (anode) and `b` is the − leg (cathode).
 * A leg is in a breadboard hole ("A-c14") or in the screw terminal of a module ("amp1.OUT+").
 */
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

/** A screw terminal has the id of its endpoint, for example "amp1.OUT+". Breadboard hole ids have no dot. */
export const isTerminal = (id: string) => id.includes(".");

/** The pins of a part and their holes. A terminal pin gets its terminal id, for example "amp1.OUT+". */
export function partPins(bench: Bench, p: Part): PinHole[] {
  if (isModule(p)) return (footprintHoles(bench, p.type, p.at) ?? []).map((pin) => (pin.terminal ? { ...pin, hole: `${p.id}.${pin.name}` } : pin));
  const [na, nb] = LEG_NAMES[p.type];
  return [
    { name: na, label: na, hole: p.a },
    { name: nb, label: nb, hole: p.b },
  ];
}

/** The part with a leg or a pin in this hole. In a terminal, the lead or wire in it, before the module. */
export const partAt = (bench: Bench, parts: Part[], hole: string) =>
  [...parts.filter((p) => !isModule(p)), ...parts.filter(isModule)].find((p) => partPins(bench, p).some((pin) => pin.hole === hole));

/** The module and the hole under a terminal, for its place on the bench. Null if no module on the bench has it. */
export function terminalAt(bench: Bench, parts: Part[], id: string): { part: ModulePart; under: Hole } | null {
  const dot = id.indexOf(".");
  const part = parts.find((p): p is ModulePart => isModule(p) && p.id === id.slice(0, dot));
  const pin = part && footprintHoles(bench, part.type, part.at)?.find((p) => p.terminal && p.name === id.slice(dot + 1));
  return part && pin ? { part, under: bench.byId.get(pin.hole)! } : null;
}

/** The module whose body is on top of this hole. */
export const moduleOver = (bench: Bench, parts: Part[], hole: string) =>
  parts.find((p) => isModule(p) && bodyHoles(bench, p.type, footprintHoles(bench, p.type, p.at) ?? []).some((h) => h.id === hole));

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
  | "on_part"
  | "esp_line";

/** LED legs reach at most 3 holes apart. A resistor needs 2 to 10 holes between its legs. */
const SPAN: Partial<Record<LegType, [number, number]>> = { led: [0.9, 3.2], resistor: [1.9, 10.2] };

/** Why a leg cannot go into this hole, or null if it can. Each hole and each terminal holds one leg or wire end. */
export function checkHole(bench: Bench, parts: Part[], hole: string): PlaceProblem | null {
  if (isTerminal(hole)) {
    if (!terminalAt(bench, parts, hole)) return "no_hole";
    return parts.some((p) => !isModule(p) && (p.a === hole || p.b === hole)) ? "taken" : null;
  }
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
  // Resistor and LED legs go into the breadboard, not into a screw terminal.
  if (isTerminal(a) || isTerminal(b)) return "no_hole";
  const d = holeDistance(bench.byId.get(a)!, bench.byId.get(b)!);
  if (d < span[0] || d > span[1]) return type === "led" ? "led_span" : "resistor_span";
  return null;
}

/**
 * The strips (lines of connected holes) that have an ESP32-S3 pin. A module pin in one of these lines would connect to
 * that ESP32-S3 pin, so a module cannot go there.
 */
const espStrips = (bench: Bench) => new Set(bench.pins.map((p) => bench.byId.get(p.hole)!.strip));

/** Why this module cannot go with pin 1 in hole `at`, or null if it can. */
export function checkModule(bench: Bench, parts: Part[], type: ModuleType, at: string): PlaceProblem | null {
  const first = bench.byId.get(at);
  if (!first) return "no_hole";
  if (first.kind === "rail") return "rail_pin";
  const pins = footprintHoles(bench, type, at);
  if (!pins) return "off_board";
  const across = FOOTPRINTS[type].across;
  if (crossesGap(bench, pins) !== across) return across ? "needs_gap" : "on_gap";
  const board = pins.filter((p) => !p.terminal);
  for (const pin of board) {
    const problem = checkHole(bench, parts, pin.hole);
    if (problem) return problem === "part_pin" ? "taken" : problem;
  }
  // The body must not sit on the ESP32-S3 or on another part.
  for (const h of bodyHoles(bench, type, pins)) {
    if (bench.covered.has(h.id) || bench.pinAt.has(h.id)) return "covered";
    if (partAt(bench, parts, h.id) || moduleOver(bench, parts, h.id)) return "on_part";
  }
  const esp = espStrips(bench);
  if (board.some((p) => esp.has(bench.byId.get(p.hole)!.strip))) return "esp_line";
  return null;
}
