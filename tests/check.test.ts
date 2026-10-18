import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { checkLevel, isEmptyBoard, placedParts } from "@/lib/circuit/check";
import type { Part } from "@/lib/circuit/parts";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";

const bench = perchBench();
const perch = loadProjects().find((p) => p.slug === "perch")!;
const boards = await loadBoards("perch");
const rulesOf = (position: number) => perch.levels.find((l) => l.position === position)!.rules;
/** The finished board of a level: the parts of that level and of all the levels before it. */
const finished = (position: number) => startBoard(boards, position + 1);
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });

describe("level check", () => {
  for (const level of perch.levels) {
    it(`passes the finished board of level ${level.position}`, () => {
      expect(checkLevel(bench, finished(level.position), level.rules)).toEqual({ passed: true });
    });
  }

  // The red/green test of this PR: an LED turned around must fail the check, with the reversed LED reason.
  it("fails a level 2 board with the LED turned around, and gives the reversed LED reason", () => {
    const board = finished(2).map((p) => (p.id === "led1" && p.type === "led" ? { ...p, a: p.b, b: p.a } : p));
    expect(checkLevel(bench, board, rulesOf(2))).toMatchObject({ passed: false, code: "reversed_led", connection: { a: "led1.anode", b: "esp.GND" } });
  });

  it("gives the text of the forbid rule for a short circuit", () => {
    // 3V3 (row a of B, column 5) to GND (row j of A, column 5).
    const result = checkLevel(bench, [...finished(1), wire("w9", "B-c5", "A-h5")], rulesOf(1));
    expect(result).toMatchObject({ passed: false, code: "short_power" });
    expect(result.passed || result.message).toMatch(/short circuit/);
  });

  it("finds a missing ground wire", () => {
    const board = finished(1).filter((p) => p.id !== "w2");
    expect(checkLevel(bench, board, rulesOf(1))).toMatchObject({ passed: false, code: "missing_ground", connection: { a: "esp.GND", b: "bbA.-" } });
  });

  it("finds a wire on the wrong pin", () => {
    // The WS wire of the mic (w12) goes to the line of GPIO 5 (column 9 of B), not GPIO 4 (column 8).
    const board = finished(3).map((p) => (p.id === "w12" && p.type === "wire" ? { ...p, b: "B-d9" } : p));
    expect(checkLevel(bench, board, rulesOf(3))).toMatchObject({ passed: false, code: "wrong_pin", connection: { a: "mic1.WS", b: "esp.GPIO4" } });
  });

  it("accepts a resistor with its two sides the other way round", () => {
    const board = finished(2).map((p) => (p.id === "r1" && p.type === "resistor" ? { ...p, a: p.b, b: p.a } : p));
    expect(checkLevel(bench, board, rulesOf(2))).toEqual({ passed: true });
  });
});

describe("empty board", () => {
  const start = finished(1);

  it("is empty when the learner placed no part: a new level, or every placed part removed", () => {
    expect(isEmptyBoard([], [])).toBe(true);
    expect(isEmptyBoard(start, start)).toBe(true);
  });

  it("is not empty when the learner placed one part", () => {
    const board = [...start, wire("w9", "A-a20", "A-a25")];
    expect(isEmptyBoard(board, start)).toBe(false);
    expect(placedParts(board, start).map((p) => p.id)).toEqual(["w9"]);
  });

  it("counts a part that the learner moved, even with the same id", () => {
    const [first, ...rest] = start;
    const moved = { ...first, b: "A-a30" } as Part;
    expect(placedParts([moved, ...rest], start)).toEqual([moved]);
  });

  // A level with only "Got it" tasks would keep Check off for good.
  for (const level of perch.levels) {
    it(`is not empty on the finished board of level ${level.position}`, () => {
      expect(isEmptyBoard(finished(level.position), startBoard(boards, level.position))).toBe(false);
    });
  }

  it("is still empty when the learner removed a part of the start board and placed nothing", () => {
    expect(isEmptyBoard(start.slice(1), start)).toBe(true);
  });
});
