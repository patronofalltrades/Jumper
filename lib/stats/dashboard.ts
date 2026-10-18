// Numbers for the dashboard (PLAN.md feature 10). Pure: no React, no database. The page reads the user's own sessions
// and attempts (row-level security) and gives them to these functions.

export type Session = { levelId: number; status: "in_progress" | "completed" | "abandoned" };
export type Attempt = { levelId: number; passed: boolean; mistakeType: string | null; createdAt: string };

export type PassRate = { passed: number; levels: number; percent: number };
export type MistakeCount = { type: string; count: number };

/** How many levels have a completed session. A level done two times counts once. */
export function levelsCompleted(sessions: Session[]): number {
  return new Set(sessions.filter((s) => s.status === "completed").map((s) => s.levelId)).size;
}

/** How many sessions are completed. A level done two times counts two times. */
export function completedSessions(sessions: Session[]): number {
  return sessions.filter((s) => s.status === "completed").length;
}

/**
 * The levels whose first Check passed, of all the levels with a Check (PLAN.md section 4, test 2). The first attempt
 * is the earliest one of the level, so a pass after a fail does not count. Null when there are no attempts.
 */
export function firstTryPassRate(attempts: Attempt[]): PassRate | null {
  const first = new Map<number, Attempt>();
  for (const a of attempts) {
    const seen = first.get(a.levelId);
    if (!seen || Date.parse(a.createdAt) < Date.parse(seen.createdAt)) first.set(a.levelId, a);
  }
  if (first.size === 0) return null;
  const passed = [...first.values()].filter((a) => a.passed).length;
  return { passed, levels: first.size, percent: Math.round((passed / first.size) * 100) };
}

/** The failed attempts of each mistake type, most first. Types with the same count are in name order. */
export function mistakesByType(attempts: Attempt[]): MistakeCount[] {
  const counts = new Map<string, number>();
  for (const a of attempts) if (!a.passed && a.mistakeType) counts.set(a.mistakeType, (counts.get(a.mistakeType) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => ({ type, count }))
    .sort((x, y) => y.count - x.count || x.type.localeCompare(y.type));
}
