import type { Bench } from "@/lib/circuit/bench";
import { checkModule, checkPlacement, isModule, type Part } from "@/lib/circuit/parts";

/** Where a part sits. Wire and resistor legs can go either way round; an LED cannot (issue #111). */
const placeOf = (p: Part) => (isModule(p) ? `${p.type}@${p.at}` : `${p.type}@${p.type === "led" ? `${p.a},${p.b}` : [p.a, p.b].sort().join(",")}`);

/**
 * "Put back the level {n} build" (issue #111): the ready-made parts of the earlier levels (`start`) that are not on the
 * board. `back`: the parts that can go back, in level order. `blocked`: the parts that cannot, because another part
 * is in their holes or has their name. A part in the same place with a different name is on the board.
 */
export function putBackParts(bench: Bench, parts: Part[], start: Part[]): { back: Part[]; blocked: Part[] } {
  const places = new Set(parts.map(placeOf));
  const back: Part[] = [];
  const blocked: Part[] = [];
  let board = parts;
  for (const part of start) {
    if (places.has(placeOf(part))) continue;
    const problem =
      board.some((p) => p.id === part.id) ||
      (isModule(part) ? checkModule(bench, board, part.type, part.at) : checkPlacement(bench, board, part.type, part.a, part.b));
    if (problem) blocked.push(part);
    else {
      back.push(part);
      board = [...board, part];
    }
  }
  return { back, blocked };
}
