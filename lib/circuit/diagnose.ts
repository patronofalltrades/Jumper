import type { Bench, Hole } from "./bench.ts";
import type { Connection } from "./check.ts";
import { buildNets, endpointHole, netHoles, type Nets } from "./nets.ts";
import { isModule, partPins, type Part } from "./parts.ts";

// Where the learner's wire end goes now, for a required connection that failed (issue #89). This file gives the facts.
// The text is in content/ui/build.json. When no case fits, it gives null, and the general text is shown.

/**
 * The case of a failed connection. `end` is the end that the learner placed (a part pin). `other` is the end that it
 * must reach. `from` is where the wire end is now, and `to` is where it must go.
 */
export type Diagnosis =
  | { kind: "pin"; end: string; other: string; pin: string }
  | { kind: "rail"; end: string; other: string; rail: "+" | "-" }
  | { kind: "line"; end: string; other: string; from: Hole; to: Hole }
  | { kind: "hole"; end: string; other: string; from: Hole; to: Hole }
  | { kind: "nothing"; end: string; other: string; to: Hole };

/** A pin of the board, or a rail: the learner does not place these, so the reason talks about the other end. */
const isFixed = (bench: Bench, endpoint: string) => {
  const owner = endpoint.split(".")[0];
  return owner === bench.board.id || /^bb[A-Z]$/.test(owner);
};

/** The two rows at each side of the center gap. Holes e and f in the same column are next to each other. */
const ACROSS_GAP = "e,f";

export function diagnose(bench: Bench, parts: Part[], connection: Connection): Diagnosis | null {
  const nets = buildNets(bench, parts);
  for (const [end, other] of [
    [connection.a, connection.b],
    [connection.b, connection.a],
  ]) {
    if (isFixed(bench, end)) continue;
    const found = diagnoseEnd(bench, parts, nets, end, other);
    if (found) return found;
  }
  return null;
}

function diagnoseEnd(bench: Bench, parts: Part[], nets: Nets, end: string, other: string): Diagnosis | null {
  const hole = endpointHole(bench, parts, end);
  const otherHole = endpointHole(bench, parts, other);
  if (hole === null || otherHole === null) return null;
  const net = netHoles(nets, hole);

  // A pin of the board or a rail on the net of this end: the end goes there, not to the other end.
  let pin: string | undefined;
  const rails = new Set<"+" | "-">();
  for (const id of net) {
    if (id === hole) continue;
    const onBoard = bench.pinAt.get(id)?.name;
    if (onBoard && !pin) pin = onBoard;
    const h = bench.byId.get(id);
    if (h?.kind === "rail" && !bench.covered.has(id)) rails.add(h.row.endsWith("+") ? "+" : "-");
  }
  if (pin) return { kind: "pin", end, other, pin };
  const [rail] = rails;
  if (rail) return { kind: "rail", end, other, rail };

  const near = nearWire(bench, parts, nets, hole, otherHole);
  if (near) return { ...near, end, other };

  // Nothing else on the net: no wire, no part leg and no module pin, so the hole stands alone.
  const to = bench.byId.get(hole);
  if (to?.kind !== "main" || touchesPart(bench, parts, end, net)) return null;
  return { kind: "nothing", end, other, to };
}

/** A wire end on the net of the other end, one line or one hole away from this hole (the same board). */
function nearWire(bench: Bench, parts: Part[], nets: Nets, hole: string, otherHole: string) {
  const to = bench.byId.get(hole);
  if (to?.kind !== "main") return null;
  const otherNet = netHoles(nets, otherHole);
  for (const p of parts) {
    if (isModule(p) || p.type !== "wire") continue;
    for (const id of [p.a, p.b]) {
      const from = bench.byId.get(id);
      if (!otherNet.has(id) || from?.kind !== "main" || from.board !== to.board) continue;
      // 1 line: the next column, in the same row.
      if (from.row === to.row && Math.abs(from.n - to.n) === 1) return { kind: "line" as const, from, to };
      // 1 hole: the same column, in the row across the center gap.
      if (from.n === to.n && [from.row, to.row].sort().join() === ACROSS_GAP) return { kind: "hole" as const, from, to };
    }
  }
  return null;
}

/** True when a wire, a leg or a module pin, other than the part of `end`, is on this net. */
function touchesPart(bench: Bench, parts: Part[], end: string, net: Set<string>) {
  const owner = end.split(".")[0];
  return parts.some((p) => p.id !== owner && (isModule(p) ? partPins(bench, p).some((pin) => net.has(pin.hole)) : net.has(p.a) || net.has(p.b)));
}
