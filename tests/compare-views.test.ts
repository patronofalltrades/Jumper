import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ui from "@/content/ui/journey.json";
import { createBench } from "@/lib/circuit/bench";
import { applyChange } from "@/lib/circuit/change";
import { endpointHole } from "@/lib/circuit/nets";
import { loadBenchSpec } from "@/lib/content/benches";
import { lessonOf } from "@/lib/journey/lesson-of";
import { answerQuestion, answerRecord, lastFeedback, noAnswers, readQuestions } from "@/lib/journey/questions";
import { diffLines, linkedTargets, placeText, referenceDifference, selectionAt, showsTarget, verdictOf, wireOn } from "@/lib/journey/select";

// Compare views (issue #202, TRD addendum 6.5): one selection in each view, the difference from the reference, and the
// questions. The questions use a fixture here: the lesson file has no questions until the real photos and clip exist.

const found = lessonOf("arduino-foundations", 2)!;
const { lesson, reference } = found;
const bench = createBench(await loadBenchSpec(lesson.project));
const change = (id: string) => applyChange(reference, "", lesson.changes.find((c) => c.id === id)!.ops!).parts;

describe("the lesson of a level", () => {
  it("gives the LED lesson with its reference board for Arduino Foundations level 2 only", () => {
    expect(lesson.id).toBe("af-led");
    expect(reference.map((p) => p.id)).toEqual(expect.arrayContaining(["w1", "w2", "r1", "led1", "w3", "w4"]));
    expect(lessonOf("arduino-foundations", 1)).toBeNull();
    expect(lessonOf("perch", 2)).toBeNull();
  });
});

describe("the schematic", () => {
  const drawing = readFileSync("components/journey/schematic-af-led.tsx", "utf8");

  it("has an element for each terminal and each connection of the map, and each id is used one time", () => {
    const sids = [...lesson.map.terminals, ...lesson.map.connections].map((item) => item.schematic);
    for (const sid of sids) {
      expect(sid, "each item of the map has a schematic id").toBeTruthy();
      expect(drawing.split(`"${sid}"`).length - 1, sid).toBe(1);
    }
    expect(new Set(sids).size).toBe(sids.length);
  });
});

describe("linkedTargets", () => {
  it("gives the schematic element, the hole and the label of a terminal", () => {
    const pin = linkedTargets(lesson.map, "uno.D13", bench, reference)!;
    expect(pin).toMatchObject({ kind: "terminal", label: "Pin 13 of the Uno", schematic: ["t-uno-d13"], terminals: ["uno.D13"] });
    // The points of pin 13 on the two photos of the lesson (issue #208).
    expect(Object.keys(pin.photos).sort()).toEqual(["layout2", "ref"]);
    expect(pin.holes).toEqual([endpointHole(bench, reference, "uno.D13")]);
    expect(pin.explain).toBeUndefined();
  });

  it("gives the net, the two ends and the authored text of a connection", () => {
    const c = linkedTargets(lesson.map, "c-d13-r1", bench, reference)!;
    expect(c.kind).toBe("connection");
    expect(c.label).toBe("Pin 13 of the Uno → Resistor, first leg");
    expect(c.schematic).toEqual(["n-d13-r1", "t-uno-d13", "t-r1-1"]);
    expect(c.holes).toHaveLength(2);
    expect(c.explain).toContain("column 22");
  });

  it("gives no hole for a part that is not on the board, and null for an unknown id", () => {
    const noResistor = reference.filter((p) => p.id !== "r1");
    expect(linkedTargets(lesson.map, "r1.1", bench, noResistor)!.holes).toEqual([]);
    expect(linkedTargets(lesson.map, "c-d13-r1", bench, noResistor)!.holes).toHaveLength(1);
    expect(linkedTargets(lesson.map, "no-such-id", bench, reference)).toBeNull();
  });

  it("gives the points on each photo, when the map has them", () => {
    const map = { ...lesson.map, terminals: lesson.map.terminals.map((t) => (t.id === "uno.D13" ? { ...t, photos: { ref: { x: 0.4, y: 0.2 } } } : { ...t, photos: undefined })) };
    expect(linkedTargets(map, "uno.D13", bench, reference)!.photos).toEqual({ ref: [{ x: 0.4, y: 0.2 }] });
    expect(linkedTargets(map, "c-d13-r1", bench, reference)!.photos).toEqual({ ref: [{ x: 0.4, y: 0.2 }] });
  });
});

describe("a hole of the 3D board selects its connection", () => {
  it("selects the connection of the net, in each hole of the strip", () => {
    expect(selectionAt(lesson.map, bench, reference, "A-a22")).toBe("c-d13-r1");
    expect(selectionAt(lesson.map, bench, reference, "A-e22")).toBe("c-d13-r1");
    expect(selectionAt(lesson.map, bench, reference, "A-d26")).toBe("c-r1-led");
    expect(selectionAt(lesson.map, bench, reference, endpointHole(bench, reference, "uno.5V")!)).toBe("c-5v-rail");
  });

  it("selects nothing on a net with no mapped terminal", () => {
    expect(selectionAt(lesson.map, bench, reference, "A-a3")).toBeNull();
    expect(selectionAt(lesson.map, bench, reference, "no-such-hole")).toBeNull();
  });

  it("selects the terminal when its connection is open", () => {
    // The pin 13 wire went to pin 12: the resistor leg is alone on its strip.
    expect(selectionAt(lesson.map, bench, change("move-d13-to-d12"), "A-c22")).toBe("r1.1");
  });

  it("knows when the board already shows the selection", () => {
    const target = linkedTargets(lesson.map, "c-d13-r1", bench, reference)!;
    expect(showsTarget(bench, reference, target, "A-b22")).toBe(true);
    expect(showsTarget(bench, reference, target, "A-b26")).toBe(false);
  });
});

describe("the difference from the reference", () => {
  it("finds no difference on the reference board, also with the parts in other holes", () => {
    expect(referenceDifference(lesson.map, bench, reference, reference)).toMatchObject({ same: true, changed: [] });
    // The resistor after the LED is a different circuit order, so it is a difference; the same parts one column away are not.
    const moved = reference.map((p) => (p.id === "w3" ? { ...p, b: "A-b22" } : p));
    expect(referenceDifference(lesson.map, bench, reference, moved).same).toBe(true);
  });

  it("names the moved wire: pin 13 went to pin 12 (F1-AC2)", () => {
    const d = referenceDifference(lesson.map, bench, reference, change("move-d13-to-d12"));
    expect(d.same).toBe(false);
    expect(d.changed).toEqual(["c-d13-r1"]);
    const lines = diffLines(lesson.map, d.diff, ui.compare.difference);
    expect(lines).toEqual([{ kind: "removed", terminal: "r1.1", text: "Resistor, first leg and Pin 13 of the Uno are not connected now." }]);
  });

  it("names a moved end, with the old and the new terminal", () => {
    const d = referenceDifference(lesson.map, bench, reference, change("move-gnd-wire-to-plus"));
    expect(d.changed).toEqual(["c-led-gnd"]);
    const lines = diffLines(lesson.map, d.diff, ui.compare.difference);
    expect(lines.some((l) => l.kind === "moved" && l.text.includes("LED, short leg (−)") && l.text.includes("Now it is connected to"))).toBe(true);
    for (const l of lines) expect(l.text).not.toMatch(/\{\w+\}/);
  });

  it("marks each connection of a part that is not on the board", () => {
    const d = referenceDifference(lesson.map, bench, reference, reference.filter((p) => p.id !== "led1"));
    expect(d.changed).toEqual(["c-r1-led", "c-led-gnd"]);
  });
});

describe("the answer of the panel (verdict)", () => {
  const verdict = (parts: typeof reference) => {
    const d = referenceDifference(lesson.map, bench, reference, parts);
    return verdictOf(lesson.map, bench, reference, parts, d, diffLines(lesson.map, d.diff, ui.compare.difference));
  };
  const words = ui.compare.verdict.place;

  it("says match on the reference board", () => {
    expect(verdict(reference)).toEqual({ kind: "match" });
  });

  it("names the wire and the two rows when the pin 13 wire goes to a different row", () => {
    // The pin 13 wire goes to row 18: the resistor leg in row 22 has no wire now.
    const parts = reference.map((p) => (p.id === "w3" ? { ...p, b: "A-a18" } : p));
    const v = verdict(parts);
    expect(v).toMatchObject({ kind: "wire", connection: "c-d13-r1", terminal: "uno.D13", wire: "w3" });
    if (v.kind !== "wire") throw new Error("no wire");
    expect(placeText(v.now, words)).toBe("row 18");
    expect(placeText(v.ref, words)).toBe("row 22");
  });

  it("names the pins when the wire goes to pin 12, and the line when it goes to the + line", () => {
    const pin = verdict(change("move-d13-to-d12"));
    expect(pin).toMatchObject({ kind: "wire", connection: "c-d13-r1", terminal: "r1.1" });
    if (pin.kind === "wire") expect([placeText(pin.now, words), placeText(pin.ref, words)]).toEqual(["pin 12", "pin 13"]);
    const rail = verdict(change("move-gnd-wire-to-plus"));
    expect(rail).toMatchObject({ kind: "wire", connection: "c-led-gnd", terminal: "led1.cathode", wire: "w4" });
    if (rail.kind === "wire") expect([placeText(rail.now, words), placeText(rail.ref, words)]).toEqual(["the + line", "the − line"]);
  });

  it("names the open connection when no wire moved", () => {
    expect(verdict(change("remove-gnd-wire"))).toEqual({ kind: "open", connection: "c-led-gnd" });
    expect(verdict(change("reverse-led")).kind).toBe("open");
  });

  it("finds the wire on the net of a terminal, and its other end", () => {
    expect(wireOn(bench, reference, "uno.D13")).toEqual({ wire: "w3", other: "A-a22" });
    expect(wireOn(bench, reference, "r1.2")).toBeNull();
  });
});

describe("the questions (fixture)", () => {
  const [question] = readQuestions([
    {
      id: "transfer-layout2",
      kind: "transfer",
      photo: "layout2",
      prompt: "The LED does not light. Which connection do you check first?",
      options: [
        { id: "gnd", text: "The LED to ground", correct: true, feedback: "Yes. With no path to ground, the loop is open.", connection: "c-led-gnd" },
        { id: "5v", text: "The 5 V wire", correct: false, feedback: "The LED does not use the 5 V wire." },
      ],
      hints: ["Follow the loop from pin 13.", "Look at the short leg of the LED."],
    },
  ]);

  it("reads the questions of a lesson, and a lesson with no questions gives none", () => {
    expect(question.options).toHaveLength(2);
    expect(readQuestions(undefined)).toEqual([]);
    expect(readQuestions(lesson.questions)).toEqual([]);
  });

  it("refuses a question with no correct option, or with two", () => {
    const bad = (correct: boolean[]) => [{ id: "q", kind: "first-check", prompt: "?", options: correct.map((c, i) => ({ id: `o${i}`, text: "t", correct: c, feedback: "f" })) }];
    expect(() => readQuestions(bad([false, false]))).toThrow();
    expect(() => readQuestions(bad([true, true]))).toThrow();
    expect(() => readQuestions(bad([true, false]))).not.toThrow();
  });

  it("keeps the first answer, the hints and the final answer as separate values (F1-R6)", () => {
    let s = answerQuestion(question, noAnswers, { type: "answer", option: "5v" });
    expect(s).toMatchObject({ first: "5v", firstCorrect: false, done: false });
    expect(lastFeedback(question, s)).toBe("The LED does not use the 5 V wire.");
    s = answerQuestion(question, s, { type: "hint" });
    s = answerQuestion(question, s, { type: "answer", option: "gnd" });
    expect(answerRecord(s)).toEqual({ first: "5v", firstCorrect: false, final: "gnd", finalCorrect: true, hintsUsed: 1, helped: true });
  });

  it("records a correct first answer with no help (F1-AC3)", () => {
    const s = answerQuestion(question, noAnswers, { type: "answer", option: "gnd" });
    expect(answerRecord(s)).toEqual({ first: "gnd", firstCorrect: true, final: "gnd", finalCorrect: true, hintsUsed: 0, helped: false });
  });

  it("changes nothing after the end, for an unknown option, or for a hint that does not exist", () => {
    const done = answerQuestion(question, noAnswers, { type: "answer", option: "gnd" });
    expect(answerQuestion(question, done, { type: "answer", option: "5v" })).toBe(done);
    expect(answerQuestion(question, done, { type: "hint" })).toBe(done);
    expect(answerQuestion(question, noAnswers, { type: "answer", option: "nope" })).toBe(noAnswers);
    const two = answerQuestion(question, answerQuestion(question, noAnswers, { type: "hint" }), { type: "hint" });
    expect(two.hints).toBe(2);
    expect(answerQuestion(question, two, { type: "hint" })).toBe(two);
  });

  it("the answer key names a connection, not a position (F1-AC4)", () => {
    const correct = question.options.find((o) => o.correct)!;
    expect(lesson.map.connections.some((c) => c.id === correct.connection)).toBe(true);
  });
});
