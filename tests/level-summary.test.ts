import { describe, expect, it } from "vitest";
import { accuracy, accuracyTier, formatDuration, titleTier } from "@/lib/stats/level-summary";

describe("accuracy", () => {
  it("is 100 when no task had a mistake", () => {
    expect(accuracy(8, 0)).toBe(100);
  });

  it("counts each mistake as one wrong try, and rounds to a whole percent", () => {
    // 10 good tries of 13 tries = 76.9 %
    expect(accuracy(10, 3)).toBe(77);
  });

  it("is 0 when no task was done", () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(0, 4)).toBe(0);
  });
});

describe("titleTier", () => {
  it("gives clean for no mistakes, solid for 1 or 2, and complete for 3 or more", () => {
    expect(titleTier(0)).toBe("clean");
    expect(titleTier(1)).toBe("solid");
    expect(titleTier(2)).toBe("solid");
    expect(titleTier(3)).toBe("complete");
  });
});

describe("accuracyTier", () => {
  it("gives perfect at 100, great from 80, and good below 80", () => {
    expect(accuracyTier(100)).toBe("perfect");
    expect(accuracyTier(99)).toBe("great");
    expect(accuracyTier(80)).toBe("great");
    expect(accuracyTier(79)).toBe("good");
  });
});

describe("formatDuration", () => {
  it("shows minutes and seconds", () => {
    expect(formatDuration(286_000)).toBe("4:46");
    expect(formatDuration(5_000)).toBe("0:05");
  });

  it("shows hours when the level took one hour or more", () => {
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });

  it("shows 0:00 for a negative or missing time", () => {
    expect(formatDuration(-1)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});
