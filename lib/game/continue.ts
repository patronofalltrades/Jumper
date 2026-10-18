export type LatestSession = {
  /** Position of the session's level in its project: 1, 2, 3… */
  level: number;
  status: "in_progress" | "completed" | "abandoned";
};

/**
 * The level that the lobby's Continue button opens.
 * No session: level 1. A completed level: the next level, but not past the last one.
 * In progress or abandoned: the same level, because it did not pass.
 */
export function continueTarget(latest: LatestSession | null, levelCount: number): { level: number; started: boolean } {
  if (!latest) return { level: 1, started: false };
  const level = latest.status === "completed" ? latest.level + 1 : latest.level;
  return { level: Math.min(level, levelCount), started: true };
}
