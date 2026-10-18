export type LevelStatus = "done" | "open" | "locked";

/**
 * The status of each level on the level map, from the positions of the levels that passed (a completed session).
 * Level 1 is always open. A level opens when the level before it passed.
 */
export function levelStatuses(count: number, passed: number[]): LevelStatus[] {
  return Array.from({ length: count }, (_, i) => (passed.includes(i + 1) ? "done" : isUnlocked(i + 1, passed) ? "open" : "locked"));
}

export const isUnlocked = (position: number, passed: number[]) => position === 1 || passed.includes(position - 1);
