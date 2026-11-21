import { describe, expect, it } from "vitest";
import { behaviorOf, challengeReducer, grade, startState, type Event, type State } from "@/lib/challenge/machine";
import { runChallenge } from "@/lib/challenge/run";
import { createBench } from "@/lib/circuit/bench";
import { applyChange } from "@/lib/circuit/change";
import { checkPlacement, type LegPart, type Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { BEHAVIORS } from "@/lib/content/schema";
import { loadSketchStep } from "@/lib/content/sketches";
import { createBoardStore } from "@/lib/game/board-store";
import { startProgress } from "@/lib/game/engine";

// Predict, Build, Explain (issue #203, TRD addendum 6.4): the state machine, the run, the sandbox on the board, and
// the challenges of the lesson file.

const lesson = (await loadLesson("af-led"))!;
const bench = createBench(await loadBenchSpec(lesson.project));
const boards = await loadBoards(lesson.project);
const step = (await loadSketchStep(lesson.project, lesson.level))!;
const reference: Part[] = lesson.baseline.levels.flatMap((level) => boards.levels[level]);
const code = step.solution.join("\n");
const led = step.goal.led;
const terminals = lesson.map.terminals;
const challenges = lesson.challenges!;
const [openLoop, reverseLed] = challenges;
const changeOf = (id: string) => lesson.changes.find((c) => c.id === id)!;
const changed = (id: string) => applyChange(reference, code, changeOf(id).ops!);
const run = (parts: Part[], expected: Part[], behavior = openLoop.predict.expected, source = code) => runChallenge({ bench, parts, code: source, expected, terminals, led, behavior });

const play = (state: State, ...events: Event[]) => events.reduce(challengeReducer, state);
const ok = (observed: (typeof BEHAVIORS)[number], runId = "run-1"): Event => ({ type: "run", result: { ok: true, observed, runId } });

describe("the challenge state machine", () => {
  it("does not take a run before the prediction (F2-AC1)", () => {
    const start = startState("open-loop");
    expect(play(start, ok("stays-off"))).toEqual(start);
    const predicted = play(start, { type: "predict", id: "a1", prediction: "blinks" });
    expect(predicted.phase).toBe("change");
    expect(predicted.attempt).toMatchObject({ id: "a1", kind: "first", scored: true, prediction: "blinks", observed: null });
  });

  it("makes an unscored attempt when the learner skips, and lets the learner explore (F2-R2)", () => {
    const state = play(startState("open-loop"), { type: "predict", id: "a1", prediction: null }, ok("stays-off"), { type: "explain", rubric: openLoop, option: "no-loop" });
    expect(state.phase).toBe("feedback");
    expect(state.attempt).toMatchObject({ scored: false, prediction: null, behaviorCorrect: null, explanationCorrect: true });
  });

  it("gives no score after an error, and lets the learner run again (F2-AC3)", () => {
    const problem = { kind: "error" as const, message: "Line 3" };
    const failed = play(startState("open-loop"), { type: "predict", id: "a1", prediction: "stays-off" }, { type: "run", result: { ok: false, problem } });
    expect(failed.phase).toBe("change");
    expect(failed.problem).toEqual(problem);
    expect(failed.attempt).toMatchObject({ status: "open", observed: null, behaviorCorrect: null, explanationCorrect: null });
    expect(failed.done).toEqual([]);
    const again = play(failed, ok("stays-off"));
    expect(again.phase).toBe("explain");
    expect(again.problem).toBeNull();
  });

  it("grades the behavior and the explanation apart (F2-R4, F2-AC4)", () => {
    expect(grade(openLoop, "stays-off", "dead-end")).toEqual({ behaviorCorrect: true, explanationCorrect: false });
    expect(grade(openLoop, "blinks", "no-loop")).toEqual({ behaviorCorrect: false, explanationCorrect: true });
    expect(grade(openLoop, "stays-off", "no-such-option")).toEqual({ behaviorCorrect: true, explanationCorrect: false });
    const state = play(startState("open-loop"), { type: "predict", id: "a1", prediction: "stays-off" }, ok("stays-off"), { type: "explain", rubric: openLoop, option: "dead-end" });
    expect(state.attempt).toMatchObject({ behaviorCorrect: true, explanationCorrect: false, status: "complete" });
  });

  it("keeps the first attempt when the learner tries again (F2-AC5)", () => {
    const first = play(startState("open-loop"), { type: "predict", id: "a1", prediction: "blinks" }, { type: "hint" }, ok("stays-off"), { type: "explain", rubric: openLoop, option: "dead-end" });
    const firstAttempt = first.done[0];
    const second = play(first, { type: "retry" }, { type: "predict", id: "a2", prediction: "stays-off" }, ok("stays-off", "run-2"), { type: "explain", rubric: openLoop, option: "no-loop" });
    expect(second.done).toHaveLength(2);
    expect(second.done[0]).toBe(firstAttempt);
    expect(second.done[0]).toMatchObject({ id: "a1", kind: "first", hints: 1, behaviorCorrect: false, explanationCorrect: false });
    expect(second.done[1]).toMatchObject({ id: "a2", kind: "retry", firstId: "a1", hints: 0, behaviorCorrect: true, explanationCorrect: true });
  });

  it("makes a retry when the browser already has a first attempt of the item", () => {
    const state = play(startState("open-loop", { "open-loop": "old" }), { type: "predict", id: "a9", prediction: "blinks" });
    expect(state.attempt).toMatchObject({ kind: "retry", firstId: "old" });
  });

  it("grades a variation with its own answers (F2-AC6)", () => {
    const { variation } = reverseLed;
    // The challenge expects "stays-off"; its variation expects "blinks".
    expect(reverseLed.predict.expected).not.toBe(variation.predict.expected);
    const state = play(
      startState("reverse-led"),
      { type: "open", item: variation.id, variation: true },
      { type: "predict", id: "v1", prediction: "blinks" },
      ok("blinks"),
      { type: "explain", rubric: variation, option: "legs-not-side" },
    );
    expect(state.attempt).toMatchObject({ item: "polarity-layout", kind: "variation", firstId: null, behaviorCorrect: true, explanationCorrect: true });
    // The same answers are wrong with the rubric of the challenge.
    expect(grade(reverseLed, "blinks", "legs-not-side")).toEqual({ behaviorCorrect: false, explanationCorrect: false });
  });

  it("counts the hints of the open attempt only", () => {
    const state = play(startState("open-loop"), { type: "hint" }, { type: "predict", id: "a1", prediction: "blinks" }, { type: "hint" }, { type: "hint" });
    expect(state.attempt?.hints).toBe(2);
  });

  it("maps an observation to a prediction choice", () => {
    expect(behaviorOf({ kind: "blink", onMs: 500, offMs: 500 })).toBe("blinks");
    expect(behaviorOf({ kind: "on" })).toBe("stays-on");
    expect(behaviorOf({ kind: "off" })).toBe("stays-off");
  });
});

describe("a challenge run", () => {
  const expected = changed("remove-gnd-wire").parts;

  it("gives what the LED did when the board has the change", () => {
    expect(run(expected, expected)).toEqual({ ok: true, observed: "stays-off" });
  });

  it("accepts the same connections in other holes", () => {
    const moved = expected.map((p) => (p.id === "w3" ? { ...(p as LegPart), b: "A-b22" } : p));
    expect(run(moved, expected)).toEqual({ ok: true, observed: "stays-off" });
  });

  it("tells what to correct when the board does not have the change, and gives no result (F2-R3)", () => {
    const result = run(reference, expected);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem.kind).toBe("board");
    expect(result.problem.message).toContain("LED, short leg (−) must not connect to");
  });

  it("gives the error of a sketch that does not compile (F2-AC3)", () => {
    const result = run(expected, expected, "stays-off", code.replace("void loop()", "void loop("));
    expect(result).toMatchObject({ ok: false, problem: { kind: "error" } });
  });

  it("gives no result when the sketch is not the sketch of the level", () => {
    const blinkBoard = changed("resistor-after-led").parts;
    const always = "void setup() {\npinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);\n}\nvoid loop() {\ndelay(100);\n}";
    expect(run(blinkBoard, blinkBoard, "blinks", always)).toMatchObject({ ok: false, problem: { kind: "sketch" } });
    expect(run(blinkBoard, blinkBoard, "blinks")).toEqual({ ok: true, observed: "blinks" });
  });
});

describe("the challenge sandbox on the board", () => {
  it("puts the learner's level away, and puts it back with no change", () => {
    const store = createBoardStore(bench);
    const plan = { tasks: [], forbid: [] };
    const own: Part[] = [{ id: "w1", type: "wire", a: "uno-5V", b: "A-L+5" }];
    store.getState().open("u:arduino-foundations/2", { bench, plan, parts: own, progress: { ...startProgress(), phase: "task", mistakes: 2 }, code: "my code", codePassed: false });
    const before = store.getState();

    store.getState().startChallenge(reference, code);
    const inside = store.getState();
    expect(inside.parts).toBe(reference);
    expect(inside.code).toBe(code);
    expect(inside.plan).toBeNull();
    expect(inside.paused).toMatchObject({ parts: own, code: "my code", codePassed: false });

    // A change in the sandbox is not a mistake of the level, and Undo takes it back.
    store.getState().removePart("w4");
    expect(store.getState().parts.some((p) => p.id === "w4")).toBe(false);
    expect(store.getState().progress.mistakes).toBe(2);
    store.getState().undo();
    expect(store.getState().parts).toBe(reference);

    // A new board in the same challenge (a variation) keeps the learner's level put away.
    store.getState().startChallenge(challenges[0].variation.parts as Part[], code);
    expect(store.getState().paused?.parts).toBe(own);

    store.getState().endChallenge();
    const after = store.getState();
    expect(after.paused).toBeNull();
    expect(after.parts).toBe(before.parts);
    expect(after.plan).toBe(before.plan);
    expect(after.progress).toBe(before.progress);
    expect(after.code).toBe("my code");
    expect(after.codePassed).toBe(false);
    expect(after.history).toBe(before.history);
  });
});

describe("the challenges of the af-led lesson", () => {
  const connections = new Set(lesson.map.connections.map((c) => c.id));
  const observedOn = (parts: Part[]) => {
    const result = runChallenge({ bench, parts, code, expected: parts, terminals, led, behavior: "blinks" });
    // The run compares with "blinks": a board that gives another result gives the `sketch` problem.
    return result.ok ? result.observed : result.problem.kind;
  };

  it("has challenges with ids that are used one time", () => {
    expect(challenges.length).toBeGreaterThanOrEqual(3);
    const ids = challenges.flatMap((c) => [c.id, c.variation.id]);
    expect(new Set(ids).size).toBe(ids.length);
    // The record of an attempt takes these ids (lib/journey/records.ts).
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,60}$/);
  });

  it.each(challenges.map((c) => [c.id, c] as const))("%s: a supported change, a concept of the lesson, and hints that end with a connection", (_, c) => {
    const change = changeOf(c.change);
    expect(change?.supported).toBe(true);
    expect(lesson.concepts).toContain(c.concept);
    expect(c.hints.length).toBeGreaterThanOrEqual(2);
    for (const h of c.hints) if (h.highlight) expect(connections.has(h.highlight)).toBe(true);
    expect(c.hints.at(-1)?.highlight).toBeDefined();
  });

  it.each(challenges.flatMap((c) => [[c.id, c] as const, [c.variation.id, c.variation] as const]))("%s: one correct explanation, and an expected prediction that is a choice", (_, rubric) => {
    expect(rubric.explain.options.filter((o) => o.correct)).toHaveLength(1);
    expect(new Set(rubric.explain.options.map((o) => o.id)).size).toBe(rubric.explain.options.length);
    expect(rubric.predict.options).toContain(rubric.predict.expected);
  });

  it.each(challenges.map((c) => [c.id, c] as const))("%s: the simulator shows the expected result, on the challenge and on its variation", (_, c) => {
    const change = changeOf(c.change);
    // The expected prediction is what the lesson file says that the simulator shows, and what it does show.
    expect(behaviorOf(change.model as never)).toBe(c.predict.expected);
    const board = changed(c.change).parts;
    expect(runChallenge({ bench, parts: board, code, expected: board, terminals, led, behavior: c.predict.expected })).toEqual({ ok: true, observed: c.predict.expected });
    // The reference blinks, so each challenge starts from a circuit that works.
    expect(observedOn(reference)).toBe("blinks");

    const parts = c.variation.parts as Part[];
    expect(runChallenge({ bench, parts, code, expected: parts, terminals, led, behavior: c.variation.predict.expected })).toEqual({ ok: true, observed: c.variation.predict.expected });
  });

  it.each(challenges.map((c) => [c.variation.id, c.variation.parts as Part[]] as const))("%s: each part of the variation board can go in its holes", (_, parts) => {
    const placed: Part[] = [];
    for (const p of parts) {
      const leg = p as LegPart;
      expect([leg.id, checkPlacement(bench, placed, leg.type, leg.a, leg.b)]).toEqual([leg.id, null]);
      placed.push(p);
    }
  });
});
