import type { Phase } from "./engine";
import type { LevelStatus } from "./map";

/** The poses of Volt, the Jumper mascot (components/art/volt.tsx). */
export type Pose = "idle" | "happy" | "oops" | "cheer";

/**
 * The pose of Volt next to a build-mode pop-up. Happy while the "what happened" pop-up of a done task shows,
 * oops on a wrong part or wire, and idle while the learner works. Cheer is for the Level complete screen only.
 */
export function mascotPose({ phase, done }: { phase: Phase; done: number | null }): Exclude<Pose, "cheer"> {
  if (done !== null) return "happy";
  return phase === "mistake" ? "oops" : "idle";
}

/** The level that Volt stands on, on the level map: the first open level, or the last level when all passed. -1 with no levels. */
export function mascotLevel(statuses: LevelStatus[]): number {
  const open = statuses.indexOf("open");
  return open >= 0 ? open : statuses.length - 1;
}
