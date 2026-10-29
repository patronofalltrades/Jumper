import { MAIN_ROWS, type Bench, type Hole } from "./bench.ts";
import { checkHole, isModule, partPins, type Part } from "./parts.ts";

/** The holes for an LED the right way round: the long leg (+) next to a free resistor leg, the short leg (−) beside it. */
export type LedSpot = { resistor: Hole; long: Hole; short: Hole };

/**
 * Where the LED `ledId` must go, on the board as it is now (issue #102). The long leg (+) goes in the line of 5 of a free
 * leg of the resistor (leg 2 first): a line with no pin of the main board and no other part. The short leg (−) goes in
 * the same row, in the next column, in a line that has nothing in it. The LED itself does not count: the learner moves it.
 * Null when there is no such place.
 */
export function ledSpot(bench: Bench, parts: Part[], resistorId: string, ledId: string): LedSpot | null {
  const others = parts.filter((p) => p.id !== ledId);
  const resistor = others.find((p) => p.id === resistorId);
  if (!resistor || isModule(resistor)) return null;
  const used = (strip: string, skip: string | null) =>
    bench.holes.some(
      (h) =>
        h.strip === strip &&
        h.id !== skip &&
        (bench.pinAt.has(h.id) || bench.covered.has(h.id) || others.some((p) => partPins(bench, p).some((pin) => pin.hole === h.id))),
    );
  for (const leg of [resistor.b, resistor.a]) {
    const r = bench.byId.get(leg);
    if (r?.kind !== "main" || used(r.strip, leg)) continue;
    const rows = [...MAIN_ROWS].filter((row) => row !== r.row && bench.byId.get(`${r.board}-${row}${r.n}`)?.strip === r.strip);
    for (const row of rows) {
      for (const n of [r.n + 1, r.n - 1]) {
        const long = bench.byId.get(`${r.board}-${row}${r.n}`)!;
        const short = bench.byId.get(`${r.board}-${row}${n}`);
        if (!short || checkHole(bench, others, long.id) || checkHole(bench, others, short.id) || used(short.strip, null)) continue;
        return { resistor: r, long, short };
      }
    }
  }
  return null;
}
