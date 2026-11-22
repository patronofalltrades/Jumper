import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { LegPart, Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { loadSketchStep } from "@/lib/content/sketches";
import { captureRun, isStale, keepLatest, MAX_RUNS, readRuns, runsKey, writeRuns, type RunRecord } from "@/lib/runs/record";
import { RUNTIME } from "@/lib/sketch/run";

// Run records (TRD addendum 6.3, issue #212): a record of the board, the sketch and the result at each press of Run.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const lesson = (await loadLesson("af-led"))!;
const step = (await loadSketchStep("arduino-foundations", lesson.level))!;
const reference: Part[] = lesson.baseline.levels.flatMap((level) => boards.levels[level]);
const code = step.solution.join("\n");

let n = 0;
const run = (parts: Part[], source = code) =>
  captureRun({ bench, parts, code: source, goal: step.goal, lesson: { id: lesson.id, version: lesson.version }, runId: `run-${++n}`, at: "2026-11-22T10:00:00.000Z" });

/** The wire from pin 13 of the Uno, moved to pin 12. */
const pin13Wire = reference.find((p): p is LegPart => p.type === "wire" && (p.a === "uno-D13" || p.b === "uno-D13"))!;
const onPin12 = reference.map((p) => (p === pin13Wire ? { ...pin13Wire, [pin13Wire.a === "uno-D13" ? "a" : "b"]: "uno-D12" } : p)) as Part[];

/** A storage in memory, as localStorage. */
function memory(broken = false) {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (broken) throw new Error("QuotaExceededError");
      items.set(key, value);
    },
  };
}

describe("captureRun", () => {
  it("makes a record with the board, the sketch, the lesson, the runtime and the result", () => {
    const { record, program } = run(reference);
    expect(program).not.toBeNull();
    expect(record).toMatchObject({ lesson: { id: "af-led", version: 1 }, runtime: RUNTIME, code, at: "2026-11-22T10:00:00.000Z" });
    expect(record.parts).toEqual(reference);
    expect(record.result).toMatchObject({ status: "ok", observed: { kind: "blink", onMs: 500, offMs: 500 }, goalPassed: true });
  });

  it("gives the result of the record's own board (F3-AC4)", () => {
    const { record } = run(onPin12);
    expect(record.result).toMatchObject({ status: "ok", observed: { kind: "off" }, goalPassed: false });
  });

  it("does not change when the board changes after the press of Run (F3-AC4)", () => {
    const board = reference.map((p) => ({ ...p })) as Part[];
    const { record } = run(board);
    const before = JSON.stringify(record);
    // The learner moves the wire while the LEDs run: the same array and the same part objects change.
    const wire = board.find((p) => p.id === pin13Wire.id) as LegPart;
    if (wire.a === "uno-D13") wire.a = "uno-D12";
    else wire.b = "uno-D12";
    board.pop();
    expect(JSON.stringify(record)).toBe(before);
    expect(record.result).toMatchObject({ status: "ok", observed: { kind: "blink" } });
  });

  it("records a mistake in the code as a failed run, with its line", () => {
    const { record, program } = run(reference, code.replace("pinMode(ledPin, OUTPUT);", "pinMode(ledPin, OUTPUT)"));
    expect(program).toBeNull();
    expect(record.result.status).toBe("error");
    if (record.result.status === "error") expect(record.result.error.line).toBeGreaterThan(0);
  });

  it("records a sketch that stops as a failed run", () => {
    const { record } = run(reference, "void setup() {\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n}");
    expect(record.result.status).toBe("error");
  });

  it("works on a level with no lesson file", () => {
    const { record } = captureRun({ bench, parts: reference, code, goal: step.goal, lesson: null, runId: "x", at: "2026-11-22T10:00:00.000Z" });
    expect(record.lesson).toBeNull();
    expect(record.result.status).toBe("ok");
  });
});

describe("keepLatest", () => {
  it("keeps the latest three records, oldest first", () => {
    let runs: RunRecord[] = [];
    for (let i = 0; i < 5; i++) runs = keepLatest(runs, run(reference).record);
    expect(runs).toHaveLength(MAX_RUNS);
    const ids = runs.map((r) => Number(r.runId.slice(4)));
    expect(ids).toEqual([ids[0], ids[0] + 1, ids[0] + 2]);
    expect(ids[2]).toBe(n);
  });
});

describe("isStale", () => {
  const { record } = run(reference);

  it("is false for the same board and sketch", () => {
    expect(isStale(record, reference, code)).toBe(false);
  });

  it("does not count the order of the parts or the color of a wire", () => {
    const other = [...reference].reverse().map((p) => (p.type === "wire" ? { ...p, color: "#2E9D5B" } : p)) as Part[];
    expect(isStale(record, other, code)).toBe(false);
  });

  it("is true for a moved wire, a removed part and a changed sketch", () => {
    expect(isStale(record, onPin12, code)).toBe(true);
    expect(isStale(record, reference.slice(0, -1), code)).toBe(true);
    expect(isStale(record, reference, `${code}\n`)).toBe(true);
  });
});

describe("the browser save", () => {
  const key = runsKey("jumper:user-a:arduino-foundations/2");

  it("has the key of the level, so each user and level has its own records", () => {
    expect(key).toBe("jumper:user-a:arduino-foundations/2:runs");
    expect(runsKey("jumper:user-b:arduino-foundations/2")).not.toBe(key);
  });

  it("reads back the records that it saved", () => {
    const storage = memory();
    const runs = [run(reference).record, run(onPin12).record, run(reference, "void setup() {").record];
    expect(writeRuns(storage, key, runs)).toBe(true);
    expect(readRuns(storage, key)).toEqual(runs);
    expect(readRuns(storage, runsKey("jumper:user-b:arduino-foundations/2"))).toEqual([]);
  });

  it("gives no records for no save and for data that is not records", () => {
    const storage = memory();
    expect(readRuns(storage, key)).toEqual([]);
    storage.setItem(key, "not json");
    expect(readRuns(storage, key)).toEqual([]);
    storage.setItem(key, JSON.stringify({ runs: [{ runId: "x", parts: "no" }] }));
    expect(readRuns(storage, key)).toEqual([]);
  });

  it("says when the browser cannot save, and reads nothing from a storage that throws", () => {
    expect(writeRuns(memory(true), key, [run(reference).record])).toBe(false);
    expect(readRuns({ getItem: () => { throw new Error("blocked"); } }, key)).toEqual([]);
  });
});
