import { BOARD, BOARD_B_X, type Bench } from "@/lib/circuit/bench";
import { isModuleType } from "@/lib/circuit/modules";
import { buildNets, endpointHole, netHoles, type Nets } from "@/lib/circuit/nets";
import { checkHole, checkModule, isTerminal, LEG_NAMES, partPins, terminalAt, type LegType, type Part, type PartType } from "@/lib/circuit/parts";

// The build-mode task engine (TRD 6.1): a small state machine. It reads the tasks and the forbid rules of a level, and
// the parts on the bench. It does not know React, the 3D scene or the database.
//
//   intro → task ⇄ mistake
//   task → task (next task) → … → ready_to_check
// In ready_to_check the learner presses Check (lib/circuit/check.ts). A fail costs a heart; a pass ends the level.

export type Connection = { a: string; b: string };
export type Forbid = Connection & { code: string; message: string };
export type Target = ({ kind: "wire" } & Connection) | { kind: "place"; part: string; id: string; zone: string };
export type PlanTask = { target: Target; xp: number };
/** What the engine needs from a level: its tasks in order, and its forbid rules. */
export type Plan = { tasks: PlanTask[]; forbid: Forbid[] };

export type Phase = "intro" | "task" | "mistake" | "ready_to_check";

/** A wrong change. `code` is a forbid rule code, or "wrong_wire", "wrong_part" or "wrong_place". */
export type Mistake = { code: string; message?: string; parts: string[] };

export type Progress = {
  phase: Phase;
  /** The task to do now. Equal to the task count when all tasks are done. */
  index: number;
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
  /** "Got it" on a task for a part that is already on the bench (a breadboard, the ESP32-S3). */
  | { type: "ack"; parts: Part[] }
  /** "Try again" on a Mistake pop-up. */
  | { type: "dismiss" }
  | { type: "change"; before: Part[]; after: Part[] };

/** A correct change snaps in. A wrong one buzzes. */
export type Effect = "snap" | "buzz" | null;

export const startProgress = (): Progress => ({ phase: "intro", index: 0, tasksDone: 0, mistakes: 0, xp: 0, mistake: null, swaps: [], fails: 0 });

const LEG_TYPES = Object.keys(LEG_NAMES) as LegType[];

/**
 * The tool that puts the part of a place task on the bench, from its content name: "inmp441" → "inmp441",
 * "resistor-220" → "resistor". Null for a part that is always on the bench, such as a breadboard or the ESP32-S3.
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
function zoneBoard(zone: string): "A" | "B" | null {
  return (/bb([AB])/.exec(zone)?.[1] as "A" | "B" | undefined) ?? null;
}

type TaskState = { done: true; swaps: string[] } | { done: false; wrongPlace: boolean };

/** Is this task done on this bench? For a wire task, it can choose which side of a button or resistor to use. */
function taskState(bench: Bench, parts: Part[], nets: Nets, plan: Plan, index: number, swaps: string[]): TaskState {
  const target = plan.tasks[index].target;

  if (target.kind === "wire") {
    // A side choice is free until an earlier wire task used the part.
    const used = new Set(plan.tasks.slice(0, index).flatMap((t) => (t.target.kind === "wire" ? [t.target.a, t.target.b] : [])).map((e) => e.split(".")[0]));
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
  return ok ? { done: true, swaps } : { done: false, wrongPlace: true };
}

/** Finishes the task at `progress.index`, and the tasks after it that the bench already does. */
function advance(bench: Bench, plan: Plan, parts: Part[], progress: Progress, swaps: string[]): Progress {
  const nets = buildNets(bench, parts);
  let { index, tasksDone, xp } = progress;
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
  return { ...progress, phase, index, tasksDone, xp, swaps, mistake: null };
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
      if (!active || !needsAck(plan.tasks[progress.index].target)) return same;
      return { progress: advance(bench, plan, event.parts, progress, progress.swaps), effect: "snap" };

    case "dismiss":
      return progress.phase === "mistake" ? { progress: { ...progress, phase: "task", mistake: null }, effect: null } : same;

    case "change": {
      if (!active) return same;
      const before = ids(event.before);
      const added = event.after.filter((p) => !before.has(p.id)).map((p) => p.id);

      // A removal or an undo: if the wrong parts are gone, the mistake is over.
      if (!added.length) {
        const after = ids(event.after);
        const fixed = progress.mistake && progress.mistake.parts.every((id) => !after.has(id));
        return fixed ? { progress: { ...progress, phase: "task", mistake: null }, effect: null } : same;
      }

      const netsBefore = buildNets(bench, event.before);
      const netsAfter = buildNets(bench, event.after);
      const broken = plan.forbid.find(
        (f) => linked(bench, event.after, netsAfter, f, progress.swaps) && !linked(bench, event.before, netsBefore, f, progress.swaps),
      );
      const wrong = (mistake: Mistake) => ({
        progress: { ...progress, phase: "mistake" as const, mistakes: progress.mistakes + 1, mistake },
        effect: "buzz" as const,
      });
      if (broken) return wrong({ code: broken.code, message: broken.message, parts: added });

      const state = taskState(bench, event.after, netsAfter, plan, progress.index, progress.swaps);
      if (state.done) return { progress: advance(bench, plan, event.after, progress, state.swaps), effect: "snap" };

      const addedWire = event.after.some((p) => added.includes(p.id) && p.type === "wire");
      return wrong({ code: state.wrongPlace ? "wrong_place" : addedWire ? "wrong_wire" : "wrong_part", parts: added });
    }
  }
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

/** The outline of breadboard A or B. */
function boardArea(board: "A" | "B") {
  const x = (board === "A" ? 0 : BOARD_B_X) + BOARD.centerX;
  return { x0: x - BOARD.width / 2, x1: x + BOARD.width / 2, z0: -BOARD.length / 2, z1: BOARD.length / 2 };
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
  const boardCenter = (board: "A" | "B") => centerOf(bench.holes.filter((h) => h.board === board));

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
  // Parts that are always on the bench. The ESP32-S3 goes "across-bbA-bbB".
  const { esp } = bench;
  if (target.zone.startsWith("across")) return { holes: [], at: { x: (esp.x0 + esp.x1) / 2, z: (esp.z0 + esp.z1) / 2 }, taps: [], area: esp };
  if (board) return { holes: [], at: boardCenter(board), taps: [], area: null };
  const side = target.zone.endsWith("right") ? "B" : "A";
  return { holes: [], at: boardCenter(side), taps: [], area: boardArea(side) };
}
