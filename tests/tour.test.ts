import { describe, expect, it } from "vitest";
import text from "@/content/ui/tour.json";
import { TOUR_KEY, TOUR_STEPS, cardSide, markTourSeen, nextIndex, resetTour, shouldShowTour, tourPlan, tourSeen, type TourStorage } from "@/lib/game/tour";

/** A browser storage that keeps its entries in a Map. */
const memory = (): TourStorage & { entries: Map<string, string> } => {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
};

/** A storage that throws on every call, as a browser with blocked site data does. */
const blocked: TourStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("tourPlan", () => {
  it("lists every step in order when every control is on the page", () => {
    expect(tourPlan(new Set(TOUR_STEPS))).toEqual(["tasks", "connections", "clear", "check", "build"]);
  });

  it("leaves out a step whose control is not on the page (the connection list shows only after a failed Check)", () => {
    expect(tourPlan(new Set(["tasks", "clear", "check", "build"]))).toEqual(["tasks", "clear", "check", "build"]);
  });

  it("is empty when no control is on the page", () => {
    expect(tourPlan(new Set())).toEqual([]);
  });
});

describe("nextIndex", () => {
  it("moves to the next step of the plan", () => {
    expect(nextIndex(0, ["tasks", "clear"])).toBe(1);
  });

  it("is null after the last step, so the tour is done", () => {
    expect(nextIndex(1, ["tasks", "clear"])).toBeNull();
    expect(nextIndex(0, [])).toBeNull();
  });
});

describe("shouldShowTour", () => {
  it("shows the tour when the learner has not seen it and no pop-up is open", () => {
    expect(shouldShowTour(false, false)).toBe(true);
  });

  it("does not show the tour again once it is seen", () => {
    expect(shouldShowTour(true, false)).toBe(false);
  });

  it("waits while a pop-up, the level intro clip or the Check card is open", () => {
    expect(shouldShowTour(false, true)).toBe(false);
  });
});

describe("tourSeen, markTourSeen and resetTour", () => {
  it("is not seen in a new browser", () => {
    expect(tourSeen(memory())).toBe(false);
  });

  it("is seen after markTourSeen, and not seen again after resetTour", () => {
    const storage = memory();
    markTourSeen(storage);
    expect(tourSeen(storage)).toBe(true);
    resetTour(storage);
    expect(tourSeen(storage)).toBe(false);
  });

  it("keeps the flag in one key of the browser", () => {
    const storage = memory();
    markTourSeen(storage);
    expect([...storage.entries.keys()]).toEqual([TOUR_KEY]);
  });

  it("counts as seen when the browser blocks storage, so the tour does not return on each visit", () => {
    expect(tourSeen(blocked)).toBe(true);
    expect(() => markTourSeen(blocked)).not.toThrow();
    expect(() => resetTour(blocked)).not.toThrow();
  });

  it("counts as seen when there is no storage at all", () => {
    expect(tourSeen(null)).toBe(true);
  });
});

describe("cardSide", () => {
  const H = 844;
  const CARD = 220;

  it("puts the card under a target near the top of the screen", () => {
    expect(cardSide({ top: 60, bottom: 100 }, H, CARD)).toBe("bottom");
  });

  it("puts the card above a target at the bottom of the screen, so it does not cover the target", () => {
    expect(cardSide({ top: 772, bottom: 828 }, H, CARD)).toBe("top");
  });

  it("uses the side with more room when neither side has room for the card", () => {
    expect(cardSide({ top: 300, bottom: 700 }, H, CARD)).toBe("top");
    expect(cardSide({ top: 100, bottom: 600 }, H, CARD)).toBe("bottom");
  });
});

describe("content/ui/tour.json", () => {
  it("has a title and a text for each step of the tour", () => {
    for (const step of TOUR_STEPS) {
      expect(text.steps[step].title.trim(), step).not.toBe("");
      expect(text.steps[step].text.trim(), step).not.toBe("");
    }
  });
});
