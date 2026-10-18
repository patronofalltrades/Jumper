/** Hearts per level. */
export const HEARTS = 3;

/**
 * Hearts left after this many failed Checks in a session. Each fail costs a heart. At 0 hearts the learner is not
 * locked out: the next fail fills the hearts again (3, 2, 1, 0, 3, 2…).
 */
export const heartsLeft = (fails: number) => HEARTS - (Math.max(0, fails) % (HEARTS + 1));
