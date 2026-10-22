import type { Bench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { startBoard } from "@/lib/content/boards";
import type { Boards } from "@/lib/content/schema";
import { needsAck, startProgress, step, type Plan, type Progress, type Target } from "./engine";

// The walkthrough clips (issue #48): a 3D replay of a level. The board adds the parts of the level one at a time, from
// content/boards/<project>.json, in task order. Each step shows the instruction of its task as a caption.

/**
 * One step of a clip. The board shows the first `before` parts of the clip's `order`, then the first `after` parts.
 * `progress` is the engine on the task of the step, so the scene glows where the part goes.
 */
export type ClipStep = {
  kind: "task" | "popup" | "check" | "end";
  /** The index of the task in its level. */
  task: number | null;
  caption: string;
  before: number;
  after: number;
  progress: Progress | null;
  /** The "what happened" text of the task, for a pop-up step. */
  popup?: string;
};

/** All the parts of the clip, in the order they come in: the board of the levels before, then the parts of the level. */
export type Clip = { order: Part[]; plan: Plan; steps: ClipStep[] };

export type ClipLevel = { position: number; tasks: { instruction: string; popup_why: string; target: Target; xp: number }[] };

/** The intro clip of the landing page, from content/ui/walkthrough.json. `task` is a task position (1, 2, …). */
export type IntroScript = {
  level: number;
  steps: ({ kind: "task" | "popup"; task: number; caption: string } | { kind: "check"; caption: string })[];
  end: string;
};

/**
 * The clip of a level. The engine plays the level: a part that is always on the bench gets "Got it", and the other
 * tasks get the next part of the level. A part that also finishes the tasks after it gives those tasks a step with no part.
 */
export function levelClip(bench: Bench, boards: Boards, level: ClipLevel, end: string): Clip {
  const base = startBoard(boards, level.position);
  const own = boards.levels[level.position] ?? [];
  const order = [...base, ...own];
  const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: [] };
  const steps: ClipStep[] = [];
  let progress = step(bench, plan, startProgress(), { type: "start" }).progress;
  let count = base.length;
  let next = 0;

  while (progress.phase === "task") {
    const at = progress;
    const parts = order.slice(0, count);
    if (needsAck(plan.tasks[at.index].target)) {
      progress = step(bench, plan, at, { type: "ack", parts }).progress;
    } else {
      if (next >= own.length) throw new Error(`Level ${level.position}: no part for task ${at.index + 1}`);
      count = base.length + ++next;
      progress = step(bench, plan, at, { type: "change", before: parts, after: order.slice(0, count) }).progress;
      if (progress.phase === "mistake") throw new Error(`Level ${level.position}: ${own[next - 1].id} is not correct for task ${at.index + 1}`);
    }
    // The first task gets the part. The tasks that the part also finished come after it, with no part.
    for (let i = at.index; i < progress.index; i++) {
      const before = i === at.index ? parts.length : count;
      steps.push({ kind: "task", task: i, caption: level.tasks[i].instruction, before, after: count, progress: { ...at, index: i } });
    }
  }
  if (next < own.length) throw new Error(`Level ${level.position}: ${own.length - next} parts are not in a task`);
  steps.push({ kind: "end", task: null, caption: end, before: count, after: count, progress: null });
  return { order, plan, steps };
}

/** The intro clip: a few steps of one level to show the game loop, with the captions of the script. */
export function introClip(bench: Bench, boards: Boards, level: ClipLevel, script: IntroScript): Clip {
  const { order, plan, steps: all } = levelClip(bench, boards, level, script.end);
  let count = startBoard(boards, level.position).length;
  const steps = script.steps.map((s): ClipStep => {
    const before = count;
    if (s.kind === "check") {
      count = order.length;
      return { kind: "check", task: null, caption: s.caption, before, after: count, progress: null };
    }
    const task = all.find((t) => t.task === s.task - 1)!;
    if (s.kind === "popup") return { kind: "popup", task: task.task, caption: s.caption, before, after: before, progress: null, popup: level.tasks[s.task - 1].popup_why };
    count = task.after;
    return { ...task, caption: s.caption, before };
  });
  steps.push({ kind: "end", task: null, caption: script.end, before: count, after: count, progress: null });
  return { order, plan, steps };
}

/**
 * What the board shows in a step. First the cue: the board before the part, with the place that glows. Then the part
 * in place. With reduced motion, each step is one still picture: the part in place, and no blink.
 */
export function clipFrame(s: Pick<ClipStep, "before" | "after">, phase: "cue" | "done", reducedMotion: boolean) {
  const cue = phase === "cue" && !reducedMotion;
  return { count: cue ? s.before : s.after, cue };
}
