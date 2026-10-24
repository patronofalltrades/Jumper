import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { sketchesSchema } from "@/lib/content/schema";
import { loadSketchStep } from "@/lib/content/sketches";
import { BOARD_LED, sketchCircuit, type Pins } from "@/lib/sketch/circuit";
import { checkGoal, ledChanges, type Goal } from "@/lib/sketch/goal";
import { parseSketch, tokenize, type Program } from "@/lib/sketch/parse";
import { createRunner, MAX_STEPS } from "@/lib/sketch/run";
import sketches from "@/content/sketches/arduino-foundations.json";

// Issue #58: the Arduino sketch. The reader, the runner, the circuit that the sketch sees, the goal check and the
// error messages, on the Uno bench of Arduino Foundations with the finished boards of content/boards/.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
/** The finished board of a level: its start board and the parts that it adds. */
const finished = (position: number): Part[] => [...startBoard(boards, position), ...boards.levels[position]];

const program = (source: string): Program => {
  const result = parseSketch(source);
  if (!result.ok) throw new Error(result.error.message);
  return result.program;
};
const errorOf = (source: string) => {
  const result = parseSketch(source);
  if (result.ok) throw new Error("The sketch has no error");
  return result.error;
};
const sketch = (setup: string, loop: string, globals = "") => `${globals ? `${globals}\n` : ""}void setup() {\n${setup}\n}\nvoid loop() {\n${loop}\n}\n`;

const BLINK = sketch("pinMode(13, OUTPUT);", "digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);\ndelay(500);");
const BUTTON = sketch(
  "pinMode(ledPin, OUTPUT);\npinMode(buttonPin, INPUT_PULLUP);",
  "if (digitalRead(buttonPin) == LOW) {\n digitalWrite(ledPin, HIGH);\n} else {\n digitalWrite(ledPin, LOW);\n}\ndelay(10);",
  "const int buttonPin = 2;\nconst int ledPin = 13;",
);
const blinkGoal: Goal = { kind: "blink", led: "led1", led_name: "The LED", on_ms: 500, off_ms: 500 };
const buttonGoal = (led: string): Goal => ({ kind: "button", led, led_name: "The LED", button: "btn1" });

describe("the reader", () => {
  it("splits a sketch into words, numbers and signs, with their lines, and skips comments", () => {
    const tokens = tokenize("int a = 13; // a pin\n/* two\nlines */ a == 2");
    expect(tokens.map((t) => t.text)).toEqual(["int", "a", "=", "13", ";", "a", "==", "2", ""]);
    expect(tokens.map((t) => t.line)).toEqual([1, 1, 1, 1, 1, 3, 3, 3, 3]);
  });

  it("reads setup, loop, variables, the 4 functions, if and else", () => {
    const p = program(BUTTON);
    expect(p.globals).toHaveLength(2);
    expect(p.setup.body.map((s) => s.kind)).toEqual(["mode", "mode"]);
    expect(p.loop.body.map((s) => s.kind)).toEqual(["if", "delay"]);
    expect(p.loop.line).toBe(7);
  });

  it("reads else if, a statement with no braces, !, != and LED_BUILTIN", () => {
    const p = program(sketch("pinMode(LED_BUILTIN, OUTPUT);", "int s = digitalRead(2);\nif (s != HIGH) digitalWrite(13, HIGH);\nelse if (!s) digitalWrite(13, LOW);\ndelay(5);"));
    expect(p.loop.body.map((s) => s.kind)).toEqual(["set", "if", "delay"]);
  });

  it.each([
    ["pinMode(13);", "Line 2: pinMode needs two values: the pin and the mode."],
    ["pinMode(13, OUTPUT)", "Line 2: Put a ; at the end of this line."],
    ["digitalWrite(13);", "Line 2: digitalWrite needs two values: the pin and HIGH or LOW."],
    ["delay();", "Line 2: delay needs one value: the time in milliseconds."],
    ["pinMode(13, HIGH);", "Line 2: The mode of pinMode must be INPUT, OUTPUT or INPUT_PULLUP."],
    ["digitalwrite(13, HIGH);", "Line 2: Jumper does not know digitalwrite. Did you mean digitalWrite? Big and small letters must be the same."],
    ["ledPin = 3;", "Line 2: Jumper does not know ledPin. Check the spelling. If it is a variable, make it first, for example: int ledPin = 0;"],
    ["blink();", "Line 2: Jumper does not know the function blink. You can use pinMode, digitalWrite, digitalRead and delay."],
    ["Serial.begin(9600);", "Line 2: Jumper does not run Serial yet. You can use int, const int, pinMode, digitalWrite, digitalRead, delay, if and else."],
    ["for (int i = 0; i < 3; i++) {}", "Line 2: Jumper does not run for yet. You can use int, const int, pinMode, digitalWrite, digitalRead, delay, if and else."],
    ["int a = 1 + 2;", "Line 2: Jumper does not use the sign + yet. To compare two values, use == or !=."],
    ["if (digitalRead(2) = LOW) {}", "Line 2: Use == to compare two values. One = puts a value into a variable."],
    ["int x = delay(5);", "Line 2: delay does not give a value. Put it on its own line."],
    ["HIGH = 0;", "Line 2: You cannot change HIGH. It is a fixed name of the Arduino."],
    ["int a = 1;\nint a = 2;", "Line 3: a is already made. Make each variable only one time."],
    ["const int a;", "Line 2: A const int needs a value, for example: const int a = 13;"],
    ["int a = $;", "Line 2: Jumper does not know the sign $. Check this line for a typing mistake."],
    ["digitalWrite(13, \"HIGH\");", "Line 2: Jumper does not use text in quotes yet. Remove the quotes and the text between them."],
  ])("gives the line and a simple message for %s", (setup, message) => {
    expect(errorOf(sketch(setup, "delay(1);")).message).toBe(message);
  });

  it("names the line of the open brace when a } is missing", () => {
    const error = errorOf("void setup() {\n  pinMode(13, OUTPUT);\n\nvoid loop() {\n}\n");
    expect(error).toMatchObject({ code: "own_function", line: 4 });
    expect(errorOf("void setup() {\n}\nvoid loop() {\n delay(1);\n").message).toBe("Line 3: This { has no }. Each { needs a } to close it.");
  });

  it("finds a const that changes, a line outside the functions, and a missing setup or loop", () => {
    expect(errorOf(sketch("ledPin = 3;", "delay(1);", "const int ledPin = 13;")).message).toBe("Line 3: ledPin is a const int, so you cannot change it.");
    expect(errorOf("pinMode(13, OUTPUT);\n" + sketch("", "delay(1);")).code).toBe("outside_function");
    expect(errorOf("void loop() {\n delay(1);\n}\n").message).toBe("Line 1: Your sketch needs void setup() { }. It runs one time, at the start.");
    expect(errorOf("void setup() {\n}\n").code).toBe("no_loop");
    expect(errorOf(sketch("", "") + "void loop() {\n}\n").code).toBe("duplicate_function");
    expect(errorOf(sketch("", "") + "void blink() {\n}\n").message).toBe("Line 7: Jumper does not run functions that you make yet. Use only setup() and loop().");
    expect(errorOf(sketch("", "}")).message).toBe("Line 6: This } has no { before it. Remove it.");
  });

  it("keeps a variable inside its braces", () => {
    expect(errorOf(sketch("if (1) {\n int a = 1;\n}\na = 2;", "delay(1);")).code).toBe("unknown_name");
    expect(program(sketch("if (1) {\n int a = 1;\n}\nint a = 2;", "delay(1);")).slots).toBe(2);
  });
});

/** A runner with no wires: a pin reads only its pull-up. */
const alone = (source: string) => createRunner(program(source), (_pin, pins) => (pins.get(_pin)?.mode === "INPUT_PULLUP" ? 1 : null));

describe("the runner", () => {
  it("runs setup one time, then loop again and again, on the clock of the app", () => {
    const runner = alone(sketch("int n = 0;\npinMode(7, OUTPUT);", "digitalWrite(7, HIGH);\ndelay(300);\ndigitalWrite(7, LOW);\ndelay(700);"));
    runner.runTo(0);
    expect(runner.pins.get(7)).toEqual({ mode: "OUTPUT", out: 1 });
    runner.runTo(299);
    expect(runner.pins.get(7)?.out).toBe(1);
    runner.runTo(300);
    expect(runner.pins.get(7)?.out).toBe(0);
    runner.runTo(1000);
    expect(runner.pins.get(7)?.out).toBe(1);
    expect(runner.time).toBe(1000);
    expect(runner.history.map((m) => [m.time, m.pins.get(7)?.out])).toEqual([
      [0, 1],
      [300, 0],
      [1000, 1],
    ]);
  });

  it("keeps global variables between loops, and makes a loop variable new each time", () => {
    const runner = alone(sketch("pinMode(4, OUTPUT);", "int fresh = 0;\nif (fresh == 0) digitalWrite(4, state);\nif (state == HIGH) state = LOW; else state = HIGH;\nfresh = 1;\ndelay(100);", "int state = HIGH;"));
    runner.runTo(0);
    expect(runner.pins.get(4)?.out).toBe(1);
    runner.runTo(100);
    expect(runner.pins.get(4)?.out).toBe(0);
    runner.runTo(200);
    expect(runner.pins.get(4)?.out).toBe(1);
  });

  it("reads a pin with the read function: a pull-up reads HIGH", () => {
    const runner = alone(sketch("pinMode(2, INPUT_PULLUP);\npinMode(13, OUTPUT);", "digitalWrite(13, digitalRead(2));\ndelay(10);"));
    runner.runTo(0);
    expect(runner.pins.get(13)?.out).toBe(1);
  });

  it("stops a loop that never waits, with a message, after a fixed number of steps", () => {
    const runner = alone(sketch("pinMode(13, OUTPUT);", "digitalWrite(13, HIGH);"));
    runner.runTo(5_000);
    expect(runner.error).toMatchObject({ code: "no_delay", line: 4 });
    expect(runner.error?.message).toBe("Line 4: loop() runs again and again with no pause, so Jumper stopped the sketch. Add delay(10); at the end of loop().");
    expect(MAX_STEPS).toBeGreaterThan(1000);
  });

  it("stops a loop that waits 0 ms only, and an empty loop", () => {
    const zero = alone(sketch("", "delay(0);"));
    zero.runTo(10);
    expect(zero.error?.code).toBe("no_delay");
    const empty = alone(sketch("", ""));
    empty.runTo(10);
    expect(empty.error?.code).toBe("no_delay");
  });

  it("stops at a pin that the Uno does not have, and at a mode that is not a mode", () => {
    const pin = alone(sketch("pinMode(20, OUTPUT);", "delay(10);"));
    pin.runTo(0);
    expect(pin.error?.message).toBe("Line 2: The Uno has no pin 20. Use a pin from 0 to 13.");
    const wait = alone(sketch("if (t == 0) t = 5;", "delay(t);\ndelay(t);", "int t = 0;"));
    wait.runTo(100);
    expect(wait.error).toBeNull();
    const mode = alone(sketch("int m = 7;\npinMode(3, m);", "delay(1);"));
    mode.runTo(0);
    expect(mode.error?.code).toBe("bad_mode");
  });

  it("notes a pin that writes with no OUTPUT mode, and a pin that floats", () => {
    const runner = alone(sketch("pinMode(2, INPUT);", "digitalWrite(13, HIGH);\nint s = digitalRead(2);\ndelay(10);"));
    runner.runTo(50);
    expect(runner.notes.map((n) => [n.code, n.pin, n.line])).toEqual([
      ["write_not_output", 13, 5],
      ["read_floating", 2, 6],
    ]);
    expect(runner.notes[0].message).toBe("Line 5: Pin 13 is not an OUTPUT, so it cannot light the LED. Add pinMode(13, OUTPUT); to setup().");
  });
});

const pins = (entries: [number, "INPUT" | "OUTPUT" | "INPUT_PULLUP", 0 | 1][]): Pins => new Map(entries.map(([pin, mode, out]) => [pin, { mode, out }]));

describe("the circuit that the sketch sees", () => {
  it("lights the LED of level 2 when pin 13 is a HIGH output, through the resistor", () => {
    const circuit = sketchCircuit(bench, finished(2));
    expect(circuit.lit(pins([[13, "OUTPUT", 1]]), new Set())).toEqual(new Set(["led1", BOARD_LED]));
    expect(circuit.lit(pins([[13, "OUTPUT", 0]]), new Set()).size).toBe(0);
    expect(circuit.lit(pins([[13, "INPUT", 1]]), new Set()).size).toBe(0);
  });

  it("does not light a reversed LED, or an LED with no wire to ground", () => {
    const reversed = finished(2).map((p) => (p.id === "led1" && p.type === "led" ? { ...p, a: p.b, b: p.a } : p));
    expect(sketchCircuit(bench, reversed).lit(pins([[13, "OUTPUT", 1]]), new Set()).has("led1")).toBe(false);
    const open = finished(2).filter((p) => p.id !== "w4");
    expect(sketchCircuit(bench, open).lit(pins([[13, "OUTPUT", 1]]), new Set()).has("led1")).toBe(false);
  });

  it("reads the button of level 3: HIGH with the pull-up, LOW while pressed, floating with no pull-up", () => {
    const circuit = sketchCircuit(bench, finished(3));
    expect(circuit.buttons).toEqual(["btn1"]);
    const pullUp = pins([[2, "INPUT_PULLUP", 0]]);
    expect(circuit.read(2, pullUp, new Set())).toBe(1);
    expect(circuit.read(2, pullUp, new Set(["btn1"]))).toBe(0);
    expect(circuit.read(2, new Map(), new Set())).toBeNull();
    expect(circuit.read(2, new Map(), new Set(["btn1"]))).toBe(0);
    // A pin with no wire floats; an output reads its own level.
    expect(circuit.read(5, new Map(), new Set())).toBeNull();
    expect(circuit.read(5, pins([[5, "OUTPUT", 1]]), new Set())).toBe(1);
  });

  it("reads HIGH from a pin with a wire to 5V", () => {
    const circuit = sketchCircuit(bench, [...finished(1), { id: "w9", type: "wire", a: "uno-D4", b: "A-L+20" }]);
    expect(circuit.read(4, new Map(), new Set())).toBe(1);
  });
});

describe("the goal check", () => {
  it("passes the blink sketch on the board of level 2, and lists its changes", () => {
    const circuit = sketchCircuit(bench, finished(2));
    expect(checkGoal(program(BLINK), circuit, blinkGoal)).toEqual({ passed: true, message: "Your sketch does the goal!" });
    const runner = createRunner(program(BLINK), (pin, p) => circuit.read(pin, p, new Set()));
    runner.runTo(1200);
    expect(ledChanges(runner, circuit, "led1")).toEqual([
      { time: 0, on: true },
      { time: 500, on: false },
      { time: 1000, on: true },
    ]);
  });

  it("gives the reason when the LED does not blink as the goal says", () => {
    const circuit = sketchCircuit(bench, finished(2));
    const on = sketch("pinMode(13, OUTPUT);", "digitalWrite(13, HIGH);\ndelay(1000);");
    expect(checkGoal(program(on), circuit, blinkGoal)).toEqual({ passed: false, message: "The LED stays on. It must turn off for 500 ms." });
    const slow = sketch("pinMode(13, OUTPUT);", "digitalWrite(13, HIGH);\ndelay(1000);\ndigitalWrite(13, LOW);\ndelay(1000);");
    expect(checkGoal(program(slow), circuit, blinkGoal).message).toBe("The LED is on for 1000 ms and off for 1000 ms. It must be on for 500 ms and off for 500 ms.");
    const off = sketch("pinMode(13, OUTPUT);", "digitalWrite(13, LOW);\ndelay(500);");
    expect(checkGoal(program(off), circuit, blinkGoal).message).toBe("The LED stays off. It must turn on for 500 ms.");
    // A pin with no OUTPUT mode: the note tells why.
    const noMode = sketch("", "digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);\ndelay(500);");
    expect(checkGoal(program(noMode), circuit, blinkGoal)).toEqual({ passed: false, message: expect.stringContaining("Pin 13 is not an OUTPUT"), line: 5 });
  });

  it("does not pass the blink sketch when the wires are not ready", () => {
    const circuit = sketchCircuit(bench, finished(2).filter((p) => p.id !== "w3"));
    expect(checkGoal(program(BLINK), circuit, blinkGoal).message).toBe("The LED stays off. It must turn on for 500 ms.");
  });

  it("passes the button sketch for the L light on level 3, and for the breadboard LED on level 4", () => {
    expect(checkGoal(program(BUTTON), sketchCircuit(bench, finished(3)), buttonGoal(BOARD_LED)).passed).toBe(true);
    expect(checkGoal(program(BUTTON), sketchCircuit(bench, finished(4)), buttonGoal("led1")).passed).toBe(true);
  });

  it("gives the reason when the button sketch does not do the goal", () => {
    const circuit = sketchCircuit(bench, finished(4));
    const goal = buttonGoal("led1");
    const swapped = BUTTON.replace("== LOW", "== HIGH");
    expect(checkGoal(program(swapped), circuit, goal).message).toBe(
      "The LED does the opposite: it is on when nobody presses the button, and off when you press it. Swap HIGH and LOW.",
    );
    const neverOn = BUTTON.replace("digitalWrite(ledPin, HIGH);", "digitalWrite(ledPin, LOW);");
    expect(checkGoal(program(neverOn), circuit, goal).message).toBe("The LED stays off when you press the button. It must turn on while you press it.");
    const noPullUp = BUTTON.replace("INPUT_PULLUP", "INPUT");
    expect(checkGoal(program(noPullUp), circuit, goal)).toMatchObject({ passed: false, message: expect.stringContaining("Pin 2 is an INPUT with no pull-up resistor"), line: 8 });
    const alwaysOn = sketch("pinMode(13, OUTPUT);", "digitalWrite(13, HIGH);\ndelay(10);");
    expect(checkGoal(program(alwaysOn), circuit, goal).message).toBe("The LED stays on when nobody presses the button. It must turn off when you let go.");
  });

  it("gives the stop message for a button sketch with no delay", () => {
    const noDelay = BUTTON.replace("delay(10);", "");
    expect(checkGoal(program(noDelay), sketchCircuit(bench, finished(3)), buttonGoal(BOARD_LED))).toMatchObject({ passed: false, line: 7, message: expect.stringContaining("no pause") });
  });
});

describe("the sketch content", () => {
  it("has a valid code step for levels 2, 3 and 4", async () => {
    expect(Object.keys(sketchesSchema.parse(sketches).levels)).toEqual(["2", "3", "4"]);
    expect(await loadSketchStep("arduino-foundations", 1)).toBeNull();
    expect(await loadSketchStep("perch", 2)).toBeNull();
    expect(await loadSketchStep("../x", 2)).toBeNull();
  });

  it.each([2, 3, 4])("level %i: the starter code reads with no error, does not do the goal yet, and names a part of the finished board", async (position) => {
    const step = (await loadSketchStep("arduino-foundations", position))!;
    const circuit = sketchCircuit(bench, finished(position));
    const result = checkGoal(program(step.starter.join("\n")), circuit, step.goal);
    expect(result.passed).toBe(false);
    expect(result.message).not.toMatch(/\{\w+\}/);
    const ids = new Set([...finished(position).map((p) => p.id), BOARD_LED]);
    expect(ids.has(step.goal.led)).toBe(true);
    if (step.goal.kind === "button") expect(circuit.buttons).toContain(step.goal.button);
  });

  it("level 2 starter fails with the message of the issue", async () => {
    const step = (await loadSketchStep("arduino-foundations", 2))!;
    expect(checkGoal(program(step.starter.join("\n")), sketchCircuit(bench, finished(2)), step.goal).message).toBe("The LED stays on. It must turn off for 500 ms.");
  });

  it.each([
    [2, BLINK],
    [3, BUTTON],
    [4, BUTTON],
  ])("level %i: a correct sketch does the goal on the finished board", async (position, source) => {
    const step = (await loadSketchStep("arduino-foundations", position))!;
    expect(checkGoal(program(source), sketchCircuit(bench, finished(position)), step.goal).passed).toBe(true);
  });
});
