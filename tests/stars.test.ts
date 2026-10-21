import { describe, expect, it } from "vitest";
import { isStarred, readView, starInput, visibleSnapshots } from "@/lib/snapshots/stars";

const id = "8f14e45f-ceea-4f6a-9b1e-2c2d4e6f8a10";
// Rows as the list query gives them: row-level security returns only the stars of the user who asks.
const rows = [
  { id: "a", title: "Ears wired", stars: [{ snapshot_id: "a" }] },
  { id: "b", title: "First LED", stars: [] },
  { id: "c", title: "Face on", stars: [{ snapshot_id: "c" }] },
];

describe("stars", () => {
  it("opens the Starred view only for ?view=starred", () => {
    expect(readView("starred")).toBe("starred");
    expect(readView(undefined)).toBe("all");
    expect(readView("other")).toBe("all");
    expect(readView(["starred", "all"])).toBe("all");
  });

  it("finds a star from the stars that the query gives", () => {
    expect(isStarred([{ snapshot_id: id }])).toBe(true);
    expect(isStarred([])).toBe(false);
    expect(isStarred(null)).toBe(false);
  });

  it("shows all the snapshots in the All view", () => {
    expect(visibleSnapshots(rows, "all").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("shows only the starred snapshots in the Starred view, in the same order", () => {
    expect(visibleSnapshots(rows, "starred").map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("gives an empty Starred view when no snapshot has a star", () => {
    expect(visibleSnapshots([rows[1]], "starred")).toEqual([]);
  });

  it("accepts a snapshot id and the new star state, and refuses other input", () => {
    expect(starInput.safeParse({ id, starred: true }).success).toBe(true);
    expect(starInput.safeParse({ id, starred: false }).success).toBe(true);
    expect(starInput.safeParse({ id: "not-an-id", starred: true }).success).toBe(false);
    expect(starInput.safeParse({ id }).success).toBe(false);
  });
});
