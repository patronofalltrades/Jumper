// The size and timing of the task-card track under the hero, in frames. A separate file, so the page can read it
// without loading Remotion.

/** The task cards under the hero. One step: the cards move one place, then the cursor does the task on the front card. */
export const CARDS = { width: 1120, height: 440, fps: 30, step: 72, move: 20, kinds: 5 } as const;
/** All the card kinds show one time in a loop; after that, the same cards are in the same places again. */
export const CARDS_LOOP = CARDS.step * CARDS.kinds;
/** A frame where the front card shows the task done: for a still image when the visitor has reduced motion. */
export const CARDS_STILL = CARDS.step * 2 + 60;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The conveyor at a frame: `active` is the card that the cursor works on, and `position` is the place of the
 * track, in cards (it goes up by 1 in each step, with ease in and out).
 */
export function conveyor(frame: number) {
  const active = Math.floor(frame / CARDS.step);
  const local = frame - active * CARDS.step;
  return { active, local, position: active - 1 + easeInOut(clamp01(local / CARDS.move)) };
}

/** How far the task on a card is done (0 to 1): 0 for a card that comes next, 1 for a card that is done. */
export function taskDone(card: number, frame: number) {
  const { active, local } = conveyor(frame);
  if (card < active) return 1;
  if (card > active) return 0;
  return clamp01((local - 36) / 22);
}
