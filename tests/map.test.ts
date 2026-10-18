import { describe, expect, it } from "vitest";
import { isUnlocked, levelStatuses } from "@/lib/game/map";

describe("level map", () => {
  it("opens only level 1 for a new learner", () => {
    expect(levelStatuses(5, [])).toEqual(["open", "locked", "locked", "locked", "locked"]);
  });

  it("opens a level when the level before it passed", () => {
    expect(levelStatuses(5, [1, 2])).toEqual(["done", "done", "open", "locked", "locked"]);
    expect(isUnlocked(3, [1, 2])).toBe(true);
    expect(isUnlocked(4, [1, 2])).toBe(false);
  });
});
