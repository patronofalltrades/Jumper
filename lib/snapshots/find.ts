import type { View } from "./stars";

// Find in the lab notebook (PLAN.md feature 9, issue #42): search the title and the notes, filter by level and by
// result, and sort. The URL keeps all of it, so a refresh or a link shows the same list. One Postgres query does the
// work (TRD 8.2), and row-level security gives each user only their own snapshots.

export type Result = "all" | "passed" | "not_checked";
export type Sort = "newest" | "mistakes";
export type Find = { q: string; level: number | null; result: Result; sort: Sort };

type Param = string | string[] | undefined;

const one = (param: Param) => (typeof param === "string" ? param : "");

/** The search, the filters and the sort from the URL. A value that is not correct gives the default. */
export function readFind(params: { q?: Param; level?: Param; result?: Param; sort?: Param }): Find {
  const level = Number(one(params.level));
  const result = one(params.result);
  return {
    q: one(params.q).trim().slice(0, 100),
    level: Number.isInteger(level) && level > 0 ? level : null,
    result: result === "passed" || result === "not_checked" ? result : "all",
    sort: one(params.sort) === "mistakes" ? "mistakes" : "newest",
  };
}

/** True when a search or a filter can hide snapshots. The sort hides nothing. */
export function isFiltered(find: Find): boolean {
  return find.q !== "" || find.level !== null || find.result !== "all";
}

/** The lab notebook URL for a view and a find. It keeps only the values that are not the default. */
export function findHref(find: Find, view: View): string {
  const params = new URLSearchParams();
  if (view === "starred") params.set("view", view);
  if (find.q) params.set("q", find.q);
  if (find.level !== null) params.set("level", String(find.level));
  if (find.result !== "all") params.set("result", find.result);
  if (find.sort !== "newest") params.set("sort", find.sort);
  const query = params.toString();
  return query ? `/snapshots?${query}` : "/snapshots";
}

/**
 * The PostgREST filter that finds the search in the title or the notes. `ilike` ignores upper and lower case.
 * The backslashes make `%` and `_` plain letters, and the quotes keep commas and brackets out of the filter syntax.
 */
export function searchFilter(q: string): string {
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const quoted = `"${pattern.replace(/[\\"]/g, "\\$&")}"`;
  return `title.ilike.${quoted},notes.ilike.${quoted}`;
}

// The calls that applyFind makes. The Supabase query builder has them, but its type is too deep for TypeScript to
// compare with this type, so applyFind takes any query and gives back the same type.
type Query = {
  or(filters: string): Query;
  eq(column: string, value: unknown): Query;
  order(column: string, options: { ascending: boolean }): Query;
};

/** Adds the search, the filters and the sort to the snapshots query. */
export function applyFind<Q>(query: Q, find: Find): Q {
  let q = query as Query;
  if (find.q) q = q.or(searchFilter(find.q));
  if (find.level !== null) q = q.eq("level_id", find.level);
  if (find.result !== "all") q = q.eq("passed", find.result === "passed");
  if (find.sort === "mistakes") q = q.order("mistake_count", { ascending: false });
  return q.order("created_at", { ascending: false }) as Q;
}
