import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadSketchStep } from "@/lib/content/sketches";
import { sketchCircuit } from "@/lib/sketch/circuit";
import { checkGoal } from "@/lib/sketch/goal";
import { parseSketch } from "@/lib/sketch/parse";
import { checkLine, stepSketch, type LineStep, type Names } from "@/lib/sketch/steps";
import text from "@/content/ui/sketch.json";

// Issue #144: Step by step. The learner reads the goal of one line, types the line, and Jumper checks it.
// Hanif's decisions (Nov 3): spaces and comments do not matter; a name that the learner gives a variable in its own line
// is followed through the next lines; a step can list more answers; 13 in place of ledPin does not pass.

const step = (line: string, more: Partial<LineStep> = {}): LineStep => ({ line, goal: "A goal.", ...more });
const OFF = step("  digitalWrite(ledPin, LOW);");
const MINE: Names = { ledPin: "ledPin" };

const pass = (typed: string, s: LineStep, names: Names = MINE) => {
  const result = checkLine(typed, s, names);
  if (!result.ok) throw new Error(result.message);
  return result.names;
};
const message = (typed: string, s: LineStep, names: Names = MINE) => {
  const result = checkLine(typed, s, names);
  if (result.ok) throw new Error(`"${typed}" passed`);
  return result.message;
};

describe("the line check", () => {
  it("accepts the line with other spaces and a comment", () => {
    pass("digitalWrite(ledPin, LOW);", OFF);
    pass("   digitalWrite( ledPin ,LOW ) ;  ", OFF);
    pass("digitalWrite(ledPin,LOW); // off", OFF);
  });

  it("refuses a line that does not do the goal, and does not show the code", () => {
    const why = message("digitalWrite(ledPin, HIGH);", OFF);
    expect(why).toContain('"HIGH"');
    expect(why).not.toContain("LOW");
    expect(message("delay(500);", OFF)).not.toContain("digitalWrite");
  });

  it("refuses an empty line", () => {
    expect(message("   ", OFF)).toBe(text.steps.empty);
    expect(message("// only a comment", OFF)).toBe(text.steps.empty);
  });

  it("gives the reason of the reader for the usual mistakes", () => {
    expect(message("digitalWrite(ledPin, LOW)", OFF)).toBe(text.errors.missing_semicolon);
    expect(message("digitalwrite(ledPin, LOW);", OFF)).toContain("Did you mean digitalWrite?");
    expect(message("if (state = LOW) {", step("if (state == LOW) {"), { state: "state" })).toBe(text.errors.use_double_equals);
    expect(message("for (ledPin);", OFF)).toContain("Jumper does not run for yet.");
    expect(message("digitalWrite(ledPin, LOW) + 1;", OFF)).toContain("+");
    expect(message("digitalWrite(ledPin, LOW); delay(5);", OFF)).toBe(text.steps.extra.replace("{found}", '"delay"'));
  });

  it("follows a name that the learner gives a variable", () => {
    const names = pass("const int led = 13;", step("const int ledPin = 13;"), {});
    expect(names).toEqual({ ledPin: "led" });
    pass("digitalWrite(led, LOW);", OFF, names);
    expect(message("digitalWrite(ledPin, LOW);", OFF, names)).toContain("Jumper does not know ledPin.");
  });

  it("refuses a name that Arduino C uses, or a name that is already made", () => {
    expect(message("const int HIGH = 13;", step("const int ledPin = 13;"), {})).toBe(text.steps.bad_name.replace("{name}", "HIGH"));
    expect(message("const int void = 13;", step("const int ledPin = 13;"), {})).toBe(text.steps.bad_name.replace("{name}", "void"));
    expect(message("const int ledPin = 2;", step("const int buttonPin = 2;"), MINE)).toBe(text.errors.redeclare.replace("{name}", "ledPin"));
  });

  it("refuses 13 in place of ledPin, and accepts the answers that the step lists", () => {
    expect(message("digitalWrite(13, LOW);", OFF)).toContain('"13"');
    const decl = step("const int ledPin = 13;", { accept: ["int ledPin = 13;"] });
    expect(pass("int ledPin = 13;", decl, {})).toEqual({ ledPin: "ledPin" });
    expect(pass("int pin = 13;", decl, {})).toEqual({ ledPin: "pin" });
  });

  it("puts the typed lines into a sketch, with the indent of each step", () => {
    const steps = [step("void setup() {"), step("  pinMode(ledPin, OUTPUT);"), step("}")];
    expect(stepSketch(steps, ["void setup(){", "pinMode(ledPin,OUTPUT);  "])).toBe("void setup(){\n  pinMode(ledPin,OUTPUT);");
    expect(stepSketch(steps, [])).toBe("");
  });
});

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const finished = (position: number): Part[] => [...startBoard(boards, position), ...boards.levels[position]];

describe("the steps of each level", () => {
  /** Types each answer in its step, in order, and gives the sketch. */
  const typeAll = (steps: LineStep[], answers: string[]) => {
    let names: Names = {};
    answers.forEach((typed, i) => {
      names = pass(typed, steps[i], names);
    });
    return stepSketch(steps, answers);
  };
  const goalOf = async (position: number, source: string) => {
    const s = (await loadSketchStep("arduino-foundations", position))!;
    const parsed = parseSketch(source);
    if (!parsed.ok) throw new Error(parsed.error.message);
    return checkGoal(parsed.program, sketchCircuit(bench, finished(position)), s.goal);
  };

  it.each([2, 3, 4])("level %i: the steps, in order, make a sketch that does the goal", async (position) => {
    const { steps } = (await loadSketchStep("arduino-foundations", position))!;
    expect(steps?.length).toBeGreaterThan(5);
    const source = typeAll(steps!, steps!.map((s) => s.line));
    expect((await goalOf(position, source)).passed).toBe(true);
  });

  it.each([2, 3, 4])("level %i: the sketch does the goal with the learner's own names and spaces", async (position) => {
    const { steps } = (await loadSketchStep("arduino-foundations", position))!;
    const answers = steps!.map((s) => s.line.trim().replaceAll("ledPin", "light").replaceAll("buttonPin", "btn").replaceAll(", ", ","));
    expect((await goalOf(position, typeAll(steps!, answers))).passed).toBe(true);
  });

  it.each([2, 3, 4])("level %i: each answer that a step lists passes its step, and no goal or hint shows the line", async (position) => {
    const { steps } = (await loadSketchStep("arduino-foundations", position))!;
    let names: Names = {};
    for (const s of steps!) {
      for (const other of s.accept ?? []) pass(other, s, names);
      names = pass(s.line, s, names);
      const code = s.line.trim();
      if (code.length > 1) expect(`${s.goal} ${s.hint ?? ""}`).not.toContain(code);
    }
  });
});
