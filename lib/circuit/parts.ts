import { holeDistance, type Bench } from "./bench.ts";

export type PartType = "wire" | "resistor" | "led";

/** A two-leg part on the bench. For an LED, `a` is the + leg (anode) and `b` is the − leg (cathode). */
export type Part = { id: string; type: PartType; a: string; b: string; color?: string };

/** Endpoint pin names of each part type: `r1.1`, `led1.anode`. */
export const LEG_NAMES: Record<PartType, [string, string]> = {
  wire: ["a", "b"],
  resistor: ["1", "2"],
  led: ["anode", "cathode"],
};

const ID_PREFIX: Record<PartType, string> = { wire: "w", resistor: "r", led: "led" };

/** The next free id for a part type: w1, w2… r1… led1… */
export function nextPartId(parts: Part[], type: PartType): string {
  const prefix = ID_PREFIX[type];
  const used = new Set(parts.map((p) => p.id));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** The part with a leg in this hole. */
export const partAt = (parts: Part[], hole: string) => parts.find((p) => p.a === hole || p.b === hole);

export type PlaceProblem = "no_hole" | "covered" | "esp_pin" | "taken" | "led_span" | "resistor_span";

/** LED legs reach at most 3 holes apart. A resistor needs 2 to 10 holes between its legs. */
const SPAN: Partial<Record<PartType, [number, number]>> = { led: [0.9, 3.2], resistor: [1.9, 10.2] };

/** Why a leg cannot go into this hole, or null if it can. Each hole holds one leg or wire end. */
export function checkHole(bench: Bench, parts: Part[], hole: string): PlaceProblem | null {
  if (!bench.byId.has(hole)) return "no_hole";
  if (bench.covered.has(hole)) return "covered";
  if (bench.pinAt.has(hole)) return "esp_pin";
  if (partAt(parts, hole)) return "taken";
  return null;
}

/** Why this part cannot go from hole `a` to hole `b`, or null if it can. */
export function checkPlacement(bench: Bench, parts: Part[], type: PartType, a: string, b: string): PlaceProblem | null {
  const problem = checkHole(bench, parts, a) ?? checkHole(bench, parts, b);
  if (problem) return problem;
  const span = SPAN[type];
  if (!span) return null;
  const d = holeDistance(bench.byId.get(a)!, bench.byId.get(b)!);
  if (d < span[0] || d > span[1]) return type === "led" ? "led_span" : "resistor_span";
  return null;
}
