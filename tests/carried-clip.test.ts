import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { checkLevel, joinRules } from "@/lib/circuit/check";
import { checkModule, checkPlacement, isModule, type Part } from "@/lib/circuit/parts";
import { loadBoards, startBoard, startLevels } from "@/lib/content/boards";
import { loadLevelClips } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { demoBoard, demoFrames } from "@/lib/game/build-demo";
import { carriedClip, type Clip } from "@/lib/game/walkthrough";

// Issue #110: with `carry`, the level clip starts from the learner's own board, with parts maybe in other holes.

const bench = perchBench();
const perch = loadProjects().find((p) => p.slug === "perch")!;
const ids = (parts: { id: string }[]) => parts.map((p) => p.id);

/**
 * The Perch board after level 2, with the light in other holes than the finished board: the resistor and the LED in
 * columns 12 to 14, where the amplifier of level 4 goes on the finished board.
 */
async function movedLight(position: number) {
  const moved: Record<string, Part> = {
    r1: { id: "r1", type: "resistor", a: "A-a12", b: "A-a14" },
    led1: { id: "led1", type: "led", a: "A-b14", b: "A-b13" },
    w7: { id: "w7", type: "wire", a: "A-f9", b: "A-c12" },
    w8: { id: "w8", type: "wire", a: "A-c13", b: "A-L-3" },
  };
  return startBoard(await loadBoards("perch"), position).map((p) => moved[p.id] ?? p);
}

/** A clip that the learner can follow: each new part has a good place on the board before it, and the end board passes Check. */
async function expectPlayable(clip: Clip, carried: Part[], position: number) {
  expect(clip.faded).toEqual(ids(carried));
  expect(clip.order.slice(0, carried.length)).toEqual(carried);
  expect(new Set(ids(clip.order)).size).toBe(clip.order.length);
  for (let i = carried.length; i < clip.order.length; i++) {
    const [board, p] = [clip.order.slice(0, i), clip.order[i]];
    const problem = isModule(p) ? checkModule(bench, board, p.type, p.at) : checkPlacement(bench, board, p.type, p.a, p.b);
    expect(problem, p.id).toBeNull();
  }
  const rules = joinRules(perch.levels, [...startLevels(await loadBoards("perch"), position), position]);
  expect(checkLevel(bench, clip.order, rules)).toEqual({ passed: true });
}

describe("carriedClip", async () => {
  const clips = await loadLevelClips("perch");

  it("gives the same clip when the carried board is the finished board of the levels before", async () => {
    const finished = clips.get(3)!;
    expect(carriedClip(bench, finished, startBoard(await loadBoards("perch"), 3))).toBe(finished);
  });

  it("level 3: starts on the learner's board, fades the learner's parts, and keeps the finished holes that are free", async () => {
    const finished = clips.get(3)!;
    const carried = await movedLight(3);
    const clip = carriedClip(bench, finished, carried)!;
    await expectPlayable(clip, carried, 3);
    expect(clip.order.slice(carried.length)).toEqual(finished.order.slice(finished.faded.length));
    expect(clip.steps.map((s) => [s.kind, s.task, s.caption])).toEqual(finished.steps.map((s) => [s.kind, s.task, s.caption]));
    expect(clip.video).toBe(finished.video);
  });

  it("level 4: the amplifier hole is taken by the learner's light, so the amplifier and its wires go in the holes of the guide", async () => {
    const finished = clips.get(4)!;
    const carried = await movedLight(4);
    const clip = carriedClip(bench, finished, carried)!;
    await expectPlayable(clip, carried, 4);
    const amp = clip.order.find((p) => p.id === "amp1")!;
    expect(isModule(amp) && amp.at).not.toBe("A-c11");
    expect(clip.steps.filter((s) => s.kind === "task").map((s) => s.caption)).toEqual(perch.levels[3].tasks.map((t) => t.instruction));
  });

  it("gives a new id to a part of the level that has the id of a part that the learner added", async () => {
    const finished = clips.get(3)!;
    const carried = [...(await movedLight(3)), { id: "w9", type: "wire" as const, a: "A-j40", b: "A-j45" }];
    const clip = carriedClip(bench, finished, carried)!;
    await expectPlayable(clip, carried, 3);
    expect(clip.order.filter((p) => p.id === "w9")).toHaveLength(1);
  });

  it("gives null when a part of the level has no good place, so the build page shows the finished clip", async () => {
    const finished = clips.get(4)!;
    // A wire in each column of breadboard A: no line of 5 is free for the amplifier.
    const full: Part[] = Array.from({ length: 30 }, (_, i) => ({ id: `x${i + 1}`, type: "wire", a: `A-a${i + 1}`, b: `A-f${i + 1}` }));
    expect(carriedClip(bench, finished, full)).toBeNull();
  });

  it("\"Build it for me\" builds the carried clip on the learner's board, in the same holes (issue #115)", async () => {
    const carried = await movedLight(4);
    const clip = carriedClip(bench, clips.get(4)!, carried)!;
    expect(demoBoard(clip, carried)).toEqual(clip.order);
    const frames = demoFrames(clip, carried, false, "");
    expect(frames[0].parts).toEqual(carried);
    expect(frames.at(-1)!.parts).toEqual(clip.order);
  });
});
