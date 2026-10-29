import type { Bench } from "./bench.ts";
import { buildNets, endpointHole } from "./nets.ts";
import type { Part, PartType } from "./parts.ts";

// The level check (TRD 6.2): the level passes when every `require` connection is true and no `forbid` connection is
// true. It compares connections, not holes, so any layout that makes the same circuit passes.

export type Connection = { a: string; b: string };
export type Rules = { require: Connection[]; forbid: (Connection & { code: string; message: string })[] };

/**
 * A failed check gives one reason: the forbid rule code (with its text from the content), or "missing_ground" or
 * "wrong_pin" for a require connection that is not there.
 */
export type CheckResult = { passed: true } | { passed: false; code: string; message?: string; connection: Connection };

/** The two sides of a resistor or a button are the same. The learner can use either side as "1". */
const SYMMETRIC: PartType[] = ["resistor", "pushbutton"];

/**
 * The rules of the levels in `positions`, joined (issue #65). Check on a level tests the connections of the levels
 * before it too, because the board carries over. A connection that two levels both name (same two ends, either order)
 * counts once. A forbid rule keeps its code and message.
 */
export function joinRules(levels: { position: number; rules: Rules }[], positions: number[]): Rules {
  const key = (c: Connection) => [c.a, c.b].sort().join("|");
  const joined: Rules = { require: [], forbid: [] };
  const seen = { require: new Set<string>(), forbid: new Set<string>() };
  for (const level of levels.filter((l) => positions.includes(l.position)).sort((x, y) => x.position - y.position)) {
    for (const kind of ["require", "forbid"] as const) {
      for (const c of level.rules[kind]) {
        if (seen[kind].has(key(c))) continue;
        seen[kind].add(key(c));
        (joined[kind] as Connection[]).push(c);
      }
    }
  }
  return joined;
}

/** A ground endpoint: a GND pin, or a − rail. */
const isGround = (endpoint: string) => /\.GND$/.test(endpoint) || /^bb[A-Z]\.-$/.test(endpoint);

function turn(endpoint: string, turned: Set<string>) {
  const [owner, pin] = endpoint.split(".");
  if (!turned.has(owner) || (pin !== "1" && pin !== "2")) return endpoint;
  return `${owner}.${pin === "1" ? "2" : "1"}`;
}

type Forbid = Rules["forbid"][number];
/** One way round of the resistors and buttons: its problems, and whether a connection is on the board that way. */
type Way = { problems: number; on: (c: Connection) => boolean; broken: Forbid[]; missing: Connection[] };

/**
 * The way round of the resistors and buttons with the fewest problems (the first one, when two ways tie). Each way is
 * tried, so the learner can use either side as "1". Stops at the first way with no problem.
 */
function bestWay(bench: Bench, parts: Part[], rules: Rules): Way {
  const nets = buildNets(bench, parts);
  const owners = new Set([...rules.require, ...rules.forbid].flatMap((c) => [c.a, c.b]).map((e) => e.split(".")[0]));
  const free = parts.filter((p) => SYMMETRIC.includes(p.type) && owners.has(p.id)).map((p) => p.id);

  let best: Way | null = null;
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const turned = new Set(free.filter((_, i) => mask & (1 << i)));
    const on = (c: Connection) => {
      const a = endpointHole(bench, parts, turn(c.a, turned));
      const b = endpointHole(bench, parts, turn(c.b, turned));
      return a !== null && b !== null && nets.get(a) === nets.get(b);
    };
    const broken = rules.forbid.filter(on);
    const missing = rules.require.filter((c) => !on(c));
    const problems = broken.length + missing.length;
    if (best && problems >= best.problems) continue;
    best = { problems, on, broken, missing };
    if (problems === 0) break;
  }
  return best!;
}

export function checkLevel(bench: Bench, parts: Part[], rules: Rules): CheckResult {
  // Report the way with the fewest problems, forbid rules first.
  const { problems, broken, missing } = bestWay(bench, parts, rules);
  if (problems === 0) return { passed: true };
  const [f] = broken;
  const [m] = missing;
  return f
    ? { passed: false, code: f.code, message: f.message, connection: { a: f.a, b: f.b } }
    : { passed: false, code: isGround(m.a) || isGround(m.b) ? "missing_ground" : "wrong_pin", connection: { a: m.a, b: m.b } };
}

/** The state of one connection of a level: a `require` is right when it is on the board, a `forbid` when it is not. */
export type ConnectionState = { kind: "require" | "forbid"; connection: Connection; ok: boolean };

/**
 * The state of each connection of the rules, for the list under a failed Check (issue #92). It uses the same way round
 * as checkLevel, so every connection is right exactly when checkLevel passes. Requires come first, then forbids.
 */
export function connectionStates(bench: Bench, parts: Part[], rules: Rules): ConnectionState[] {
  const { on } = bestWay(bench, parts, rules);
  return [
    ...rules.require.map((c) => ({ kind: "require" as const, connection: { a: c.a, b: c.b }, ok: on(c) })),
    ...rules.forbid.map((c) => ({ kind: "forbid" as const, connection: { a: c.a, b: c.b }, ok: !on(c) })),
  ];
}

/**
 * The parts that the learner placed in this level: the parts that are not on the board that the level opened with.
 * A part counts as placed when no part of `base` is the same (same id, type and holes), so a part that the learner
 * moves, or removes and puts back with the same id in a new hole, counts.
 */
export function placedParts(parts: Part[], base: Part[]): Part[] {
  const before = new Set(base.map((p) => JSON.stringify(p)));
  return parts.filter((p) => !before.has(JSON.stringify(p)));
}

/** True when the learner placed no part, so there is nothing for the level Check to test (issue #27). */
export const isEmptyBoard = (parts: Part[], base: Part[]) => placedParts(parts, base).length === 0;
