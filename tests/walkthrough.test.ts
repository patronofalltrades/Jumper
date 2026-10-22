import { describe, expect, it } from "vitest";
import boardsFile from "@/content/boards/perch.json";
import text from "@/content/ui/walkthrough.json";
import { perchBench } from "@/lib/circuit/bench";
import { startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { boardsSchema } from "@/lib/content/schema";
import { clipFrame, introClip, levelClip, type IntroScript } from "@/lib/game/walkthrough";

const bench = perchBench();
const boards = boardsSchema.parse(boardsFile);
const perch = loadProjects().find((p) => p.slug === "perch")!;
const endOf = (n: number) => text.end.replace("{n}", String(n));
const ids = (parts: { id: string }[]) => parts.map((p) => p.id);

describe("levelClip", () => {
  for (const level of perch.levels) {
    describe(`level ${level.position}`, () => {
      const clip = levelClip(bench, boards, level, endOf(level.position));
      const tasks = clip.steps.filter((s) => s.kind === "task");

      it("has one step for each task, in task order, with the instruction of the task as its caption", () => {
        expect(tasks.map((s) => s.task)).toEqual(level.tasks.map((_, i) => i));
        expect(tasks.map((s) => s.caption)).toEqual(level.tasks.map((t) => t.instruction));
      });

      it("ends on the finished board, with the end caption", () => {
        const last = clip.steps.at(-1)!;
        expect(last).toMatchObject({ kind: "end", caption: endOf(level.position), before: clip.order.length, after: clip.order.length });
        expect(clip.steps.filter((s) => s.kind === "end")).toHaveLength(1);
      });

      it("starts on the board of the levels before it, and adds the parts of this level on top, in order", () => {
        const base = startBoard(boards, level.position);
        expect(ids(clip.order)).toEqual(ids([...base, ...boards.levels[level.position]]));
        expect(clip.steps[0].before).toBe(base.length);
        for (const [i, s] of clip.steps.entries()) {
          expect(s.after).toBeGreaterThanOrEqual(s.before);
          if (i > 0) expect(s.before).toBe(clip.steps[i - 1].after);
        }
        expect(tasks.at(-1)!.after).toBe(clip.order.length);
      });

      it("shows each task before its part comes in: the engine is on that task", () => {
        for (const s of tasks) expect(s.progress).toMatchObject({ phase: "task", index: s.task });
      });
    });
  }

  it("level 1: the parts that are always on the bench add nothing, then one wire for each wire task", () => {
    const clip = levelClip(bench, boards, perch.levels[0], endOf(1));
    expect(clip.steps.slice(0, 3).map((s) => s.after - s.before)).toEqual([0, 0, 0]);
    expect(clip.steps.slice(3, 7).map((s) => ids(clip.order.slice(s.before, s.after)))).toEqual([["w1"], ["w2"], ["w3"], ["w4"]]);
  });

  it("level 2: the light sits in the line of the resistor, so the task 'resistor to light' adds no part", () => {
    const clip = levelClip(bench, boards, perch.levels[1], endOf(2));
    const added = clip.steps.filter((s) => s.kind === "task").map((s) => ids(clip.order.slice(s.before, s.after)));
    expect(added).toEqual([["btn1"], ["w5"], ["w6"], ["r1"], ["led1"], ["w7"], [], ["w8"]]);
  });
});

describe("introClip", () => {
  const script = text.intro as IntroScript;
  const level = perch.levels[script.level - 1];
  const clip = introClip(bench, boards, level, script);

  it("shows the game loop in order: place a part, wire it, read the pop-up, press Check, the end", () => {
    expect(clip.steps.map((s) => s.kind)).toEqual(["task", "task", "popup", "check", "end"]);
    expect(clip.steps.map((s) => s.caption)).toEqual([...script.steps.map((s) => s.caption), script.end]);
  });

  it("places the button, then connects its first wire, then shows the pop-up of that wire", () => {
    const [place, wire, popup] = clip.steps;
    expect(ids(clip.order.slice(place.before, place.after))).toEqual(["btn1"]);
    expect(ids(clip.order.slice(wire.before, wire.after))).toEqual(["w5"]);
    expect(popup.popup).toBe(level.tasks[1].popup_why);
    expect(popup.after).toBe(popup.before);
  });

  it("presses Check on the finished level board", () => {
    const check = clip.steps[3];
    expect(check.after).toBe(clip.order.length);
    expect(ids(clip.order)).toEqual(ids([...startBoard(boards, 2), ...boards.levels[2]]));
  });
});

describe("clipFrame", () => {
  const step = { kind: "task" as const, task: 3, caption: "", before: 4, after: 5, progress: null };

  it("first shows where the part goes, then shows it in place", () => {
    expect(clipFrame(step, "cue", false)).toEqual({ count: 4, cue: true });
    expect(clipFrame(step, "done", false)).toEqual({ count: 5, cue: false });
  });

  it("with reduced motion, shows one still picture of each step: the part in place", () => {
    expect(clipFrame(step, "cue", true)).toEqual({ count: 5, cue: false });
  });
});

describe("content/ui/walkthrough.json", () => {
  it("has the controls of the clip", () => {
    for (const key of ["play", "pause", "replay", "skip", "next", "back", "small", "big", "close"]) {
      expect(text.controls[key as keyof typeof text.controls]).not.toBe("");
    }
  });
});
