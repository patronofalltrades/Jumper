import { z } from "zod";
import { savePrefix } from "./level-key";

/** What the level map showed: the positions of the levels that passed, and the total XP. */
export type MapProgress = { passed: number[]; xp: number };

const storedSchema = z.object({
  passed: z.array(z.number().int().positive()),
  xp: z.number().int().nonnegative(),
});

/** The state that the map showed last time, from the browser storage. Anything else is null. */
export function parseStoredProgress(raw: string | null): MapProgress | null {
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The state to animate from, or null for no animation. A pass or more XP since the stored state animates the map from
 * the stored state. The first visit (nothing stored) and a state that is not newer show the end state at once.
 */
export function animateFrom(stored: MapProgress | null, server: MapProgress): MapProgress | null {
  if (!stored) return null;
  const newPass = server.passed.some((position) => !stored.passed.includes(position));
  const moreXp = server.xp > stored.xp;
  return newPass || moreXp ? stored : null;
}

/** The XP to show at time `t`, from 0 (start) to 1 (end). The curve eases out, and the end value is exact. */
export function countValue(from: number, to: number, t: number): number {
  const eased = 1 - (1 - t) ** 3;
  return Math.round(from + (to - from) * eased);
}

/** The key of the map state of one user in one project. It has the saved-board prefix of the user, so account deletion clears it. */
export const mapProgressKey = (user: string, project: string) => `${savePrefix(user)}map/${project}`;
