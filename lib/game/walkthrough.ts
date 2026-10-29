import { holeDistance, type Bench, type BenchSpec } from "@/lib/circuit/bench";
import { checkModule, checkPlacement, isModule, nextPartId, partPins, type ModulePart, type Part } from "@/lib/circuit/parts";
import { startBoard } from "@/lib/content/boards";
import type { Boards } from "@/lib/content/schema";
import { needsAck, startProgress, step, taskSpot, type Plan, type Progress, type Target } from "./engine";

// The walkthrough clips (issue #48): a 3D replay of a level. The board adds the parts of the level one at a time, from
// content/boards/<project>.json, in task order. Each step shows the instruction of its task as a caption.
// A clip after level 1 starts with the board of the levels before, faded, so the learner sees which parts are new (issue #103).
// When the learner carries their own board into the level, the clip starts from that board (issue #110).

/**
 * One step of a clip. The board shows the first `before` parts of the clip's `order`, then the first `after` parts.
 * `progress` is the engine on the task of the step, so the scene glows where the part goes.
 */
export type ClipStep = {
  kind: "board" | "task" | "popup" | "check" | "end";
  /** The index of the task in its level. */
  task: number | null;
  caption: string;
  before: number;
  after: number;
  progress: Progress | null;
  /** The "what happened" text of the task, for a pop-up step. */
  popup?: string;
};

/**
 * All the parts of the clip, in the order they come in: the board of the levels before, then the parts of the level.
 * `video` is the id of its recorded video in content/videos.json (issue #49), if it has one. `bench` is the bench of
 * the project (content/benches/), so the clip window draws the right board; without it, the window uses the Perch bench.
 */
export type Clip = { order: Part[]; plan: Plan; steps: ClipStep[]; faded: string[]; video?: string; bench?: BenchSpec };

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
 * After level 1, the first step shows the board of the levels before, with the caption `start`. Those parts are `faded`.
 */
export function levelClip(bench: Bench, boards: Boards, level: ClipLevel, end: string, start: string): Clip {
  const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: [] };
  const text = { tasks: level.tasks.map((t) => t.instruction), start, end };
  return playClip(bench, plan, startBoard(boards, level.position), boards.levels[level.position] ?? [], text, (part) => [part], `Level ${level.position}`);
}

/**
 * The level clip on the learner's own board (issue #110): with `carry`, the level starts with the board that the learner
 * made in the level before, maybe with parts in other holes. The faded parts are then the learner's parts. A resistor or
 * an LED goes in the holes of the build-mode guide (issue #101). Another part goes in its holes on the finished board, if
 * they are free and the task accepts them; else in the holes that the guide tells the learner to tap.
 * Gives `clip` when the carried board is the finished board of the levels before, and null when a part has no good place.
 */
export function carriedClip(bench: Bench, clip: Clip, carried: Part[]): Clip | null {
  const base = clip.order.slice(0, clip.faded.length);
  if (JSON.stringify(carried) === JSON.stringify(base)) return clip;
  const caption = (kind: ClipStep["kind"], task: number | null = null) => clip.steps.find((s) => s.kind === kind && s.task === task)?.caption ?? "";
  const text = { tasks: clip.plan.tasks.map((_, i) => caption("task", i)), start: caption("board"), end: caption("end") };
  const choices = (part: Part, board: Part[], at: Progress): Part[] => {
    // A part of the level can have the id of a part that the learner added: then it gets the next free id.
    const own = board.some((p) => p.id === part.id) ? { ...part, id: nextPartId(board, part.type) } : part;
    const spot = taskSpot(bench, board, clip.plan.tasks[at.index].target, at.swaps, clip.order);
    if (isModule(own)) return moduleHoles(bench, board, own, spot.holes).map((h) => ({ ...own, at: h }));
    const guided = spot.taps.length === 2 ? [{ ...own, a: spot.taps[0], b: spot.taps[1] }] : [];
    if (own.type === "resistor" || own.type === "led") return guided;
    return checkPlacement(bench, board, own.type, own.a, own.b) ? guided : [own, ...guided];
  };
  try {
    return { ...playClip(bench, clip.plan, carried, clip.order.slice(base.length), text, choices, "Carried board"), video: clip.video, bench: clip.bench };
  } catch {
    return null;
  }
}

/**
 * The holes for pin 1 of module `part` in the clip: its hole on the finished board first, then the `holes` of the guide
 * from the nearest. Only holes where each pin of the module is in a line of 5 with no board pin and no other part, so
 * the module does not join the learner's parts.
 */
function moduleHoles(bench: Bench, board: Part[], part: ModulePart, holes: string[]): string[] {
  const used = new Set([...bench.pins.map((p) => p.hole), ...board.flatMap((p) => partPins(bench, p).map((pin) => pin.hole))].flatMap((h) => bench.byId.get(h)?.strip ?? []));
  const open = (at: string) =>
    !checkModule(bench, board, part.type, at) && partPins(bench, { ...part, at }).every((pin) => !used.has(bench.byId.get(pin.hole)?.strip ?? ""));
  const goal = bench.byId.get(part.at);
  const far = (h: string) => (goal ? holeDistance(goal, bench.byId.get(h)!) : 0);
  return [part.at, ...holes.filter((h) => h !== part.at).sort((x, y) => far(x) - far(y))].filter(open);
}

/**
 * Plays a level on `base` and gives its clip. Each part of `own` goes in the first of its `choices` that the task
 * accepts. `label` starts the error text when a part has no good place.
 */
function playClip(
  bench: Bench,
  plan: Plan,
  base: Part[],
  own: Part[],
  text: { tasks: string[]; start: string; end: string },
  choices: (part: Part, board: Part[], at: Progress) => Part[],
  label: string,
): Clip {
  const order = [...base];
  const steps: ClipStep[] = base.length ? [{ kind: "board", task: null, caption: text.start, before: base.length, after: base.length, progress: null }] : [];
  let progress = step(bench, plan, startProgress(), { type: "start" }).progress;
  let next = 0;

  while (progress.phase === "task") {
    const at = progress;
    const parts = [...order];
    if (needsAck(plan.tasks[at.index].target)) {
      progress = step(bench, plan, at, { type: "ack", parts }).progress;
    } else {
      if (next >= own.length) throw new Error(`${label}: no part for task ${at.index + 1}`);
      const part = own[next++];
      const placed = choices(part, parts, at)
        .map((p) => ({ p, progress: step(bench, plan, at, { type: "change", before: parts, after: [...parts, p] }).progress }))
        .find((c) => c.progress.phase !== "mistake");
      if (!placed) throw new Error(`${label}: ${part.id} is not correct for task ${at.index + 1}`);
      order.push(placed.p);
      progress = placed.progress;
    }
    // The first task gets the part. The tasks that the part also finished come after it, with no part.
    for (let i = at.index; i < progress.index; i++) {
      const before = i === at.index ? parts.length : order.length;
      steps.push({ kind: "task", task: i, caption: text.tasks[i], before, after: order.length, progress: { ...at, index: i } });
    }
  }
  if (next < own.length) throw new Error(`${label}: ${own.length - next} parts are not in a task`);
  steps.push({ kind: "end", task: null, caption: text.end, before: order.length, after: order.length, progress: null });
  return { order, plan, steps, faded: base.map((p) => p.id) };
}

/** The intro clip: a few steps of one level to show the game loop, with the captions of the script. */
export function introClip(bench: Bench, boards: Boards, level: ClipLevel, script: IntroScript): Clip {
  const { order, plan, steps: all, faded } = levelClip(bench, boards, level, script.end, "");
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
  return { order, plan, steps, faded };
}

/**
 * What the board shows in a step. First the cue: the board before the part, with the place that glows. Then the part
 * in place. With reduced motion, each step is one still picture: the part in place, and no blink.
 */
export function clipFrame(s: Pick<ClipStep, "before" | "after">, phase: "cue" | "done", reducedMotion: boolean) {
  const cue = phase === "cue" && !reducedMotion;
  return { count: cue ? s.before : s.after, cue };
}
