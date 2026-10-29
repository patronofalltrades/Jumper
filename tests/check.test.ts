import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { checkLevel, connectionStates, isEmptyBoard, joinRules, placedParts } from "@/lib/circuit/check";
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

// Issue #65: Check on a level tests the rules of the levels before it too.
describe("joined rules", () => {
  const upTo = (position: number) => joinRules(perch.levels, Array.from({ length: position }, (_, i) => i + 1));

  for (const level of perch.levels) {
    it(`passes the finished board of level ${level.position} with the rules of levels 1 to ${level.position}`, () => {
      expect(checkLevel(bench, finished(level.position), upTo(level.position))).toEqual({ passed: true });
    });
  }

  it("fails level 2 when the 3V3 wire of level 1 is gone", () => {
    const board = finished(2).filter((p) => p.id !== "w1");
    expect(checkLevel(bench, board, rulesOf(2))).toEqual({ passed: true }); // the old check missed it
    expect(checkLevel(bench, board, upTo(2))).toMatchObject({ passed: false, code: "wrong_pin", connection: { a: "esp.3V3", b: "bbA.+" } });
  });

  it("fails level 2 when the ground wire of level 1 is gone, with the missing ground reason", () => {
    const board = finished(2).filter((p) => p.id !== "w2");
    expect(checkLevel(bench, board, upTo(2))).toMatchObject({ passed: false, code: "missing_ground" });
  });

  // Issue #89: the failed connection says the level it came from, for the text "From level N:".
  it("gives the failed connection of level 1 the level it came from", () => {
    const board = finished(2).filter((p) => p.id !== "w1");
    expect(checkLevel(bench, board, upTo(2))).toMatchObject({ passed: false, connection: { a: "esp.3V3", b: "bbA.+", from: 1 } });
  });

  it("counts a connection once when two levels name it, in either order", () => {
    const a = { require: [{ a: "x.1", b: "y.2" }], forbid: [{ a: "p", b: "q", code: "c", message: "m" }] };
    const b = { require: [{ a: "y.2", b: "x.1" }, { a: "z.1", b: "y.2" }], forbid: [{ a: "q", b: "p", code: "c", message: "m" }] };
    const joined = joinRules([{ position: 1, rules: a }, { position: 2, rules: b }], [1, 2]);
    expect(joined.require).toHaveLength(2);
    expect(joined.forbid).toHaveLength(1);
  });

  it("gives a connection the level that names it, and the later level when two levels name it", () => {
    const a = { require: [{ a: "x.1", b: "y.2" }, { a: "p.1", b: "q.2" }], forbid: [] };
    const b = { require: [{ a: "y.2", b: "x.1" }], forbid: [] };
    const joined = joinRules([{ position: 1, rules: a }, { position: 2, rules: b }], [1, 2]);
    expect(joined.require).toEqual([
      { a: "x.1", b: "y.2", from: 2 },
      { a: "p.1", b: "q.2", from: 1 },
    ]);
  });

  it("joins only the listed levels", () => {
    const joined = joinRules(perch.levels, [1, 3]);
    expect(joined.require).toHaveLength(rulesOf(1).require.length + rulesOf(3).require.length);
  });
});

// Issue #92: the state of each connection, for the list under a failed Check. It uses the same way round as checkLevel.
describe("connection states", () => {
  const rulesUpTo = (position: number) => joinRules(perch.levels, Array.from({ length: position }, (_, i) => i + 1));

  it("is right for every connection on the finished board of every level", () => {
    for (const level of perch.levels) {
      const states = connectionStates(bench, finished(level.position), rulesUpTo(level.position));
      expect(states.length).toBeGreaterThan(0);
      expect(states.every((s) => s.ok)).toBe(true);
    }
  });

  it("gives every connection of the rules, requires first, then forbids", () => {
    const rules = rulesUpTo(2);
    const states = connectionStates(bench, finished(2), rules);
    expect(states.map((s) => s.connection)).toEqual([...rules.require, ...rules.forbid].map((c) => ({ a: c.a, b: c.b })));
    expect(states.map((s) => s.kind)).toEqual([...rules.require.map(() => "require"), ...rules.forbid.map(() => "forbid")]);
  });

  it("marks the missing 3V3 wire of level 1 as wrong, and the wire is named", () => {
    const board = finished(2).filter((p) => p.id !== "w1");
    expect(connectionStates(bench, board, rulesUpTo(2))).toContainEqual({ kind: "require", connection: { a: "esp.3V3", b: "bbA.+" }, ok: false });
  });

  it("marks a wire on the wrong pin as wrong", () => {
    const board = finished(3).map((p) => (p.id === "w12" && p.type === "wire" ? { ...p, b: "B-d9" } : p));
    expect(connectionStates(bench, board, rulesOf(3))).toContainEqual({ kind: "require", connection: { a: "mic1.WS", b: "esp.GPIO4" }, ok: false });
  });

  it("marks the reversed LED as wrong, with its forbid connection", () => {
    const board = finished(2).map((p) => (p.id === "led1" && p.type === "led" ? { ...p, a: p.b, b: p.a } : p));
    expect(connectionStates(bench, board, rulesOf(2))).toContainEqual({ kind: "forbid", connection: { a: "led1.anode", b: "esp.GND" }, ok: false });
  });

  it("marks a short circuit as a broken forbid connection", () => {
    const states = connectionStates(bench, [...finished(1), wire("w9", "B-c5", "A-h5")], rulesOf(1));
    expect(states.some((s) => s.kind === "forbid" && !s.ok)).toBe(true);
  });

  it("accepts a resistor with its two sides the other way round, as checkLevel does", () => {
    const board = finished(2).map((p) => (p.id === "r1" && p.type === "resistor" ? { ...p, a: p.b, b: p.a } : p));
    expect(connectionStates(bench, board, rulesOf(2)).every((s) => s.ok)).toBe(true);
  });

  // The list and the Check must agree: every connection is right exactly when the Check passes.
  it("is all right exactly when checkLevel passes", () => {
    const boards: Part[][] = [
      finished(3),
      finished(3).filter((p) => p.id !== "w12"),
      finished(2).map((p) => (p.id === "led1" && p.type === "led" ? { ...p, a: p.b, b: p.a } : p)),
      finished(1).filter((p) => p.id !== "w2"),
      [...finished(1), wire("w9", "B-c5", "A-h5")],
    ];
    for (const board of boards) {
      const rules = rulesUpTo(3);
      expect(connectionStates(bench, board, rules).every((s) => s.ok)).toBe(checkLevel(bench, board, rules).passed);
    }
  });
});
