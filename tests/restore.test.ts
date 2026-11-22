import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { LegPart, Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { loadSketchStep } from "@/lib/content/sketches";
import { createBoardStore } from "@/lib/game/board-store";
import type { Plan, Progress } from "@/lib/game/engine";
import { diffRuns } from "@/lib/runs/diff";
import { captureRun, isStale, keepLatest, readBackup, readRuns, runsKey, writeRuns, type RunRecord, type StoredBackup } from "@/lib/runs/record";

// Restore a run (TRD addendum 6.3, issue #214): the board and the sketch of an earlier run go back on the bench
// together, and "Undo the restore" brings back what was there, also the changes that were not run.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const project = loadProjects().find((p) => p.slug === "arduino-foundations")!;
const level = project.levels.find((l) => l.position === 2)!;
const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
const step = (await loadSketchStep("arduino-foundations", 2))!;
const start = startBoard(boards, 2);
const finished: Part[] = [...start, ...boards.levels[2]];
const code = step.solution.join("\n");
const total = plan.tasks.length;
const ready: Progress = { phase: "ready_to_check", index: total, reached: total, tasksDone: total, mistakes: 0, xp: 50, mistake: null, swaps: [], fails: 0 };

let n = 0;
const run = (parts: readonly Part[], source: string): RunRecord =>
  captureRun({ bench, parts, code: source, goal: step.goal, lesson: null, runId: `run-${++n}`, at: "2026-11-22T10:00:00.000Z" }).record;

/** The level, wired and with its sketch, as after a pass of the code step. */
function opened() {
  const store = createBoardStore(bench);
  store.getState().open("user:arduino-foundations/2", { bench, plan, parts: finished, base: start, progress: ready, code, codePassed: true });
  return store;
}
const pin13Wire = finished.find((p): p is LegPart => p.type === "wire" && (p.a === "uno-D13" || p.b === "uno-D13"))!;
/** The learner moves the pin 13 wire to pin 12: remove it, then put a new wire. */
function moveToPin12(store: ReturnType<typeof opened>) {
  const end = pin13Wire.a === "uno-D13" ? pin13Wire.b : pin13Wire.a;
  store.getState().removePart(pin13Wire.id);
  store.getState().setTool("wire");
  store.getState().tapHole("uno-D12");
  store.getState().tapHole(end);
}
const broken = code.replace("pinMode(ledPin, OUTPUT);", "pinMode(ledPin, OUTPUT)");

describe("restoreRun", () => {
  it("puts back the board and the sketch of the run together, and asks for a new run (F3-AC5)", () => {
    const store = opened();
    const good = run(store.getState().parts, code);
    moveToPin12(store);
    store.getState().setCode(broken);
    store.getState().passCode();
    const seen: { board: boolean; sketch: boolean }[] = [];
    const stop = store.subscribe((s) => seen.push({ board: !isStale({ ...good, code: s.code ?? "" }, s.parts, s.code ?? ""), sketch: s.code === code }));

    expect(store.getState().restoreRun(good)).toBe(true);
    stop();
    // One change of the store: there is no moment with the old board and the new sketch, or the reverse.
    expect(seen).toEqual([{ board: true, sketch: true }]);
    expect(isStale(good, store.getState().parts, store.getState().code!)).toBe(false);
    expect(store.getState().codePassed).toBe(false);
  });

  it("keeps the board and the sketch from before in the one backup, also changes that were not run", () => {
    const store = opened();
    const good = run(store.getState().parts, code);
    moveToPin12(store);
    store.getState().setCode(broken);
    const unsaved = { parts: store.getState().parts, code: store.getState().code };

    store.getState().restoreRun(good);
    expect(store.getState().restoreBackup).toMatchObject(unsaved);

    expect(store.getState().undoRestore()).toBe(true);
    expect(store.getState().parts).toEqual(unsaved.parts);
    expect(store.getState().code).toBe(broken);
    expect(store.getState().restoreBackup).toBeNull();
    expect(store.getState().undoRestore()).toBe(false);
  });

  it("gives back whether the sketch had passed, with undoRestore", () => {
    const store = opened();
    const other = run(finished.filter((p) => p.id !== "led1"), code);
    expect(store.getState().codePassed).toBe(true);
    store.getState().restoreRun(other);
    expect(store.getState().codePassed).toBe(false);
    store.getState().undoRestore();
    expect(store.getState().codePassed).toBe(true);
  });

  it("makes a new record when the learner runs the restored board", () => {
    const store = opened();
    let runs: RunRecord[] = [];
    const good = run(store.getState().parts, code);
    runs = keepLatest(runs, good);
    moveToPin12(store);
    runs = keepLatest(runs, run(store.getState().parts, code));
    expect(runs[1].result).toMatchObject({ status: "ok", observed: { kind: "off" } });

    store.getState().restoreRun(good);
    const again = run(store.getState().parts, store.getState().code!);
    runs = keepLatest(runs, again);
    expect(again.runId).not.toBe(good.runId);
    expect(again.result).toMatchObject({ status: "ok", observed: { kind: "blink" }, goalPassed: true });
    expect(diffRuns(good, again, bench).count).toBe(0);
    expect(runs).toHaveLength(3);
  });

  it("restores the earlier run after a failed run, which can still be compared (F3-AC6)", () => {
    const store = opened();
    const good = run(store.getState().parts, code);
    store.getState().setCode(broken);
    const failed = run(store.getState().parts, broken);
    expect(failed.result.status).toBe("error");
    expect(diffRuns(good, failed, bench).code.map((l) => l.kind)).toEqual(["removed", "added"]);

    store.getState().restoreRun(good);
    expect(store.getState().code).toBe(code);
    expect(run(store.getState().parts, store.getState().code!).result.status).toBe("ok");
  });

  it("keeps the task engine right: no Mistake, no XP, and the task of now follows the board", () => {
    const store = opened();
    const good = run(store.getState().parts, code);
    // A board with the LED gone: the task of the LED is open again.
    store.getState().removePart("led1");
    const open = store.getState().progress;
    expect(open.phase).toBe("task");
    const without = run(store.getState().parts, code);

    store.getState().restoreRun(good);
    expect(store.getState().progress).toMatchObject({ phase: "ready_to_check", index: total, mistakes: 0, xp: ready.xp, tasksDone: total, mistake: null });

    // A restore of the board with no LED: the level goes back to the task of the LED, with no Mistake.
    store.getState().restoreRun(without);
    expect(store.getState().progress).toMatchObject({ phase: "task", index: open.index, mistakes: 0, xp: ready.xp, mistake: null });
  });

  it("is one step for Undo, which takes back the board only", () => {
    const store = opened();
    const good = run(store.getState().parts, code);
    moveToPin12(store);
    store.getState().setCode(broken);
    const before = store.getState().parts;

    store.getState().restoreRun(good);
    store.getState().undo();
    expect(store.getState().parts).toEqual(before);
    // The sketch comes back with "Undo the restore" only. The backup is still there.
    expect(store.getState().code).toBe(code);
    store.getState().undoRestore();
    expect(store.getState().parts).toEqual(before);
    expect(store.getState().code).toBe(broken);
  });

  it("does nothing on a snapshot and in a challenge", () => {
    const good = run(finished, code);
    const snapshot = createBoardStore(bench);
    snapshot.getState().open("snap", { bench, parts: start, readOnly: true });
    expect(snapshot.getState().restoreRun(good)).toBe(false);
    expect(snapshot.getState().parts).toEqual(start);

    const store = opened();
    store.getState().startChallenge(start, code);
    expect(store.getState().restoreRun(good)).toBe(false);
    store.getState().endChallenge();
    expect(store.getState().parts).toEqual(finished);
    expect(store.getState().restoreBackup).toBeNull();
  });

  it("forgets the backup when another level opens", () => {
    const store = opened();
    store.getState().restoreRun(run(start, code));
    expect(store.getState().restoreBackup).not.toBeNull();
    store.getState().open("user:arduino-foundations/3", { bench });
    expect(store.getState().restoreBackup).toBeNull();
  });
});

describe("the browser save of the backup", () => {
  const key = runsKey("jumper:user-a:arduino-foundations/2");
  const items = new Map<string, string>();
  const storage = { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) };

  it("keeps the backup with the records, so Undo the restore is there after a reload", () => {
    const runs = [run(finished, code)];
    const backup: StoredBackup = { parts: start as StoredBackup["parts"], code: broken, codePassed: false, helpedCode: null };
    expect(writeRuns(storage, key, runs, backup)).toBe(true);
    expect(readBackup(storage, key)).toEqual(backup);
    expect(readRuns(storage, key)).toEqual(runs);
  });

  it("has no backup after it is used, and for records that were saved with no backup", () => {
    writeRuns(storage, key, [run(finished, code)]);
    expect(readBackup(storage, key)).toBeNull();
    expect(readBackup(storage, runsKey("jumper:user-b:arduino-foundations/2"))).toBeNull();
  });
});
