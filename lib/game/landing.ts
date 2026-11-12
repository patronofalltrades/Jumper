import { startBoard } from "@/lib/content/boards";
import type { Boards } from "@/lib/content/schema";
import type { LegPart, Part } from "@/lib/circuit/parts";
import type { Plan, Target } from "./engine";

/** The ticks that the finished board stays on the landing page before it starts again. */
export const HOLD_TICKS = 6;

/** All the parts of the finished board, level by level, each level in task order: the order of the landing board. */
export const wiringOrder = (boards: Boards): Part[] => startBoard(boards, Infinity);

/**
 * The parts on the landing board at a tick: the board starts empty and adds one part at each tick. The finished board
 * stays for HOLD_TICKS ticks, then the board starts again. With reduced motion, the board is always finished.
 */
export function landingParts(order: Part[], tick: number, reducedMotion: boolean): Part[] {
  if (reducedMotion) return order;
  return order.slice(0, Math.min(tick % (order.length + HOLD_TICKS + 1), order.length));
}

/** The time between two parts when the hero board shows its parts one time, after the page opens (issue #171). */
export const REVEAL_TICK_MS = 90;

/** How long the hero board takes to show all its parts. The text and the buttons below the board come in after it. */
export const revealMs = (order: Part[]): number => order.length * REVEAL_TICK_MS;

/**
 * The visitor makes the first wire of the hero board (issue #171), with two taps, and then the board shows the other
 * parts. `target` is the first wire task of the project, which `wire` does; `plan` is that one task, for the task
 * engine. Null when the first part or the task is not a wire.
 */
export function firstWire(order: Part[], target: Target | undefined): { wire: LegPart; rest: Part[]; plan: Plan } | null {
  const wire = order[0];
  if (!wire || wire.type !== "wire" || target?.kind !== "wire") return null;
  return { wire, rest: order.slice(1), plan: { tasks: [{ target, xp: 0 }], forbid: [] } };
}

/**
 * The first part of the finished hero board: the wire that the visitor made, or the wire of the project when the
 * visitor's wire uses a hole that a later part needs, or when the visitor made no wire.
 */
export function keptWire(made: Part | undefined, wire: LegPart, rest: Part[]): Part {
  if (!made || made.type !== "wire") return wire;
  const used = new Set(rest.flatMap((p) => ("a" in p ? [p.a, p.b] : [])));
  return used.has(made.a) || used.has(made.b) ? wire : made;
}

/**
 * The parts on the hero board at a scroll position (issue #173). `progress` is 0 at the top of the hero and 1 at its
 * end. The board has `start` parts before the visitor scrolls, and all `total` parts at the end.
 */
export function scrollCount(progress: number, start: number, total: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  return Math.min(start, total) + Math.round(p * Math.max(total - start, 0));
}

/**
 * The level that the board is on: the index, in `sizes`, of the level of its last part. `sizes` has the number of
 * parts of each level, in order. A board with no parts is on the first level.
 */
export function levelAt(count: number, sizes: number[]): number {
  let end = 0;
  for (const [i, size] of sizes.entries()) {
    end += size;
    if (count <= end) return i;
  }
  return Math.max(sizes.length - 1, 0);
}
