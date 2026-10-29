import { breadboardOutline, type Bench } from "@/lib/circuit/bench";
import { isModuleType } from "@/lib/circuit/modules";
import { ledSpot } from "@/lib/circuit/led-spot";
import { buildNets, endpointHole, netHoles, type Nets } from "@/lib/circuit/nets";
import { checkHole, checkModule, isTerminal, LEG_NAMES, partPins, terminalAt, type LegType, type Part, type PartType } from "@/lib/circuit/parts";

// The build-mode task engine (TRD 6.1): a small state machine. It reads the tasks and the forbid rules of a level, and
// the parts on the bench. It does not know React, the 3D scene or the database.
//
//   intro → task ⇄ mistake
//   task → task (next task) → … → ready_to_check
// The engine reads the board as it is now. A part that goes takes the learner back to the first task that the board
// does not do (ready_to_check → task); a part that comes back is not a mistake when it does such a task (issue #63).
// A correct part that does a task after the task of now snaps in quietly; the task finishes when the learner gets to it (issue #72).
// In ready_to_check the learner presses Check (lib/circuit/check.ts). A fail costs a heart; a pass ends the level.

export type Connection = { a: string; b: string };
/** `place_message`: a reversed_led text with the exact holes for the LED ({long_row}, {long_column}…), filled in by the engine. */
export type Forbid = Connection & { code: string; message: string; place_message?: string };
export type Target = ({ kind: "wire" } & Connection) | { kind: "place"; part: string; id: string; zone: string };
export type PlanTask = { target: Target; xp: number };
/** What the engine needs from a level: its tasks in order, and its forbid rules. */
export type Plan = { tasks: PlanTask[]; forbid: Forbid[] };

export type Phase = "intro" | "task" | "mistake" | "ready_to_check";

/** A wrong change. `code` is a forbid rule code, or "wrong_wire", "wrong_part" or "wrong_place". */
export type Mistake = { code: string; message?: string; parts: string[] };

export type Progress = {
  phase: Phase;
  /** The task to do now: the first task that the board does not do, or `reached`. Equal to the task count when all tasks are done. */
  index: number;
  /** The highest task index that the learner got to. The tasks below it were done once; tasksDone and xp count them once. */
  reached: number;
  tasksDone: number;
  mistakes: number;
  xp: number;
  mistake: Mistake | null;
  /** Parts with two equal sides (a resistor, a button) whose sides "1" and "2" the learner used the other way round. */
  swaps: string[];
  /** Failed level Checks in this session. They set the hearts (lib/game/hearts.ts). */
  fails: number;
};

export type EngineEvent =
  | { type: "start" }
  /** "Got it" on a task for a part that is already on the bench (a breadboard, the ESP32-S3, the Uno). */
  | { type: "ack"; parts: Part[] }
  /** "Try again" on a Mistake pop-up. */
  | { type: "dismiss" }
  /** "Redo this step" on a failed Check: the task `task` opens again (lib/game/fail-task.ts). */
  | { type: "redo"; task: number }
  | { type: "change"; before: Part[]; after: Part[] };

/** A correct change snaps in. A wrong one buzzes. */
export type Effect = "snap" | "buzz" | null;

export const startProgress = (): Progress => ({ phase: "intro", index: 0, reached: 0, tasksDone: 0, mistakes: 0, xp: 0, mistake: null, swaps: [], fails: 0 });

const LEG_TYPES = Object.keys(LEG_NAMES) as LegType[];

/**
 * The tool that puts the part of a place task on the bench, from its content name: "inmp441" → "inmp441",
 * "resistor-220" → "resistor". Null for a part that is always on the bench, such as a breadboard or the main board.
 */
export function toolFor(part: string): PartType | null {
  if (isModuleType(part)) return part;
  const base = part.split("-")[0];
  return LEG_TYPES.includes(base as LegType) ? (base as LegType) : null;
}

/** The tool for a task: the part to place, or the wire. Null for a part that is always on the bench. */
export const taskTool = (target: Target): PartType | null => (target.kind === "wire" ? "wire" : toolFor(target.part));

/** True for a task that the learner finishes with "Got it", because its part is always on the bench. */
export const needsAck = (target: Target) => target.kind === "place" && !toolFor(target.part);

/** The two sides of a button or a resistor are the same. The learner can use either side as "1". */
const SYMMETRIC: PartType[] = ["resistor", "pushbutton"];

function resolve(endpoint: string, swaps: string[]) {
  const [owner, pin] = endpoint.split(".");
  if (!swaps.includes(owner) || (pin !== "1" && pin !== "2")) return endpoint;
  return `${owner}.${pin === "1" ? "2" : "1"}`;
}

function linked(bench: Bench, parts: Part[], nets: Nets, c: Connection, swaps: string[]) {
  const a = endpointHole(bench, parts, resolve(c.a, swaps));
  const b = endpointHole(bench, parts, resolve(c.b, swaps));
  return a !== null && b !== null && nets.get(a) === nets.get(b);
}

/**
 * The connections that a place task makes, when its zone names endpoints: the speaker in "amp1.OUT+,amp1.OUT-" puts
 * its + lead in amp1.OUT+ and its − lead in amp1.OUT−.
 */
export function placeConnections(target: Target): Connection[] {
  if (target.kind !== "place" || !target.zone.includes(".")) return [];
  const legs = LEG_NAMES[toolFor(target.part) as LegType];
  return target.zone.split(",").map((b, i) => ({ a: `${target.id}.${legs[i]}`, b }));
}

/** The breadboard of a zone: "bbA", "bbA-center-gap", "beside-bbA" → "A". Null for a zone that is not one board. */
function zoneBoard(zone: string): string | null {
  return /bb([A-Z])/.exec(zone)?.[1] ?? null;
}

/**
 * True when an LED of a place task is the wrong way round (issue #102). The wire tasks of the level tell where each leg
 * goes: "r1.2 to led1.anode" says that the short leg (−) must not touch the resistor (either leg: its side is not fixed
 * yet), and "led1.cathode to esp.GND" says that the long leg (+) must not touch ground.
 */
function reversedLed(bench: Bench, parts: Part[], nets: Nets, plan: Plan, id: string) {
  const other: Record<string, string> = { [`${id}.anode`]: `${id}.cathode`, [`${id}.cathode`]: `${id}.anode` };
  return plan.tasks.some(({ target: t }) => {
    if (t.kind !== "wire") return false;
    return [
      [t.a, t.b],
      [t.b, t.a],
    ].some(([leg, end]) => {
      if (!other[leg]) return false;
      const [owner, pin] = end.split(".");
      const symmetric = (pin === "1" || pin === "2") && parts.some((p) => p.id === owner && SYMMETRIC.includes(p.type));
      return (symmetric ? [`${owner}.1`, `${owner}.2`] : [end]).some((e) => linked(bench, parts, nets, { a: other[leg], b: e }, []));
    });
  });
}

/**
 * The reversed_led text of the level for the LED `id`. When the level has a `place_message` and the board has a good place
 * (lib/circuit/led-spot.ts), the text names the exact holes: the long leg (+) next to the free leg of the resistor of the
 * "r1.2 to led1.anode" task, and the short leg (−) in the next column. Else the plain `message`.
 */
function reversedText(bench: Bench, parts: Part[], plan: Plan, id: string) {
  const rule = plan.forbid.find((f) => f.code === "reversed_led");
  const resistor = plan.tasks
    .flatMap(({ target: t }) => (t.kind === "wire" ? [[t.a, t.b], [t.b, t.a]] : []))
    .find(([leg, end]) => leg === `${id}.anode` && parts.some((p) => p.id === end.split(".")[0] && p.type === "resistor"))?.[1]
    .split(".")[0];
  const spot = rule?.place_message && resistor ? ledSpot(bench, parts, resistor, id) : null;
  if (!rule?.place_message || !spot) return rule?.message;
  const values: Record<string, string | number> = {
    board: spot.long.board,
    resistor_row: spot.resistor.row,
    resistor_column: spot.resistor.n,
    long_row: spot.long.row,
    long_column: spot.long.n,
    short_row: spot.short.row,
    short_column: spot.short.n,
  };
  return rule.place_message.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

type TaskState = { done: true; swaps: string[] } | { done: false; wrongPlace: boolean };

/**
 * Is this task done on this bench? For a wire task, it can choose which side of a button or resistor to use.
 * The side of a part is fixed by the tasks before `locked` (default: this task). An early part passes `reached`, so the
 * tasks that the learner did not reach do not fix a side yet.
 */
function taskState(bench: Bench, parts: Part[], nets: Nets, plan: Plan, index: number, swaps: string[], locked = index): TaskState {
  const target = plan.tasks[index].target;

  if (target.kind === "wire") {
    // A side choice is free until an earlier wire task used the part.
    const used = new Set(plan.tasks.slice(0, locked).flatMap((t) => (t.target.kind === "wire" ? [t.target.a, t.target.b] : [])).map((e) => e.split(".")[0]));
    const free = [target.a, target.b]
      .map((e) => e.split(".")[0])
      .filter((owner) => !used.has(owner) && parts.some((p) => p.id === owner && SYMMETRIC.includes(p.type)));
    let options = [swaps];
    for (const owner of free) options = options.flatMap((s) => [s, s.includes(owner) ? s.filter((o) => o !== owner) : [...s, owner]]);
    const match = options.find((s) => linked(bench, parts, nets, target, s));
    return match ? { done: true, swaps: match } : { done: false, wrongPlace: false };
  }

  const part = parts.find((p) => p.id === target.id && p.type === toolFor(target.part));
  if (!part) return { done: false, wrongPlace: false };
  const board = zoneBoard(target.zone);
  const pins = partPins(bench, part);
  const ok = target.zone.includes(".")
    ? placeConnections(target).every((c, i) => pins[i]?.hole === endpointHole(bench, parts, c.b))
    : !board || pins.every((p) => isTerminal(p.hole) || bench.byId.get(p.hole)!.board === board);
  const turned = part.type === "led" && reversedLed(bench, parts, nets, plan, part.id);
  return ok && !turned ? { done: true, swaps } : { done: false, wrongPlace: true };
}

/**
 * The tasks below `reached` that the parts do now, and the side choices that go with them. A task that needs only
 * "Got it" stays done. The tasks from `reached` on are not done: the learner did not get to them.
 */
function doneTasks(bench: Bench, plan: Plan, parts: Part[], reached: number, swaps: string[]) {
  const nets = buildNets(bench, parts);
  const done = plan.tasks.map((task, i) => {
    if (i >= reached) return false;
    if (needsAck(task.target)) return true;
    const state = taskState(bench, parts, nets, plan, i, swaps);
    if (state.done) swaps = state.swaps;
    return state.done;
  });
  return { done, swaps, gap: done.findIndex((d, i) => i < reached && !d) };
}

/** Finishes the task at `progress.reached` for the first time, and the tasks after it that the bench already does. */
function advance(bench: Bench, plan: Plan, parts: Part[], progress: Progress, swaps: string[]): Progress {
  const nets = buildNets(bench, parts);
  let { reached: index, tasksDone, xp } = progress;
  for (;;) {
    tasksDone += 1;
    xp += plan.tasks[index].xp;
    index += 1;
    if (index >= plan.tasks.length || needsAck(plan.tasks[index].target)) break;
    const next = taskState(bench, parts, nets, plan, index, swaps);
    if (!next.done) break;
    swaps = next.swaps;
  }
  const phase = index >= plan.tasks.length ? "ready_to_check" : "task";
  return { ...progress, phase, index, reached: index, tasksDone, xp, swaps, mistake: null };
}

const ids = (parts: Part[]) => new Set(parts.map((p) => p.id));

/** The next state of the engine after an event, and the sound and flash that go with it. */
export function step(bench: Bench, plan: Plan, progress: Progress, event: EngineEvent): { progress: Progress; effect: Effect } {
  const same = { progress, effect: null };
  const active = progress.phase === "task" || progress.phase === "mistake";

  switch (event.type) {
    case "start":
      return progress.phase === "intro" ? { progress: { ...progress, phase: plan.tasks.length ? "task" : "ready_to_check" }, effect: null } : same;

    case "ack":
      if (!active || progress.index !== progress.reached || !needsAck(plan.tasks[progress.index].target)) return same;
      return { progress: advance(bench, plan, event.parts, progress, progress.swaps), effect: "snap" };

    case "dismiss":
      return progress.phase === "mistake" ? { progress: { ...progress, phase: "task", mistake: null }, effect: null } : same;

    // The task opens again from ready_to_check. Its XP and tick stay: a task counts once. When the learner makes it again,
    // the "change" case below takes the level back to ready_to_check.
    case "redo":
      if (progress.phase !== "ready_to_check" || event.task < 0 || event.task >= plan.tasks.length) return same;
      return { progress: { ...progress, phase: "task", index: event.task, mistake: null }, effect: null };

    case "change": {
      if (!active && progress.phase !== "ready_to_check") return same;
      const before = ids(event.before);
      const added = event.after.filter((p) => !before.has(p.id)).map((p) => p.id);
      const { reached } = progress;

      // What the board does now. `gap` is the first task below `reached` that it does not do: the task to go back to.
      const now = doneTasks(bench, plan, event.after, reached, progress.swaps);
      const index = now.gap === -1 ? reached : now.gap;

      // A removal or an undo: if the wrong parts are gone, the mistake is over. A part that goes can undo a task.
      if (!added.length) {
        const after = ids(event.after);
        const fixed = !!progress.mistake && progress.mistake.parts.every((id) => !after.has(id));
        const phase = fixed || (progress.phase === "ready_to_check" && index < plan.tasks.length) ? "task" : progress.phase;
        const mistake = fixed ? null : progress.mistake;
        if (index === progress.index && phase === progress.phase && mistake === progress.mistake) return same;
        return { progress: { ...progress, phase, index, mistake, swaps: now.swaps }, effect: null };
      }

      const netsBefore = buildNets(bench, event.before);
      const netsAfter = buildNets(bench, event.after);
      const broken = plan.forbid.find(
        (f) => linked(bench, event.after, netsAfter, f, progress.swaps) && !linked(bench, event.before, netsBefore, f, progress.swaps),
      );
      const wrong = (mistake: Mistake) => ({
        progress: { ...progress, phase: "mistake" as const, index, mistakes: progress.mistakes + 1, mistake },
        effect: "buzz" as const,
      });
      if (broken) return wrong({ code: broken.code, message: broken.message, parts: added });

      // An LED that the learner puts the wrong way round: the Mistake comes at once, with the text of the level (issue #102).
      const turned = plan.tasks
        .map(({ target: t }) => t)
        .find((t) => t.kind === "place" && added.includes(t.id) && toolFor(t.part) === "led" && reversedLed(bench, event.after, netsAfter, plan, t.id));
      if (turned?.kind === "place") return wrong({ code: "reversed_led", message: reversedText(bench, event.after, plan, turned.id), parts: added });

      // A part that does a task that the board did not do before is not a mistake, even if the task is an earlier one.
      const wasDone = doneTasks(bench, plan, event.before, reached, progress.swaps).done;
      const redone = now.done.some((d, i) => d && !wasDone[i]);
      const state = index < plan.tasks.length ? taskState(bench, event.after, netsAfter, plan, index, now.swaps) : null;
      if (now.gap === -1 && state?.done) return { progress: advance(bench, plan, event.after, { ...progress, index }, state.swaps), effect: "snap" };
      if (redone) return { progress: { ...progress, phase: index < plan.tasks.length ? "task" : "ready_to_check", index, mistake: null, swaps: now.swaps }, effect: "snap" };
      if (progress.phase === "ready_to_check") return same;

      // A part that does a task after the task of now (issue #72): it snaps in, with no Mistake. The task finishes when
      // the learner gets to it (`advance`). The part does not set a side choice now: the learner has not reached its task.
      const early = plan.tasks.some((task, i) => {
        if (i < reached || i === index || needsAck(task.target)) return false;
        return taskState(bench, event.after, netsAfter, plan, i, now.swaps, reached).done && !taskState(bench, event.before, netsBefore, plan, i, now.swaps, reached).done;
      });
      if (early) return { progress: { ...progress, index }, effect: "snap" };

      const addedWire = event.after.some((p) => added.includes(p.id) && p.type === "wire");
      return wrong({ code: state && !state.done && state.wrongPlace ? "wrong_place" : addedWire ? "wrong_wire" : "wrong_part", parts: added });
    }
  }
}

/** The state of a task in the task list: done (a tick), now (the task of the pop-up), or to do. */
export type TaskMark = "done" | "now" | "todo";

/**
 * The marks of the task list (issue #52). A tick comes from the board as it is now: remove a wire and the tick of its
 * task goes; put it back and the tick comes back. A task that needs only "Got it" is done when the learner pressed it.
 * Only the tasks that the learner reached (below `progress.reached`) can be done. "Now" is the task of the pop-up, or, after the last task, the
 * first task that is not done.
 */
export function taskMarks(bench: Bench, plan: Plan, parts: Part[], progress: Progress): TaskMark[] {
  const { done } = doneTasks(bench, plan, parts, progress.reached, progress.swaps);
  const now = progress.phase === "ready_to_check" ? done.indexOf(false) : progress.index;
  return done.map((d, i) => (d ? "done" : i === now ? "now" : "todo"));
}

/** Where the pop-up of a task points, and the holes that glow. */
export type Spot = {
  /** Holes and terminals that glow. */
  holes: string[];
  /** The point on the bench that the pop-up points at. */
  at: { x: number; z: number };
  /**
   * The holes to tap, in order, for the "tap here" arrow: a free hole at each end of a wire (the second one near the
   * first, so the wire is short), a good hole for pin 1 of a module, or the terminals for the speaker.
   */
  taps: string[];
  /** A part that is always on the bench: its outline glows, so the learner sees which part the pop-up means. */
  area: { x0: number; x1: number; z0: number; z1: number } | null;
};

/** The free hole of `options` that is nearest to `to`. */
function nearest(bench: Bench, options: string[], to: { x: number; z: number }) {
  let best: string | null = null;
  let distance = Infinity;
  for (const id of options) {
    const h = bench.byId.get(id)!;
    const d = Math.hypot(h.x - to.x, h.z - to.z);
    if (d < distance) [best, distance] = [id, d];
  }
  return best;
}

/** The outline of a breadboard of the bench. */
function boardArea(bench: Bench, board: string) {
  return breadboardOutline(bench.breadboards.find((b) => b.id === board)?.x ?? 0);
}

function pointOf(bench: Bench, parts: Part[], id: string) {
  const h = bench.byId.get(id) ?? terminalAt(bench, parts, id)?.under;
  return h ? { x: h.x, z: h.z } : null;
}

function centerOf(points: { x: number; z: number }[]) {
  const sum = points.reduce((s, p) => ({ x: s.x + p.x, z: s.z + p.z }), { x: 0, z: 0 });
  return { x: sum.x / points.length, z: sum.z / points.length };
}

/**
 * The spot of a task on this bench.
 * - Wire: the two ends glow, with every free hole that connects to them. The pop-up points at the first hole to tap.
 * - Module: the holes where pin 1 can go glow.
 * - Speaker in a terminal: the terminal glows.
 * - A part that is always on the bench: the pop-up points at it, and its outline glows.
 */
export function taskSpot(bench: Bench, parts: Part[], target: Target, swaps: string[] = []): Spot {
  const boardCenter = (board: string) => centerOf(bench.holes.filter((h) => h.board === board));

  if (target.kind === "wire") {
    const nets = buildNets(bench, parts);
    const ends = [target.a, target.b].map((e) => endpointHole(bench, parts, resolve(e, swaps))).filter((h): h is string => h !== null);
    const holes = new Set(ends.flatMap((h) => [...netHoles(nets, h)]));
    for (const h of [...holes]) if (bench.covered.has(h)) holes.delete(h);
    // A free hole for each end: an end that is a terminal is its own tap.
    const free = (end: string) => [...netHoles(nets, end)].filter((h) => bench.byId.has(h) && !checkHole(bench, parts, h));
    const taps: string[] = [];
    if (ends.length === 2) {
      const [a, b] = ends.map((e) => pointOf(bench, parts, e)!);
      const first = bench.byId.has(ends[0]) ? nearest(bench, free(ends[0]), b) : ends[0];
      const firstAt = first ? pointOf(bench, parts, first)! : a;
      const second = bench.byId.has(ends[1]) ? nearest(bench, free(ends[1]), firstAt) : ends[1];
      if (first && second) taps.push(first, second);
    }
    const at = taps.length ? pointOf(bench, parts, taps[0]) : ends.length ? pointOf(bench, parts, ends[0]) : null;
    return { holes: [...holes], at: at ?? boardCenter("A"), taps, area: null };
  }

  const tool = toolFor(target.part);
  const board = zoneBoard(target.zone);
  if (tool && isModuleType(tool)) {
    const holes = bench.holes.filter((h) => (!board || h.board === board) && !checkModule(bench, parts, tool, h.id)).map((h) => h.id);
    const center = holes.length ? centerOf(holes.map((h) => bench.byId.get(h)!)) : boardCenter(board ?? "A");
    const tap = nearest(bench, holes, center);
    return { holes, at: center, taps: tap ? [tap] : [], area: null };
  }
  if (target.zone.includes(".")) {
    const holes = placeConnections(target).map((c) => endpointHole(bench, parts, c.b)).filter((h): h is string => h !== null);
    const points = holes.map((h) => pointOf(bench, parts, h)!).filter(Boolean);
    return { holes, at: points.length ? centerOf(points) : boardCenter("A"), taps: holes, area: null };
  }
  // Parts that are always on the bench: the main board (the ESP32-S3 or the Uno), and the breadboards.
  const { outline } = bench.board;
  if (target.id === bench.board.id) return { holes: [], at: { x: (outline.x0 + outline.x1) / 2, z: (outline.z0 + outline.z1) / 2 }, taps: [], area: outline };
  if (board) return { holes: [], at: boardCenter(board), taps: [], area: null };
  const side = target.zone.endsWith("right") ? "B" : "A";
  return { holes: [], at: boardCenter(side), taps: [], area: boardArea(bench, side) };
}
