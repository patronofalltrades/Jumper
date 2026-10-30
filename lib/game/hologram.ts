import type { Bench } from "@/lib/circuit/bench";
import type { ConnectionState } from "@/lib/circuit/check";
import { endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { needsAck, taskSpot, toolFor, type Plan } from "./engine";

// The hologram of a row (issue #113): the pointer on a row of the task list or the connection list shows a see-through
// ghost on the board. It uses the holes of the guide (taskSpot), so the hologram and the guide arrow agree. It only shows
// a place: it does not change the board, the tasks or the XP.

/** The row under the pointer: a task of the plan, or a connection of the connection list. */
export type HologramTarget = { kind: "task"; index: number } | { kind: "connection"; a: string; b: string };

/** What the scene draws see-through: the ghost parts, and a dashed ghost wire between the two holes of `line`. */
export type Ghost = { parts: Part[]; line: string[] };

/** The hologram of a connection row. Only a connection that must be made has one: a forbid or stray row has none. */
export function connectionHologram(state: ConnectionState): HologramTarget | null {
  return state.kind === "require" ? { kind: "connection", a: state.connection.a, b: state.connection.b } : null;
}

/**
 * The ghost of a row on this board. `swaps` and `finish` (the finished board of the level clip) are the values of the guide.
 * - A task: its part or wire in the holes that the guide taps. A part that is on the board already shows where it is.
 *   A part that is always on the bench (a "Got it" task) has no ghost.
 * - A connection: a ghost wire between free holes of its two ends, as the guide of a wire task. An end whose part is
 *   not on the board uses the hole of the finished board.
 */
export function hologramGhost(bench: Bench, parts: Part[], target: HologramTarget, plan: Plan | null, swaps: string[] = [], finish: Part[] = []): Ghost | null {
  if (target.kind === "connection") {
    const ends = wireEnds(bench, parts, target, swaps, finish);
    return ends && { parts: [], line: ends };
  }

  const task = plan?.tasks[target.index];
  if (!task || needsAck(task.target)) return null;
  const t = task.target;
  const tool = t.kind === "wire" ? "wire" : toolFor(t.part);
  if (t.kind === "place") {
    const placed = parts.find((p) => p.id === t.id && p.type === tool);
    if (placed) return { parts: [placed], line: [] };
  }
  if (t.kind === "wire") {
    const ends = wireEnds(bench, parts, t, swaps, finish);
    return ends && { parts: [{ id: "hologram", type: "wire", a: ends[0], b: ends[1] }], line: [] };
  }
  const { taps } = taskSpot(bench, parts, t, swaps, finish);
  if (!tool || !taps.length) return null;
  if (tool === "wire" || tool === "resistor" || tool === "led" || tool === "speaker") return taps.length === 2 ? { parts: [{ id: t.id, type: tool, a: taps[0], b: taps[1] }], line: [] } : null;
  return { parts: [{ id: t.id, type: tool, at: taps[0] }], line: [] };
}

/**
 * The two ends of a ghost wire: the holes that the guide of a wire task taps (free holes of the two ends). When a part of
 * an end is not on the board yet, its hole on the finished board.
 */
function wireEnds(bench: Bench, parts: Part[], wire: { a: string; b: string }, swaps: string[], finish: Part[]): string[] | null {
  const { taps } = taskSpot(bench, parts, { kind: "wire", a: wire.a, b: wire.b }, swaps, finish);
  if (taps.length === 2) return taps;
  const ends = [wire.a, wire.b].map((e) => endpointHole(bench, parts, e) ?? endpointHole(bench, finish, e));
  return ends[0] !== null && ends[1] !== null ? (ends as string[]) : null;
}
