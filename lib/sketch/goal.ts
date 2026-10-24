import text from "../../content/ui/sketch.json";
import type { Circuit } from "./circuit.ts";
import { fill, type Program } from "./parse.ts";
import { createRunner, type Note, type Runner } from "./run.ts";

// The goal check of a sketch (issue #58). It runs the sketch on its own Uno clock, faster than real time, on the board
// that the learner wired, and tells if the sketch does the goal of the level (content/sketches/). A sketch that does not
// do the goal gets the reason in simple words, for example "The LED stays on. It must turn off for 500 ms."
// - blink: the LED is on for on_ms, then off for off_ms, again and again.
// - button: the LED is on while the button is pressed, and off when it is not.

export type Goal =
  | { kind: "blink"; led: string; led_name: string; on_ms: number; off_ms: number }
  | { kind: "button"; led: string; led_name: string; button: string };

/** The result of the goal check. `line`: the line to mark in the editor, if the reason is about one line. */
export type GoalResult = { passed: true; message: string } | { passed: false; message: string; line?: number };

/** How long the blink check runs the sketch, in ms of Uno time. */
export const BLINK_RUN = 6_000;
/** A blink time can be this many ms more or less than the goal. */
export const BLINK_TOLERANCE = 25;
/** Each step of the button check: not pressed, pressed, not pressed, pressed. */
export const BUTTON_STEP = 1_000;
const BUTTON_STEPS = [false, true, false, true];

const NOBODY = new Set<string>();
const pass = (): GoalResult => ({ passed: true, message: text.goal.pass });
const reason = (key: keyof typeof text.goal, goal: Goal, values: Record<string, number> = {}): GoalResult => ({
  passed: false,
  message: fill(text.goal[key], { led: goal.led_name, ...values, ...(goal.kind === "blink" && { want_on: goal.on_ms, want_off: goal.off_ms }) }),
});
/** A note about the sketch explains a fail better than the LED does: "Pin 13 is not an OUTPUT…". */
const fromNote = (n: Note): GoalResult => ({ passed: false, message: n.message, line: n.line });
const stopped = (runner: Runner): GoalResult | null => (runner.error ? { passed: false, message: runner.error.message, line: runner.error.line } : null);

/** The on and off times of the LED: each change of the LED, with the time, from the start. */
export function ledChanges(runner: Runner, circuit: Circuit, led: string): { time: number; on: boolean }[] {
  const changes = [{ time: 0, on: false }];
  for (const m of runner.history) {
    const on = circuit.lit(m.pins, NOBODY).has(led);
    const last = changes[changes.length - 1];
    // Two changes at the same time: only the second one shows, because the first one takes no time.
    if (m.time === last.time) last.on = on;
    else if (on !== last.on) changes.push({ time: m.time, on });
    // A change back to the state before it, at the same time, is not a change.
    const before = changes[changes.length - 2];
    if (before && before.on === changes[changes.length - 1].on) changes.pop();
  }
  return changes;
}

function checkBlink(program: Program, circuit: Circuit, goal: Extract<Goal, { kind: "blink" }>): GoalResult {
  const runner = createRunner(program, (pin, pins) => circuit.read(pin, pins, NOBODY));
  runner.runTo(BLINK_RUN);
  const error = stopped(runner);
  if (error) return error;

  const changes = ledChanges(runner, circuit, goal.led);
  const notOutput = runner.notes.find((n) => n.code === "write_not_output");
  if (changes.length === 1) {
    if (changes[0].on) return reason("stays_on", goal);
    return notOutput ? fromNote(notOutput) : reason("stays_off", goal);
  }
  // The time of each part between two changes. The last part goes on after the check, so it is not complete. The first
  // part is the start (for example a wait in setup), so it counts only when there is nothing else.
  const parts = changes.slice(0, -1).map((c, i) => ({ on: c.on, ms: changes[i + 1].time - c.time }));
  const steady = parts.length > 2 ? parts.slice(1) : parts;
  const last = changes[changes.length - 1];
  const times = (on: boolean) => {
    const full = steady.filter((p) => p.on === on).map((p) => p.ms);
    return full.length ? full : [last.on === on ? BLINK_RUN - last.time : 0];
  };
  const ons = times(true);
  const offs = times(false);
  const near = (ms: number, want: number) => Math.abs(ms - want) <= BLINK_TOLERANCE;
  if (ons.every((ms) => near(ms, goal.on_ms)) && offs.every((ms) => near(ms, goal.off_ms))) return pass();
  const far = (list: number[], want: number) => list.find((ms) => !near(ms, want)) ?? list[0];
  return reason("timing", goal, { on: far(ons, goal.on_ms), off: far(offs, goal.off_ms) });
}

function checkButton(program: Program, circuit: Circuit, goal: Extract<Goal, { kind: "button" }>): GoalResult {
  let pressed: ReadonlySet<string> = NOBODY;
  const runner = createRunner(program, (pin, pins) => circuit.read(pin, pins, pressed));
  const seen = BUTTON_STEPS.map((down, i) => {
    pressed = down ? new Set([goal.button]) : NOBODY;
    // Look at the LED just before the end of the step, so the sketch had time to see the button.
    runner.runTo((i + 1) * BUTTON_STEP - 1);
    return { down, on: circuit.lit(runner.pins, pressed).has(goal.led) };
  });
  const error = stopped(runner);
  if (error) return error;

  const downs = seen.filter((s) => s.down).map((s) => s.on);
  const ups = seen.filter((s) => !s.down).map((s) => s.on);
  if (downs.every(Boolean) && !ups.some(Boolean)) return pass();
  const notOutput = runner.notes.find((n) => n.code === "write_not_output");
  const floating = runner.notes.find((n) => n.code === "read_floating");
  if (!downs.some(Boolean) && !ups.some(Boolean)) return notOutput ? fromNote(notOutput) : reason("button_off", goal);
  if (downs.every(Boolean) && ups.every(Boolean)) return floating ? fromNote(floating) : reason("button_on", goal);
  if (!downs.some(Boolean) && ups.every(Boolean)) return reason("button_inverted", goal);
  return floating ? fromNote(floating) : reason("button_unsteady", goal);
}

/** Does the sketch do the goal on this board? */
export function checkGoal(program: Program, circuit: Circuit, goal: Goal): GoalResult {
  return goal.kind === "blink" ? checkBlink(program, circuit, goal) : checkButton(program, circuit, goal);
}
