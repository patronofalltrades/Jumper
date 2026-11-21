import type { Circuit } from "./circuit.ts";
import { BLINK_RUN, ledChanges } from "./goal.ts";
import type { Program, SketchError } from "./parse.ts";
import { createRunner } from "./run.ts";

// What the LED does when the sketch runs on a board (TRD addendum 6.2): the "observed behavior" of a run, which the
// learner compares with a prediction. It runs the sketch for BLINK_RUN ms of Uno time, as the blink goal check does.

export type Observed =
  | { kind: "off" }
  | { kind: "on" }
  | { kind: "blink"; onMs: number; offMs: number }
  /** The sketch stopped with an error (for example a loop that never waits), so there is no behavior to show. */
  | { kind: "error"; error: SketchError };

const NOBODY = new Set<string>();

export function observeLed(program: Program, circuit: Circuit, led: string): Observed {
  const runner = createRunner(program, (pin, pins) => circuit.read(pin, pins, NOBODY));
  runner.runTo(BLINK_RUN);
  if (runner.error) return { kind: "error", error: runner.error };

  const changes = ledChanges(runner, circuit, led);
  // One change or none: the LED settles in one state and stays there (a wait in setup can come first).
  if (changes.length <= 2) return { kind: changes[changes.length - 1].on ? "on" : "off" };

  // The full parts between two changes. The first part can be a start (a wait in setup), so skip it when there are more.
  const parts = changes.slice(0, -1).map((c, i) => ({ on: c.on, ms: changes[i + 1].time - c.time }));
  const steady = parts.length > 2 ? parts.slice(1) : parts;
  const first = (on: boolean) => steady.find((p) => p.on === on)?.ms ?? 0;
  return { kind: "blink", onMs: first(true), offMs: first(false) };
}
