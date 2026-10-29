import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { checkLevel } from "@/lib/circuit/check";
import { isProblemFixed, problemHoles, problemOf } from "@/lib/circuit/problem";
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

describe("problem of a failed Check", () => {
  it("is a missing connection when the Check named a require rule (missing ground, wrong pin)", () => {
    const board = finished(1).filter((p) => p.id !== "w2");
    const result = checkLevel(bench, board, rulesOf(1));
    expect(problemOf(result as Extract<typeof result, { passed: false }>)).toEqual({ connection: { a: "esp.GND", b: "bbA.-" }, forbidden: false });
  });

  it("is a forbidden connection when the Check named a forbid rule (short circuit)", () => {
    const result = checkLevel(bench, [...finished(1), wire("w9", "B-c5", "A-h5")], rulesOf(1));
    expect(result.passed).toBe(false);
    if (result.passed) return;
    expect(problemOf(result)).toMatchObject({ forbidden: true });
  });

  it("gives the two holes of its connection on the bench", () => {
    const board = finished(1).filter((p) => p.id !== "w2");
    const problem = problemOf(checkLevel(bench, board, rulesOf(1)) as Extract<ReturnType<typeof checkLevel>, { passed: false }>);
    // Two holes: the GND pin of the main board and the blue rail of breadboard A.
    const holes = problemHoles(bench, board, problem);
    expect(holes).toHaveLength(2);
    for (const hole of holes) expect(bench.byId.has(hole)).toBe(true);
  });
});

describe("is the problem fixed now?", () => {
  it("is not fixed while a require connection is missing, and fixed when the wire is back", () => {
    const board = finished(1).filter((p) => p.id !== "w2");
    const problem = problemOf(checkLevel(bench, board, rulesOf(1)) as Extract<ReturnType<typeof checkLevel>, { passed: false }>);
    expect(isProblemFixed(bench, board, problem)).toBe(false);
    expect(isProblemFixed(bench, finished(1), problem)).toBe(true);
  });

  it("is not fixed while a forbidden connection is made, and fixed when the short circuit wire is removed", () => {
    const short = [...finished(1), wire("w9", "B-c5", "A-h5")];
    const result = checkLevel(bench, short, rulesOf(1));
    if (result.passed) throw new Error("the short circuit board must fail");
    const problem = problemOf(result);
    expect(isProblemFixed(bench, short, problem)).toBe(false);
    expect(isProblemFixed(bench, finished(1), problem)).toBe(true);
  });
});
