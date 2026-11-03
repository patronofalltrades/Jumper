import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { fitProgress, startProgress, type Plan, type Progress } from "@/lib/game/engine";

// Issue #148: Level 1 has fewer tasks now (the 3 "Got it" tasks are one "Look" task). A board saved in the browser with
// the old task list keeps its parts. The engine reads the board again and opens the first task that the board does not do.

const bench = perchBench();
const perch = loadProjects().find((p) => p.slug === "perch")!;
const boards = await loadBoards("perch");
const level = perch.levels.find((l) => l.position === 1)!;
const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
const [w1, w2, w3, w4] = boards.levels[1].filter((p) => p.type === "wire");
const start = startBoard(boards, 1);

/** A progress saved with the old Level 1 (7 tasks: 3 "Got it", then 4 wires). */
const oldSave = (over: Partial<Progress>): Progress => ({ ...startProgress(), phase: "task", ...over });

describe("fitProgress: a saved progress on a changed task list", () => {
  it("opens the first task that the board does not do: an old save on the second wire opens the new second wire", () => {
    const saved = oldSave({ index: 4, reached: 4, tasksDone: 4, xp: 40 });
    const fit = fitProgress(bench, plan, [...start, w1], saved);
    expect(fit).toMatchObject({ phase: "task", index: 2, reached: 4, xp: 40, mistakes: 0 });
  });

  it("an old save that was ready to Check stays ready, with its XP, and counts no more tasks than the level has", () => {
    const saved = oldSave({ phase: "ready_to_check", index: 7, reached: 7, tasksDone: 7, xp: 70 });
    const fit = fitProgress(bench, plan, [...start, w1, w2, w3, w4], saved);
    expect(fit).toMatchObject({ phase: "ready_to_check", index: 5, reached: 5, tasksDone: 5, xp: 70 });
  });

  it("an old save that was ready to Check, with a wire gone, opens the task of that wire", () => {
    const saved = oldSave({ phase: "ready_to_check", index: 7, reached: 7, tasksDone: 7, xp: 70 });
    expect(fitProgress(bench, plan, [...start, w1, w3, w4], saved)).toMatchObject({ phase: "task", index: 2 });
  });

  it("gives back the same progress when it fits the task list", () => {
    const saved = oldSave({ index: 2, reached: 2, tasksDone: 2, xp: 20 });
    const fit = fitProgress(bench, plan, [...start, w1], saved);
    expect(fit).toBe(saved);
    const intro = startProgress();
    expect(fitProgress(bench, plan, start, intro)).toBe(intro);
  });
});
