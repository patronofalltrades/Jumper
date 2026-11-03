import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { sketchesSchema } from "@/lib/content/schema";
import { createBoardStore } from "@/lib/game/board-store";
import { CODE_XP, codeXp } from "@/lib/game/check-flow";
import { sketchCircuit } from "@/lib/sketch/circuit";
import { checkGoal } from "@/lib/sketch/goal";
import { parseSketch } from "@/lib/sketch/parse";
import sketches from "@/content/sketches/arduino-foundations.json";

// Issue #145: "Write it for me" fills in the sketch of the level. A sketch that the learner writes gives +20 XP; a
// sketch from the button gives 0 XP, until the learner changes the code and it does the goal again.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const finished = (position: number): Part[] => [...startBoard(boards, position), ...boards.levels[position]];
const levels = Object.entries(sketchesSchema.parse(sketches).levels);

describe("the solution of each code step", () => {
  it.each(levels)("level %s: the solution reads with no error and does the goal on the finished board", (position, step) => {
    const source = step.solution.join("\n");
    expect(source).not.toBe(step.starter.join("\n"));
    const parsed = parseSketch(source);
    if (!parsed.ok) throw new Error(parsed.error.message);
    expect(checkGoal(parsed.program, sketchCircuit(bench, finished(Number(position))), step.goal)).toMatchObject({ passed: true });
  });
});

describe("the code XP", () => {
  it("gives +20 XP for a sketch that the learner wrote and that does the goal, else 0", () => {
    expect(CODE_XP).toBe(20);
    expect(codeXp({ code: "mine", codePassed: true, helpedCode: null })).toBe(20);
    expect(codeXp({ code: "mine", codePassed: true, helpedCode: "theirs" })).toBe(20);
    expect(codeXp({ code: "theirs", codePassed: true, helpedCode: "theirs" })).toBe(0);
    expect(codeXp({ code: null, codePassed: true, helpedCode: null })).toBe(20);
    expect(codeXp({ code: "mine", codePassed: false, helpedCode: null })).toBe(0);
  });

  it("gives 0 XP for a sketch from Write it for me, and +20 XP after the learner changes it and it does the goal again", () => {
    const store = createBoardStore(bench);
    store.getState().open("af/2", { bench, code: "// mine", codePassed: false });
    const solution = "void setup() {}\nvoid loop() { delay(10); }";

    store.getState().writeForMe(solution);
    expect(store.getState()).toMatchObject({ code: solution, codePassed: false, helpedCode: solution });
    store.getState().passCode();
    expect(codeXp(store.getState())).toBe(0);
    // The editor sends the new text back as a change. The same text is not a change of the learner.
    store.getState().setCode(solution);
    expect(store.getState()).toMatchObject({ codePassed: true });
    expect(codeXp(store.getState())).toBe(0);

    store.getState().setCode(`${solution}\n// my change`);
    expect(store.getState()).toMatchObject({ codePassed: false });
    store.getState().passCode();
    expect(codeXp(store.getState())).toBe(20);
  });

  it("gives 0 XP when the code goes back to the sketch of Write it for me: undo and redo, or Start again and paste", () => {
    const store = createBoardStore(bench);
    store.getState().open("af/2", { bench, code: "// mine" });
    const solution = "void setup() {}\nvoid loop() { delay(10); }";
    store.getState().writeForMe(solution);
    // Undo in the editor gives back the code of the learner, and redo gives the sketch of Write it for me again.
    store.getState().setCode("// mine");
    store.getState().setCode(solution);
    store.getState().passCode();
    expect(codeXp(store.getState())).toBe(0);
    // Start again, then paste the same sketch.
    store.getState().setCode(null);
    store.getState().setCode(solution);
    store.getState().passCode();
    expect(codeXp(store.getState())).toBe(0);
  });

  it("keeps the 0 XP mark when the level opens again from the browser save", () => {
    const store = createBoardStore(bench);
    store.getState().open("af/3", { bench, code: "x", codePassed: true, helpedCode: "x" });
    expect(codeXp(store.getState())).toBe(0);
    store.getState().open("af/4", { bench, code: "x", codePassed: true });
    expect(codeXp(store.getState())).toBe(20);
  });
});
