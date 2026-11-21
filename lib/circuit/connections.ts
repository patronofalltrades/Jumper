import type { Bench } from "./bench.ts";
import { buildNets, endpointHole } from "./nets.ts";
import type { Part } from "./parts.ts";

// The connections of a board, by terminal (TRD addendum 6.2): which named terminals ("uno.D13", "r1.1", "bbA.-") are on
// the same net. The result does not depend on the holes or on the wire ids, so the same circuit in other holes gives the
// same connections. The learning journey uses it to compare a board with the lesson reference, and two runs.

/** Two terminals on the same net. `a` comes before `b` in alphabetical order, so each pair has one form. */
export type Connection = { a: string; b: string };

/** One end of a connection stayed (`kept`), and the other end changed from `from` to `to`. */
export type Moved = { kept: string; from: string; to: string; before: Connection; after: Connection };

export type ConnectionDiff = { added: Connection[]; removed: Connection[]; moved: Moved[] };

const pair = (x: string, y: string): Connection => (x < y ? { a: x, b: y } : { a: y, b: x });
const key = (c: Connection) => `${c.a}|${c.b}`;

/**
 * The pairs of `terminals` that are on the same net, sorted. A terminal that the bench does not have (for example a
 * part that is not on the board) has no connections.
 */
export function connectionsOf(bench: Bench, parts: Part[], terminals: readonly string[]): Connection[] {
  const nets = buildNets(bench, parts);
  const netOf = new Map<string, string>();
  for (const t of terminals) {
    const hole = endpointHole(bench, parts, t);
    const net = hole === null ? undefined : nets.get(hole);
    if (net !== undefined) netOf.set(t, net);
  }
  const named = [...netOf.keys()].sort();
  const out: Connection[] = [];
  for (let i = 0; i < named.length; i++)
    for (let j = i + 1; j < named.length; j++) if (netOf.get(named[i]) === netOf.get(named[j])) out.push(pair(named[i], named[j]));
  return out;
}

/**
 * What changed from `reference` to `current`. A removed and an added connection that share one terminal are one moved
 * connection (for example "led1.cathode–uno.GND" became "led1.cathode–uno.5V"). Each connection is in one list only.
 */
export function diffConnections(reference: readonly Connection[], current: readonly Connection[]): ConnectionDiff {
  const before = new Set(reference.map(key));
  const after = new Set(current.map(key));
  const removed = reference.filter((c) => !after.has(key(c)));
  const added = current.filter((c) => !before.has(key(c)));
  const moved: Moved[] = [];
  for (const old of [...removed]) {
    const i = added.findIndex((c) => c.a === old.a || c.a === old.b || c.b === old.a || c.b === old.b);
    if (i < 0) continue;
    const now = added[i];
    const kept = now.a === old.a || now.a === old.b ? now.a : now.b;
    moved.push({ kept, from: old.a === kept ? old.b : old.a, to: now.a === kept ? now.b : now.a, before: old, after: now });
    added.splice(i, 1);
    removed.splice(removed.indexOf(old), 1);
  }
  return { added, removed, moved };
}
