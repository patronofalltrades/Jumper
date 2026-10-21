import { z } from "zod";

// Stars on snapshots (PLAN.md feature 8, issue #40). The stars table keeps one row for each starred snapshot of a user.
// Row-level security gives each user only their own stars, and lets a user star only their own snapshots.

export type View = "all" | "starred";

/** The view of the lab notebook from `?view=`. Only "starred" opens the Starred view. */
export function readView(param: string | string[] | undefined): View {
  return param === "starred" ? "starred" : "all";
}

/** True when the query gave a star row for the snapshot. */
export function isStarred(stars: unknown[] | null | undefined): boolean {
  return (stars?.length ?? 0) > 0;
}

/** The snapshots to show in a view, in the same order. */
export function visibleSnapshots<T extends { stars: unknown[] | null }>(rows: T[], view: View): T[] {
  return view === "starred" ? rows.filter((r) => isStarred(r.stars)) : rows;
}

/** The input of toggleStar: the snapshot and its new state, so that two fast presses give the state of the last one. */
export const starInput = z.object({ id: z.uuid(), starred: z.boolean() });
