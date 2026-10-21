import { describe, expect, it } from "vitest";
import { applyFind, findHref, isFiltered, readFind, searchFilter, type Find } from "@/lib/snapshots/find";

const plain: Find = { q: "", level: null, result: "all", sort: "newest" };

// A query that writes down each call, in place of the Supabase query builder.
function fakeQuery() {
  const calls: unknown[][] = [];
  const query = {
    calls,
    or: (filters: string) => (calls.push(["or", filters]), query),
    eq: (column: string, value: unknown) => (calls.push(["eq", column, value]), query),
    order: (column: string, options: { ascending: boolean }) => (calls.push(["order", column, options.ascending]), query),
  };
  return query;
}

describe("find: read the URL", () => {
  it("gives the plain list when the URL has no search, filter or sort", () => {
    expect(readFind({})).toEqual(plain);
  });

  it("reads the search, the level, the result and the sort", () => {
    expect(readFind({ q: "  mic  ", level: "3", result: "passed", sort: "mistakes" })).toEqual({ q: "mic", level: 3, result: "passed", sort: "mistakes" });
    expect(readFind({ result: "not_checked" }).result).toBe("not_checked");
  });

  it("ignores values that are not correct", () => {
    expect(readFind({ q: ["a", "b"], level: "two", result: "maybe", sort: "oldest" })).toEqual(plain);
    expect(readFind({ level: "0" }).level).toBeNull();
    expect(readFind({ level: "1.5" }).level).toBeNull();
    expect(readFind({ level: "-2" }).level).toBeNull();
  });

  it("cuts a very long search to 100 characters", () => {
    expect(readFind({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("knows when a search or a filter is on", () => {
    expect(isFiltered(plain)).toBe(false);
    expect(isFiltered({ ...plain, sort: "mistakes" })).toBe(false);
    expect(isFiltered({ ...plain, q: "mic" })).toBe(true);
    expect(isFiltered({ ...plain, level: 2 })).toBe(true);
    expect(isFiltered({ ...plain, result: "passed" })).toBe(true);
  });
});

describe("find: write the URL", () => {
  it("keeps only the values that are not the default", () => {
    expect(findHref(plain, "all")).toBe("/snapshots");
    expect(findHref(plain, "starred")).toBe("/snapshots?view=starred");
    expect(findHref({ q: "ears wired", level: 3, result: "not_checked", sort: "mistakes" }, "starred")).toBe(
      "/snapshots?view=starred&q=ears+wired&level=3&result=not_checked&sort=mistakes",
    );
  });

  it("gives the same find after a refresh", () => {
    const find: Find = { q: "GND & 3V3", level: 5, result: "passed", sort: "mistakes" };
    const params = Object.fromEntries(new URL(findHref(find, "all"), "http://x").searchParams);
    expect(readFind(params)).toEqual(find);
  });
});

describe("find: the query", () => {
  it("sorts newest first, with no filter, for the plain list", () => {
    expect(applyFind(fakeQuery(), plain).calls).toEqual([["order", "created_at", false]]);
  });

  it("searches the title and the notes, filters the level and the result, and sorts by most mistakes", () => {
    const { calls } = applyFind(fakeQuery(), { q: "mic", level: 3, result: "not_checked", sort: "mistakes" });
    expect(calls).toEqual([
      ["or", 'title.ilike."%mic%",notes.ilike."%mic%"'],
      ["eq", "level_id", 3],
      ["eq", "passed", false],
      ["order", "mistake_count", false],
      ["order", "created_at", false],
    ]);
  });

  it("filters passed snapshots", () => {
    expect(applyFind(fakeQuery(), { ...plain, result: "passed" }).calls).toContainEqual(["eq", "passed", true]);
  });

  it("finds the letters of the search as they are, not as patterns or filter syntax", () => {
    expect(searchFilter("100%")).toBe('title.ilike."%100\\\\%%",notes.ilike."%100\\\\%%"');
    expect(searchFilter("a_b")).toBe('title.ilike."%a\\\\_b%",notes.ilike."%a\\\\_b%"');
    expect(searchFilter('say "hi", (ok)')).toBe('title.ilike."%say \\"hi\\", (ok)%",notes.ilike."%say \\"hi\\", (ok)%"');
  });
});
