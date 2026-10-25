// Numbers and tiers for the Level complete screen. Pure: no React, no database.

export type TitleTier = "clean" | "solid" | "complete";
export type AccuracyTier = "perfect" | "great" | "good";

/** Percent of tries that were right: each done task is one right try, each mistake one wrong try. */
export function accuracy(tasksDone: number, mistakes: number): number {
  if (tasksDone <= 0) return 0;
  return Math.round((tasksDone / (tasksDone + Math.max(0, mistakes))) * 100);
}

/** A pass that gave no XP is a replay: only the first pass of a level gives XP (issue #62). */
export const isReplay = (xp: number) => xp <= 0;

/** No mistakes: clean. 1 or 2: solid. 3 or more: complete. */
export function titleTier(mistakes: number): TitleTier {
  if (mistakes <= 0) return "clean";
  return mistakes <= 2 ? "solid" : "complete";
}

/** 100 %: perfect. 80 % or more: great. Less: good. */
export function accuracyTier(percent: number): AccuracyTier {
  if (percent >= 100) return "perfect";
  return percent >= 80 ? "great" : "good";
}

/** "m:ss", or "h:mm:ss" from one hour. */
export function formatDuration(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
