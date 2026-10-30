import { describe, expect, it } from "vitest";
import boardsFile from "@/content/boards/perch.json";
import text from "@/content/ui/walkthrough.json";
import { perchBench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { boardsSchema } from "@/lib/content/schema";
import { clearForDemo, demoFrames, showFrame } from "@/lib/game/build-demo";
import { createBoardStore } from "@/lib/game/board-store";
import { needsAck, startProgress, step, type Plan, type Progress } from "@/lib/game/engine";
import { levelClip } from "@/lib/game/walkthrough";

// "Build it for me" (issue #115): the board builds the level one task at a time, with the steps of the walkthrough clip.
// Then the board goes back to the start board of the level. The demo gives no XP, ticks no task and saves no board.

const bench = perchBench();
const boards = boardsSchema.parse(boardsFile);
const perch = loadProjects().find((p) => p.slug === "perch")!;
const END = "Now you build it.";
const ids = (parts: { id: string }[]) => parts.map((p) => p.id);
const clipOf = (position: number) => {
  const level = perch.levels.find((l) => l.position === position)!;
  return { level, clip: levelClip(bench, boards, level, text.end, text.start) };
};

/** Plays the level with its ready-made parts, as a learner who did every task, and gives the board and the progress. */
function finished(plan: Plan, base: Part[], own: Part[]) {
  let progress: Progress = step(bench, plan, startProgress(), { type: "start" }).progress;
  let parts = base;
  let next = 0;
  while (progress.phase === "task") {
    if (needsAck(plan.tasks[progress.index].target)) progress = step(bench, plan, progress, { type: "ack", parts }).progress;
    else {
      const after = [...parts, own[next++]];
      progress = step(bench, plan, progress, { type: "change", before: parts, after }).progress;
      parts = after;
    }
  }
  return { parts, progress };
}

describe("demoFrames", () => {
  for (const level of perch.levels) {
    describe(`level ${level.position}`, () => {
      const { clip } = clipOf(level.position);
      const base = startBoard(boards, level.position);
      const own = boards.levels[level.position];
      const frames = demoFrames(clip, base, false, END);
      const tasks = frames.filter((f) => f.task !== null);

      it("shows each task in task order, with the instruction of the task as its caption", () => {
        const order = [...new Set(tasks.map((f) => f.task))];
        expect(order).toEqual(level.tasks.map((_, i) => i));
        expect(order.map((i) => tasks.find((f) => f.task === i)!.caption)).toEqual(level.tasks.map((t) => t.instruction));
      });

      it("starts on the start board and adds the parts of the level one step at a time, in order", () => {
        expect(ids(frames[0].parts)).toEqual(ids(base));
        for (const [i, f] of frames.entries()) {
          if (i > 0) expect(ids(f.parts.slice(0, frames[i - 1].parts.length))).toEqual(ids(frames[i - 1].parts));
          expect(f.parts.length - (i > 0 ? frames[i - 1].parts.length : base.length)).toBeLessThanOrEqual(1);
          expect(f.wait).toBeGreaterThan(0);
        }
      });

      it("first shows where the part goes (the cue), then the part in place", () => {
        for (const t of level.tasks.keys()) {
          const mine = tasks.filter((f) => f.task === t);
          expect(mine[0].progress).toMatchObject({ phase: "task", index: t });
          expect(mine.at(-1)!.progress).toBeNull();
        }
      });

      it("ends on the full build of the level, with the end caption", () => {
        const last = frames.at(-1)!;
        expect(ids(last.parts)).toEqual(ids([...base, ...own]));
        expect(last).toMatchObject({ task: null, caption: END, progress: null });
      });

      it("with reduced motion, shows one still picture for each step: no cue", () => {
        const still = demoFrames(clip, base, true, END);
        expect(still).toHaveLength(clip.steps.length);
        for (const f of still) expect(f.progress).toBeNull();
        expect(still.filter((f) => f.task !== null).map((f) => f.caption)).toEqual(clip.steps.filter((s) => s.kind === "task").map((s) => s.caption));
        expect(ids(still.at(-1)!.parts)).toEqual(ids([...base, ...own]));
      });
    });
  }

  it("builds on the learner's own start board, not the ready-made one", () => {
    const { clip } = clipOf(2);
    // The learner carried their own level 1 board, with a wire in a different place and one more wire than the ready-made board.
    const mine: Part[] = [
      { id: "w1", type: "wire", a: "B-e5", b: "A-L+2", color: "#D63A2F" },
      { id: "w2", type: "wire", a: "A-f5", b: "A-L-1", color: "#25292D" },
      { id: "w3", type: "wire", a: "A-L+25", b: "B-R+25", color: "#D63A2F" },
      { id: "w4", type: "wire", a: "A-L-25", b: "B-R-25", color: "#25292D" },
      { id: "w5", type: "wire", a: "A-L+20", b: "B-R+20", color: "#2F6FD6" },
    ];
    const frames = demoFrames(clip, mine, false, END);
    const at = (parts: Part[]) => parts.map((p) => p.type === "wire" && p.a);
    expect(at(frames[0].parts)).toEqual(at(mine));
    const last = frames.at(-1)!.parts;
    // Each part has its own id: the learner's w5 is not the same part as the w5 of level 2.
    expect(new Set(ids(last)).size).toBe(last.length);
    expect(at(last.slice(0, mine.length))).toEqual(at(mine));
    expect(last.slice(mine.length)).toEqual(boards.levels[2]);
  });
});

describe("Build it for me on the board of the learner", () => {
  for (const position of [1, 2, 3]) {
    it(`level ${position}: clears the parts of the learner, plays the build on its own board, and keeps progress, XP and the saved board`, () => {
      const { level, clip } = clipOf(position);
      const base = startBoard(boards, position);
      const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: [] };
      const done = finished(plan, base, boards.levels[position]);
      const store = createBoardStore(bench);
      store.getState().open(`u:perch/${position}`, { bench, plan, parts: done.parts, base, progress: { ...done.progress, mistakes: 2, fails: 1 } });
      const before = store.getState();

      clearForDemo(store);
      const cleared = store.getState();
      expect(cleared.parts).toEqual(base);
      expect(cleared.history.at(-1)).toEqual(before.parts);
      for (const key of ["reached", "tasksDone", "mistakes", "xp", "fails"] as const) expect(cleared.progress[key]).toBe(before.progress[key]);
      // The tasks go back to the first task that the board does not do, as when the learner removes parts.
      expect(cleared.progress.phase).toBe("task");
      expect(cleared.done).toBeNull();

      // The demo plays in its own store. The board of the learner gets no change, so the autosave and the engine see nothing.
      let changes = 0;
      const stop = store.subscribe(() => changes++);
      const demo = createBoardStore(bench);
      const frames = demoFrames(clip, cleared.base, false, END);
      for (const f of frames) {
        showFrame(demo, f, clip, bench, cleared.base);
        expect(demo.getState().parts).toEqual(f.parts);
        expect(demo.getState().readOnly).toBe(true);
      }
      stop();
      expect(changes).toBe(0);
      expect(store.getState()).toBe(cleared);
      expect(demo.getState().progress.xp).toBe(0);

      // Undo takes the clear back, as one step.
      store.getState().undo();
      expect(store.getState().parts).toEqual(before.parts);
      expect(store.getState().progress.xp).toBe(before.progress.xp);
      expect(store.getState().progress.tasksDone).toBe(before.progress.tasksDone);
    });
  }

  it("a board that has only its start parts stays the same, and the progress does not change", () => {
    const { level } = clipOf(2);
    const base = startBoard(boards, 2);
    const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: [] };
    const store = createBoardStore(bench);
    store.getState().open("u:perch/2", { bench, plan, parts: base });
    store.getState().start();
    const before = store.getState();
    clearForDemo(store);
    expect(store.getState().parts).toEqual(before.parts);
    expect(store.getState().progress).toEqual(before.progress);
  });
});
