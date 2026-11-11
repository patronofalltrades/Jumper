import { startBoard } from "@/lib/content/boards";
import type { Boards } from "@/lib/content/schema";
import type { Part } from "@/lib/circuit/parts";

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
