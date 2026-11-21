import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import { applyChange } from "@/lib/circuit/change";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { loadSketchStep } from "@/lib/content/sketches";
import { sketchCircuit } from "@/lib/sketch/circuit";
import { observeLed, type Observed } from "@/lib/sketch/observe";
import { parseSketch, type Program } from "@/lib/sketch/parse";

// TRD addendum 6.2 and section 4: what the LED does in the simulator, for the lesson reference and for each change of
// the lesson file.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const lesson = (await loadLesson("af-led"))!;
const step = (await loadSketchStep("arduino-foundations", lesson.level))!;
const baseline: Part[] = lesson.baseline.levels.flatMap((level) => boards.levels[level]);
const code = step.solution.join("\n");
const LED = step.goal.led;

const program = (source: string): Program => {
  const parsed = parseSketch(source);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.program;
};
const observe = (parts: Part[], source: string) => observeLed(program(source), sketchCircuit(bench, parts), LED);
/** The lesson file writes on_ms and off_ms; the function gives onMs and offMs. */
const asContent = (o: Observed) => (o.kind === "blink" ? { kind: o.kind, on_ms: o.onMs, off_ms: o.offMs } : { kind: o.kind });

describe("observeLed", () => {
  it("sees the reference blink: on for 500 ms, off for 500 ms", () => {
    expect(baseline).toEqual([...startBoard(boards, lesson.level), ...boards.levels[lesson.level]]);
    const started = performance.now();
    expect(observe(baseline, code)).toEqual({ kind: "blink", onMs: 500, offMs: 500 });
    console.log(`observeLed on the reference: ${(performance.now() - started).toFixed(1)} ms`);
  });

  it("sees an LED that stays on, and one that stays off", () => {
    expect(observe(baseline, "void setup() {\npinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);\n}\nvoid loop() {\ndelay(100);\n}")).toEqual({ kind: "on" });
    expect(observe(baseline, "void setup() {\npinMode(13, OUTPUT);\n}\nvoid loop() {\ndelay(100);\n}")).toEqual({ kind: "off" });
  });

  it("skips a wait at the start before the blink", () => {
    const late = "void setup() {\npinMode(13, OUTPUT);\ndelay(1000);\n}\nvoid loop() {\ndigitalWrite(13, HIGH);\ndelay(200);\ndigitalWrite(13, LOW);\ndelay(300);\n}";
    expect(observe(baseline, late)).toEqual({ kind: "blink", onMs: 200, offMs: 300 });
  });

  it("gives the error when the sketch stops", () => {
    const result = observe(baseline, "void setup() {\n}\nvoid loop() {\ndigitalWrite(13, HIGH);\n}");
    expect(result.kind).toBe("error");
  });
});

describe("each change of the lesson file", () => {
  it("applyChange gives a new board and sketch, and does not change the reference", () => {
    const copy = structuredClone(baseline);
    const changed = applyChange(baseline, code, [{ op: "remove", part: "w4" }, { op: "code", from: "delay(500)", to: "delay(100)" }]);
    expect(changed.parts.some((p) => p.id === "w4")).toBe(false);
    expect(changed.code).not.toContain("delay(500)");
    expect(baseline).toEqual(copy);
  });

  for (const change of lesson.changes.filter((c) => c.ops && c.model)) {
    it(`${change.id}: the simulator shows ${JSON.stringify(change.model)}`, () => {
      const changed = applyChange(baseline, code, change.ops!);
      expect(asContent(observe(changed.parts, changed.code))).toEqual(change.model);
    });
  }
});
