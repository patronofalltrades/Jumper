import text from "../../content/ui/challenge.json";
import type { Bench } from "../circuit/bench.ts";
import { connectionsOf, diffConnections } from "../circuit/connections.ts";
import type { Part } from "../circuit/parts.ts";
import type { Behavior } from "../content/schema.ts";
import { sketchCircuit } from "../sketch/circuit.ts";
import { observeLed } from "../sketch/observe.ts";
import { fill, parseSketch } from "../sketch/parse.ts";
import { behaviorOf, type Problem } from "./machine.ts";

// One run of a challenge (TRD addendum 6.4, issue #203), on the board and the sketch as they were at the press of Run.
// It gives what the LED did, or the reason why there is no result. A run with no result gives no score (F2-AC3).

export type RunInput = {
  bench: Bench;
  /** The board and the sketch at the press of Run. */
  parts: Part[];
  code: string;
  /** The board that the challenge needs: the reference with the change, or the board of the variation. */
  expected: Part[];
  /** The terminals of the lesson map, with their labels for the messages. */
  terminals: readonly { id: string; label: string }[];
  /** The LED to look at, and what it must do on the expected board with the sketch of the level. */
  led: string;
  behavior: Behavior;
};

export type RunResult = { ok: true; observed: Behavior } | { ok: false; problem: Problem };

/** The most differences that a message lists. */
const MAX_LINES = 2;

export function runChallenge({ bench, parts, code, expected, terminals, led, behavior }: RunInput): RunResult {
  const parsed = parseSketch(code);
  if (!parsed.ok) return { ok: false, problem: { kind: "error", message: fill(text.problems.error, { message: parsed.error.message }) } };

  // The board must have the connections of the challenge (F2-R3). The holes and the wire ids do not matter.
  const ids = terminals.map((t) => t.id);
  const label = (id: string) => terminals.find((t) => t.id === id)?.label ?? id;
  const diff = diffConnections(connectionsOf(bench, expected, ids), connectionsOf(bench, parts, ids));
  const lines = [
    ...diff.moved.map((m) => fill(text.problems.moved, { kept: label(m.kept), from: label(m.from), to: label(m.to) })),
    ...diff.removed.map((c) => fill(text.problems.missing, { a: label(c.a), b: label(c.b) })),
    ...diff.added.map((c) => fill(text.problems.extra, { a: label(c.a), b: label(c.b) })),
  ];
  if (lines.length) return { ok: false, problem: { kind: "board", message: [text.problems.board, ...lines.slice(0, MAX_LINES), text.problems.more].join(" ") } };

  const observed = observeLed(parsed.program, sketchCircuit(bench, parts), led);
  if (observed.kind === "error") return { ok: false, problem: { kind: "error", message: fill(text.problems.error, { message: observed.error.message }) } };
  // The board is right, so a different result comes from a different sketch. The challenge is about the change only.
  const seen = behaviorOf(observed)!;
  if (seen !== behavior) return { ok: false, problem: { kind: "sketch", message: text.problems.sketch } };
  return { ok: true, observed: seen };
}
