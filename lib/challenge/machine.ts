import type { Behavior, Challenge } from "../content/schema.ts";
import type { Observed } from "../sketch/observe.ts";

// Predict, Build, Explain (TRD addendum 6.4, issue #203): the state of one challenge panel, as a pure reducer.
//   predict → change → explain → feedback → (retry | variation) → predict
// - The run is one synchronous call, so it is an event, not a state. A run that is not good (wrong board, sketch error)
//   stays in `change` with a problem, and gives no score (F2-AC3).
// - The prediction is saved before the first run. "Skip" makes an attempt with `scored: false` (F2-R2).
// - A retry is a new attempt. The first attempt stays in `done`, and it does not change (F2-AC5).

/** The answers of a challenge or of its variation. A variation is graded with its own rubric (F2-AC6). */
export type Rubric = Pick<Challenge, "predict" | "explain">;

/** The prediction choice that agrees with what the LED did, or null when the sketch stopped with an error. */
export const behaviorOf = (observed: Observed): Behavior | null =>
  observed.kind === "blink" ? "blinks" : observed.kind === "on" ? "stays-on" : observed.kind === "off" ? "stays-off" : null;

/** The two grades, apart (F2-R4). A skipped prediction has no behavior grade. An unknown explanation is not correct. */
export function grade(rubric: Rubric, prediction: Behavior | null, explanation: string) {
  return {
    behaviorCorrect: prediction === null ? null : prediction === rubric.predict.expected,
    explanationCorrect: rubric.explain.options.some((o) => o.id === explanation && o.correct),
  };
}

export type Attempt = {
  id: string;
  /** The id of the challenge, or of its variation. */
  item: string;
  kind: "first" | "retry" | "variation";
  /** The first attempt of this item. Only a retry has it. */
  firstId: string | null;
  /** False when the learner skipped the prediction. */
  scored: boolean;
  prediction: Behavior | null;
  observed: Behavior | null;
  runId: string | null;
  explanation: string | null;
  behaviorCorrect: boolean | null;
  explanationCorrect: boolean | null;
  hints: number;
  status: "open" | "complete";
};

/** Why a run gave no result: the board is not the board of the challenge, the sketch is not its sketch, or an error. */
export type Problem = { kind: "board" | "sketch" | "error"; message: string };

export type State = {
  phase: "predict" | "change" | "explain" | "feedback";
  item: string;
  /** True when `item` is the variation of a challenge. */
  variation: boolean;
  attempt: Attempt | null;
  problem: Problem | null;
  /** The attempts that are complete, oldest first. */
  done: Attempt[];
  /** The first attempt of each item: item id → attempt id. The browser keeps it, so a reload still makes a retry. */
  firsts: Record<string, string>;
};

export type Event =
  /** Open a challenge, or its variation. */
  | { type: "open"; item: string; variation: boolean }
  /** The prediction, or `null` for "Skip". `id`: the id of the new attempt. */
  | { type: "predict"; id: string; prediction: Behavior | null }
  | { type: "hint" }
  | { type: "run"; result: { ok: true; observed: Behavior; runId: string } | { ok: false; problem: Problem } }
  | { type: "explain"; rubric: Rubric; option: string }
  | { type: "retry" };

export const startState = (item: string, firsts: Record<string, string> = {}): State => ({ phase: "predict", item, variation: false, attempt: null, problem: null, done: [], firsts });

export function challengeReducer(state: State, event: Event): State {
  const { attempt } = state;
  switch (event.type) {
    case "open":
      return { ...state, phase: "predict", item: event.item, variation: event.variation, attempt: null, problem: null };

    case "predict": {
      if (state.phase !== "predict") return state;
      const first = state.firsts[state.item];
      const next: Attempt = {
        id: event.id,
        item: state.item,
        kind: first ? "retry" : state.variation ? "variation" : "first",
        firstId: first ?? null,
        scored: event.prediction !== null,
        prediction: event.prediction,
        observed: null,
        runId: null,
        explanation: null,
        behaviorCorrect: null,
        explanationCorrect: null,
        hints: 0,
        status: "open",
      };
      return { ...state, phase: "change", attempt: next, problem: null, firsts: first ? state.firsts : { ...state.firsts, [state.item]: event.id } };
    }

    case "hint":
      return attempt && attempt.status === "open" ? { ...state, attempt: { ...attempt, hints: attempt.hints + 1 } } : state;

    case "run":
      // No run before the prediction (F2-AC1), and no second result after the first one.
      if (state.phase !== "change" || !attempt) return state;
      if (!event.result.ok) return { ...state, problem: event.result.problem };
      return { ...state, phase: "explain", problem: null, attempt: { ...attempt, observed: event.result.observed, runId: event.result.runId } };

    case "explain": {
      if (state.phase !== "explain" || !attempt) return state;
      const complete: Attempt = { ...attempt, explanation: event.option, ...grade(event.rubric, attempt.prediction, event.option), status: "complete" };
      return { ...state, phase: "feedback", attempt: complete, done: [...state.done, complete] };
    }

    case "retry":
      return state.phase === "feedback" ? { ...state, phase: "predict", attempt: null, problem: null } : state;
  }
}
