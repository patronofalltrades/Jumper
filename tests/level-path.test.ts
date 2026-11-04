import { describe, expect, it } from "vitest";
import { pathLayout, progressPercent } from "@/lib/game/path";

describe("level path layout (canvas of issue #152)", () => {
  it("puts the tiles in the middle, right, middle, left columns, one row each", () => {
    const { points } = pathLayout(6);
    expect(points.map((p) => p.col)).toEqual([1, 2, 1, 0, 1, 2]);
    expect(points[0].y).toBeLessThan(points[1].y);
    expect(points[1].y - points[0].y).toBe(points[2].y - points[1].y);
  });

  it("has one segment between each pair of tiles, and none for one tile", () => {
    expect(pathLayout(5).segments).toHaveLength(4);
    expect(pathLayout(1).segments).toHaveLength(0);
    expect(pathLayout(0).points).toHaveLength(0);
  });

  it("draws a straight line between tiles in the same column, and a bend between different columns", () => {
    const { points, segments } = pathLayout(2);
    expect(segments[0]).toContain("Q");
    const same = pathLayout(2, [0, 0]);
    expect(same.segments[0]).toBe(`M${same.points[0].x} ${same.points[0].y} V${same.points[1].y}`);
    expect(points[1].col).toBe(2);
  });

  it("makes the board tall enough for the last tile and its label", () => {
    const { points, height } = pathLayout(5);
    expect(height).toBeGreaterThan(points[4].y + 60);
  });
});

describe("project progress", () => {
  it("is the part of the levels that passed, rounded", () => {
    expect(progressPercent(5, [])).toBe(0);
    expect(progressPercent(5, [1, 2])).toBe(40);
    expect(progressPercent(3, [1])).toBe(33);
    expect(progressPercent(0, [])).toBe(0);
  });
});
