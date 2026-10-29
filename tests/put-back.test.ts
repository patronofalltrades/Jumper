import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { createBoardStore } from "@/lib/game/board-store";
import { needsAck, startProgress, step, type Plan, type Progress } from "@/lib/game/engine";
import { putBackParts } from "@/lib/game/put-back";

// "Put back the level {n} build" (issue #111): the ready-made parts of the earlier levels that are not on the board go back.

const bench = perchBench();
const boards = await loadBoards("perch");
const perch = loadProjects().find((p) => p.slug === "perch")!;
const planOf = (position: number): Plan => {
  const level = perch.levels.find((l) => l.position === position)!;
  return { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
};
const start3 = startBoard(boards, 3);
const without = (parts: Part[], ...ids: string[]) => parts.filter((p) => !ids.includes(p.id));
const ids = (parts: Part[]) => parts.map((p) => p.id);

describe("putBackParts: which ready-made parts go back", () => {
  it("gives nothing when all the ready-made parts are on the board", () => {
    expect(putBackParts(bench, start3, start3)).toEqual({ back: [], blocked: [] });
  });

  it("gives all the ready-made parts, in level order, for an empty board", () => {
    expect(putBackParts(bench, [], start3)).toEqual({ back: start3, blocked: [] });
  });

  it("gives only the missing parts, and keeps the parts of the learner", () => {
    const own: Part = { id: "w30", type: "wire", a: "B-a20", b: "B-a24", color: "#2F6FD6" };
    const board = [...without(start3, "w2", "led1"), own];
    expect(ids(putBackParts(bench, board, start3).back)).toEqual(["w2", "led1"]);
  });

  it("counts a part that the learner put back by hand in the same holes, with a new name, as on the board", () => {
    const w2 = start3.find((p) => p.id === "w2")!;
    const board = [...without(start3, "w2"), { ...w2, id: "w31" }];
    expect(putBackParts(bench, board, start3)).toEqual({ back: [], blocked: [] });
  });

  it("leaves out a part whose holes another part takes", () => {
    const led1 = start3.find((p) => p.id === "led1") as Extract<Part, { a: string }>;
    const other: Part = { id: "w30", type: "wire", a: led1.a, b: "B-a24", color: "#2F6FD6" };
    const result = putBackParts(bench, [...without(start3, "led1", "w1"), other], start3);
    expect(ids(result.back)).toEqual(["w1"]);
    expect(ids(result.blocked)).toEqual(["led1"]);
  });

  it("leaves out a part whose name a different part of the learner has", () => {
    const moved: Part = { id: "led1", type: "led", a: "B-b20", b: "B-b21" };
    const result = putBackParts(bench, [...without(start3, "led1"), moved], start3);
    expect(result.back).toEqual([]);
    expect(ids(result.blocked)).toEqual(["led1"]);
  });
});

/** Plays a level with the engine: start, "Got it" where a task needs it, then each part of the level. */
function play(position: number) {
  const plan = planOf(position);
  let board = startBoard(boards, position);
  let progress: Progress = step(bench, plan, startProgress(), { type: "start" }).progress;
  const ack = () => {
    while (progress.phase === "task" && needsAck(plan.tasks[progress.index].target)) progress = step(bench, plan, progress, { type: "ack", parts: board }).progress;
  };
  ack();
  for (const part of boards.levels[position]) {
    progress = step(bench, plan, progress, { type: "change", before: board, after: [...board, part] }).progress;
    board = [...board, part];
    ack();
  }
  return { plan, board, progress };
}

describe("the engine and a put-back change", () => {
  it("gives no Mistake for ready-made parts that do no task of the level", () => {
    const plan = planOf(2);
    const start = startBoard(boards, 2);
    const progress = step(bench, plan, startProgress(), { type: "start" }).progress;
    const before = without(start, "w3");
    // By hand, the bridge wire of level 1 does no task of level 2, so it is a Mistake.
    expect(step(bench, plan, progress, { type: "change", before, after: start }).progress.phase).toBe("mistake");
    const next = step(bench, plan, progress, { type: "change", before, after: start, restore: true });
    expect(next.progress).toMatchObject({ phase: "task", mistakes: 0, mistake: null, xp: progress.xp, tasksDone: progress.tasksDone });
  });

  it("takes a finished level back to ready_to_check, with no new XP", () => {
    const { plan, board, progress } = play(2);
    expect(progress.phase).toBe("ready_to_check");
    const removed = step(bench, plan, progress, { type: "change", before: board, after: without(board, "w2") }).progress;
    expect(removed.phase).toBe("task");
    const back = step(bench, plan, removed, { type: "change", before: without(board, "w2"), after: board, restore: true }).progress;
    expect(back).toMatchObject({ phase: "ready_to_check", mistakes: 0, xp: progress.xp, tasksDone: progress.tasksDone });
  });
});

describe("board store: putBack", () => {
  const level3 = (parts: Part[]) => {
    const store = createBoardStore();
    store.getState().open("perch/3", { plan: planOf(3), parts });
    store.getState().start();
    return store;
  };

  it("puts the missing parts back as one step, with no Mistake and no XP, and one Undo takes them away", () => {
    const store = level3(without(start3, "w1", "w2", "led1"));
    const before = store.getState().progress;
    const result = store.getState().putBack(start3);
    expect(ids(result.back)).toEqual(["w1", "w2", "led1"]);
    expect(ids(store.getState().parts).sort()).toEqual(ids(start3).sort());
    expect(store.getState().progress).toMatchObject({ phase: "task", mistakes: 0, xp: before.xp, tasksDone: before.tasksDone });
    expect(store.getState().history).toHaveLength(1);
    store.getState().undo();
    expect(ids(store.getState().parts)).toEqual(ids(without(start3, "w1", "w2", "led1")));
    expect(store.getState().progress.mistakes).toBe(0);
  });

  it("changes nothing when no part is missing", () => {
    const store = level3(start3);
    expect(store.getState().putBack(start3)).toEqual({ back: [], blocked: [] });
    expect(store.getState().history).toEqual([]);
  });
});
