import { describe, expect, it } from "vitest";
import { heartsLeft, outOfHearts } from "@/lib/game/hearts";

describe("hearts", () => {
  it("starts with 3 hearts and loses 1 for each failed Check", () => {
    expect([0, 1, 2, 3].map(heartsLeft)).toEqual([3, 2, 1, 0]);
  });

  it("fills the hearts again on the next fail at 0 hearts", () => {
    expect([4, 5, 7, 8].map(heartsLeft)).toEqual([3, 2, 0, 3]);
  });

  it("is out of hearts only after the fail that takes the last heart", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(outOfHearts)).toEqual([false, false, false, true, false, false, false, true]);
  });
});
