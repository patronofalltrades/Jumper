import { describe, expect, it } from "vitest";
import text from "@/content/ui/tour.json";
import { LOBBY_TOUR_KEY, LOBBY_TOUR_STEPS, TOUR_KEY, TOUR_KEYS, TOUR_STEPS, cardSide, markTourSeen, nextIndex, resetTour, shouldShowTour, tourPlan, tourSeen, type TourStorage } from "@/lib/game/tour";

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

describe("the lobby tour for new users", () => {
  it("shows what Jumper is first, then the top bar, then the dock", () => {
    expect(tourPlan(new Set(LOBBY_TOUR_STEPS), LOBBY_TOUR_STEPS)).toEqual(["start", "nav", "xp", "profile", "play", "dashboard"]);
  });

  it("leaves out the Start card when the lobby has no project to continue", () => {
    expect(tourPlan(new Set(["nav", "xp", "profile", "play", "dashboard"]), LOBBY_TOUR_STEPS)).toEqual(["nav", "xp", "profile", "play", "dashboard"]);
  });

  it("does not take the steps of the build tour", () => {
    expect(tourPlan(new Set([...TOUR_STEPS, ...LOBBY_TOUR_STEPS]), LOBBY_TOUR_STEPS)).toEqual([...LOBBY_TOUR_STEPS]);
  });

  it("keeps its own flag, so the build tour still shows after the lobby tour", () => {
    const storage = memory();
    markTourSeen(storage, LOBBY_TOUR_KEY);
    expect(tourSeen(storage, LOBBY_TOUR_KEY)).toBe(true);
    expect(tourSeen(storage)).toBe(false);
  });

  it("shows again after resetTour with its key", () => {
    const storage = memory();
    markTourSeen(storage, LOBBY_TOUR_KEY);
    resetTour(storage, LOBBY_TOUR_KEY);
    expect(tourSeen(storage, LOBBY_TOUR_KEY)).toBe(false);
  });

  it("lists the keys of both tours, so 'Show the tour again' resets both", () => {
    expect([...TOUR_KEYS].sort()).toEqual([LOBBY_TOUR_KEY, TOUR_KEY].sort());
    expect(LOBBY_TOUR_KEY).not.toBe(TOUR_KEY);
  });

  it("has a title and a text for each step in content/ui/tour.json", () => {
    for (const step of LOBBY_TOUR_STEPS) {
      expect(text.lobby.steps[step].title.trim(), step).not.toBe("");
      expect(text.lobby.steps[step].text.trim(), step).not.toBe("");
    }
    expect(text.lobby.label.trim()).not.toBe("");
  });
});
