import text from "../../content/ui/sketch.json";
import type { Mode, Pins, PinState } from "./circuit.ts";
import { fill, sketchError, type Expr, type Program, type SketchError, type Stmt } from "./parse.ts";

// The runner (issue #58): setup() runs one time, then loop() runs again and again. Time is a clock that the app
// moves, not real time: runTo(1000) runs the sketch up to 1 second of Uno time. delay(ms) moves the clock; the other
// lines take no time. A loop that does not move the clock stops after MAX_STEPS lines, with a message, so the browser
// never freezes.

/** Lines that can run with no time between them, before the runner stops the sketch. */
export const MAX_STEPS = 10_000;
/** The output states that a runner keeps, for the goal check. */
const MAX_HISTORY = 2_000;

const MODE_NAMES: Record<number, Mode> = { 0: "INPUT", 1: "OUTPUT", 2: "INPUT_PULLUP" };

/** A hint about the sketch, for the reason of a goal that fails: a pin that writes but is not an output, or a pin that floats. */
export type Note = { code: keyof typeof text.notes; pin: number; line: number; message: string };

/** The output pins at a time on the Uno clock, after the sketch waited or stopped. */
export type Moment = { time: number; pins: Pins };

/** What digitalRead gives: the level, or null when the pin floats. */
export type ReadPin = (pin: number, pins: Pins) => 0 | 1 | null;

export type Runner = {
  /** The time on the Uno clock, in ms. */
  readonly time: number;
  readonly pins: Pins;
  /** The mistake that stopped the sketch, if any. */
  readonly error: SketchError | null;
  readonly notes: readonly Note[];
  /** The pins each time that they changed, oldest first. */
  readonly history: readonly Moment[];
  /** Runs the sketch until the Uno clock is at `time`. */
  runTo(time: number): void;
};

class RunError extends Error {
  constructor(readonly error: SketchError) {
    super(error.message);
  }
}

const toLevel = (v: number): 0 | 1 => (v ? 1 : 0);

export function createRunner(program: Program, read: ReadPin): Runner {
  const values = new Array<number>(program.slots).fill(0);
  let pins = new Map<number, PinState>();
  const notes: Note[] = [];
  const history: Moment[] = [];
  let steps = 0;
  let clock = 0;
  let wake = 0;
  let error: SketchError | null = null;
  let ended = false;

  const note = (code: Note["code"], pin: number, line: number) => {
    if (notes.some((n) => n.code === code && n.pin === pin)) return;
    notes.push({ code, pin, line, message: fill(text.notes[code], { line, pin }) });
  };

  const pinOf = (e: Expr, line: number) => {
    const pin = evaluate(e);
    if (!Number.isInteger(pin) || pin < 0 || pin > 13) throw new RunError(sketchError(line, "bad_pin", { pin }));
    return pin;
  };

  function evaluate(e: Expr): number {
    switch (e.kind) {
      case "num":
        return e.value;
      case "var":
        return values[e.slot];
      case "not":
        return evaluate(e.expr) ? 0 : 1;
      case "cmp":
        return (evaluate(e.a) === evaluate(e.b)) === (e.op === "==") ? 1 : 0;
      case "read": {
        const pin = pinOf(e.pin, e.line);
        const level = read(pin, pins);
        if (level === null) note("read_floating", pin, e.line);
        return level ?? 0;
      }
    }
  }

  /** Each line counts as one step. Too many steps with no time between them stops the sketch. */
  const tick = () => {
    if (++steps > MAX_STEPS) throw new RunError(sketchError(program.loop.line, "no_delay"));
  };

  /** Sets a pin, as a copy, so a Moment in the history keeps its pins. */
  const setPin = (pin: number, change: Partial<PinState>) => {
    const old = pins.get(pin) ?? { mode: "INPUT", out: 0 };
    const next = { ...old, ...change };
    if (pins.has(pin) && next.mode === old.mode && next.out === old.out) return;
    pins = new Map(pins).set(pin, next);
  };

  function* block(stmts: Stmt[]): Generator<number, void, void> {
    for (const s of stmts) {
      tick();
      switch (s.kind) {
        case "set":
          values[s.slot] = evaluate(s.value);
          break;
        case "mode": {
          const pin = pinOf(s.pin, s.line);
          const mode = MODE_NAMES[evaluate(s.mode)];
          if (!mode) throw new RunError(sketchError(s.line, "bad_mode"));
          setPin(pin, { mode });
          break;
        }
        case "write": {
          const pin = pinOf(s.pin, s.line);
          if (pins.get(pin)?.mode !== "OUTPUT") note("write_not_output", pin, s.line);
          setPin(pin, { out: toLevel(evaluate(s.value)) });
          break;
        }
        case "read":
          evaluate(s);
          break;
        case "delay":
          // A sketch has no minus sign, so a time is never below 0.
          yield evaluate(s.ms);
          break;
        case "if":
          yield* block(evaluate(s.test) ? s.then : s.else);
          break;
      }
    }
  }

  function* main(): Generator<number, void, void> {
    yield* block(program.globals);
    yield* block(program.setup.body);
    for (;;) {
      yield* block(program.loop.body);
      tick();
    }
  }

  const sketch = main();

  const remember = () => {
    const last = history[history.length - 1];
    if (last && last.pins === pins) return;
    if (history.length >= MAX_HISTORY) history.shift();
    history.push({ time: clock, pins });
  };

  return {
    get time() {
      return clock;
    },
    get pins() {
      return pins;
    },
    get error() {
      return error;
    },
    notes,
    history,
    runTo(time) {
      while (!error && !ended && wake <= time) {
        clock = wake;
        try {
          const r = sketch.next();
          if (r.done) ended = true;
          else {
            if (r.value > 0) steps = 0;
            wake = clock + r.value;
          }
        } catch (e) {
          if (!(e instanceof RunError)) throw e;
          error = e.error;
        }
        remember();
      }
      clock = Math.max(clock, time);
    },
  };
}
