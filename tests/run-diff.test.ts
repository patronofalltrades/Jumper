import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { LegPart, Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { loadSketchStep } from "@/lib/content/sketches";
import { diffLines, diffRuns, runTerminals } from "@/lib/runs/diff";
import { captureRun } from "@/lib/runs/record";

// Compare with last run (TRD addendum 6.3, issue #213): what changed between two runs.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const lesson = (await loadLesson("af-led"))!;
const step = (await loadSketchStep("arduino-foundations", lesson.level))!;
const reference: Part[] = lesson.baseline.levels.flatMap((level) => boards.levels[level]);
const code = step.solution.join("\n");

let n = 0;
const run = (parts: Part[], source = code) =>
  captureRun({ bench, parts, code: source, goal: step.goal, lesson: null, runId: `run-${++n}`, at: "2026-11-22T10:00:00.000Z" }).record;

const wireAt = (hole: string) => reference.find((p): p is LegPart => p.type === "wire" && (p.a === hole || p.b === hole))!;
const moveEnd = (parts: Part[], wire: LegPart, from: string, to: string) =>
  parts.map((p) => (p.id === wire.id ? { ...wire, [wire.a === from ? "a" : "b"]: to } : p)) as Part[];
const pin13Wire = wireAt("uno-D13");
const onPin12 = moveEnd(reference, pin13Wire, "uno-D13", "uno-D12");
const fast = code.replaceAll("delay(500)", "delay(100)");

describe("diffLines", () => {
  it("gives no change for the same text", () => {
    expect(diffLines("a\nb", "a\nb").every((l) => l.kind === "same")).toBe(true);
  });

  it("gives a changed line as one removed line and one added line, with their numbers", () => {
    expect(diffLines("a\nb\nc", "a\nB\nc")).toEqual([
      { kind: "same", text: "a", before: 1, after: 1 },
      { kind: "removed", text: "b", before: 2 },
      { kind: "added", text: "B", after: 2 },
      { kind: "same", text: "c", before: 3, after: 3 },
    ]);
  });

  it("gives a new line and a deleted line", () => {
    expect(diffLines("a\nc", "a\nb\nc").filter((l) => l.kind !== "same")).toEqual([{ kind: "added", text: "b", after: 2 }]);
    expect(diffLines("a\nb\nc", "a\nc").filter((l) => l.kind !== "same")).toEqual([{ kind: "removed", text: "b", before: 2 }]);
    expect(diffLines("", "x").filter((l) => l.kind !== "same")).toEqual([
      { kind: "removed", text: "", before: 1 },
      { kind: "added", text: "x", after: 1 },
    ]);
  });
});

describe("runTerminals", () => {
  it("names the pins of the board, the open rails and the pins of the parts, not the wires", () => {
    const ids = runTerminals(bench, reference);
    expect(ids).toEqual(expect.arrayContaining(["uno.D13", "uno.D12", "uno.GND", "uno.5V", "bbA.+", "bbA.-", "r1.1", "r1.2", "led1.anode", "led1.cathode"]));
    expect(ids.filter((id) => id === "uno.GND")).toHaveLength(1);
    expect(ids.some((id) => id.startsWith(`${pin13Wire.id}.`))).toBe(false);
  });
});

describe("diffRuns", () => {
  it("gives no change for two runs of the same board and sketch", () => {
    const diff = diffRuns(run(reference), run(reference), bench);
    expect(diff).toMatchObject({ connections: { added: [], removed: [], moved: [] }, parts: { added: [], removed: [] }, code: [], layoutOnly: false, count: 0 });
  });

  it("gives one moved connection, with the old end and the new end, for one moved wire (F3-AC2)", () => {
    const before = run(reference);
    const after = run(onPin12);
    const diff = diffRuns(before, after, bench);
    expect(diff.connections.added).toEqual([]);
    expect(diff.connections.removed).toEqual([]);
    expect(diff.connections.moved).toEqual([expect.objectContaining({ kept: "r1.1", from: "uno.D13", to: "uno.D12" })]);
    expect(diff.code).toEqual([]);
    expect(diff.count).toBe(1);
    // The two results are with their runs.
    expect(before.result).toMatchObject({ status: "ok", observed: { kind: "blink" } });
    expect(after.result).toMatchObject({ status: "ok", observed: { kind: "off" } });
  });

  it("lists each change when the wiring and the sketch changed (F3-AC3)", () => {
    const ground = wireAt("uno-GND2") ?? wireAt("uno-GND1") ?? wireAt("uno-GND3");
    const board = onPin12.filter((p) => p.id !== ground.id);
    const diff = diffRuns(run(reference), run(board, fast), bench);
    expect(diff.connections.moved).toEqual([expect.objectContaining({ kept: "r1.1", from: "uno.D13", to: "uno.D12" })]);
    expect(diff.connections.removed.length).toBeGreaterThan(0);
    expect(diff.connections.removed.every((c) => c.a === "uno.GND" || c.b === "uno.GND")).toBe(true);
    // delay(500) is on two lines of the sketch: 2 removed lines and 2 added lines.
    expect(diff.code.map((l) => l.kind).sort()).toEqual(["added", "added", "removed", "removed"]);
    expect(diff.code.filter((l) => l.kind === "added").every((l) => l.text.includes("delay(100)"))).toBe(true);
    expect(diff.count).toBe(1 + diff.connections.removed.length + 4);
  });

  it("gives only code lines for a change of the sketch", () => {
    const diff = diffRuns(run(reference), run(reference, fast), bench);
    expect(diff.connections).toEqual({ added: [], removed: [], moved: [] });
    expect(diff.code.length).toBe(4);
    expect(diff.count).toBe(4);
  });

  it("gives a removed part, and the connections that went with it", () => {
    const diff = diffRuns(run(reference), run(reference.filter((p) => p.id !== "led1")), bench);
    expect(diff.parts.removed.map((p) => p.id)).toEqual(["led1"]);
    expect(diff.parts.added).toEqual([]);
    expect(diff.connections.removed.some((c) => c.a.startsWith("led1.") || c.b.startsWith("led1."))).toBe(true);
  });

  it("says when a wire is in other holes of the same strips: the connections are the same", () => {
    // The end of the pin 13 wire goes to the next hole of its 5-hole strip.
    const end = pin13Wire.a === "uno-D13" ? pin13Wire.b : pin13Wire.a;
    const row = end.slice(0, 2);
    const next = `${row}${"abcde".split("").find((r) => `${row}${r}${end.slice(3)}` !== end && !reference.some((p) => "a" in p && (p.a === `${row}${r}${end.slice(3)}` || p.b === `${row}${r}${end.slice(3)}`)))}${end.slice(3)}`;
    const diff = diffRuns(run(reference), run(moveEnd(reference, pin13Wire, end, next)), bench);
    expect(diff.connections).toEqual({ added: [], removed: [], moved: [] });
    expect(diff).toMatchObject({ layoutOnly: true, count: 1 });
  });

  it("compares a failed run with the run before it (F3-AC6)", () => {
    const before = run(reference);
    const broken = run(reference, code.replace("pinMode(ledPin, OUTPUT);", "pinMode(ledPin, OUTPUT)"));
    expect(broken.result.status).toBe("error");
    const diff = diffRuns(before, broken, bench);
    expect(diff.code.map((l) => l.kind)).toEqual(["removed", "added"]);
    expect(diff.connections.moved).toEqual([]);
  });
});
