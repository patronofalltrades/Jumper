import { describe, expect, it } from "vitest";
import text from "@/content/ui/lobby.json";
import { PATH_WIDTH, progressPercent, tilePath } from "@/lib/game/tile-path";

describe("tilePath (issue #152)", () => {
  it("puts one tile on each row, in the zigzag center, right, center, left", () => {
    const { points } = tilePath(5, 0);
    expect(points.map(([x]) => x)).toEqual([170, 280, 170, 60, 170]);
    expect(points.map(([, y]) => y)).toEqual([60, 180, 300, 420, 540]);
    for (const [x] of points) expect(x).toBeLessThan(PATH_WIDTH);
  });

  it("is as tall as its rows, with room for the last tile", () => {
    expect(tilePath(5, 0).height).toBe(540 + 80);
    expect(tilePath(1, 0).height).toBe(60 + 80);
  });

  it("draws the done wire up to the tile after the last passed level, and the rest as the to-do wire", () => {
    const none = tilePath(4, 0);
    expect(none.done).toBe("");
    expect(none.todo.split("M")).toHaveLength(4); // 3 segments

    const two = tilePath(4, 2);
    expect(two.done.split("M")).toHaveLength(3); // 1→2 and 2→3
    expect(two.todo.split("M")).toHaveLength(2); // 3→4

    const all = tilePath(4, 4);
    expect(all.todo).toBe("");
  });

  it("turns a corner with a rounded bend, and goes straight down on the same column", () => {
    const { done } = tilePath(2, 1);
    expect(done).toBe("M170 60 H256 Q280 60 280 84 V180");
  });
});

describe("progressPercent", () => {
  it("is the share of passed levels, rounded", () => {
    expect(progressPercent(5, 2)).toBe(40);
    expect(progressPercent(3, 1)).toBe(33);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe("content/ui/lobby.json path text", () => {
  it("has the labels for each tile state", () => {
    for (const key of ["title", "done", "open", "locked", "start", "end"] as const) expect(text.path[key]).not.toBe("");
  });
});
