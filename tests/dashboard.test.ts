import { describe, expect, it } from "vitest";
import { completedSessions, firstTryPassRate, levelsCompleted, mistakesByType, topMistakes, type Attempt, type Session } from "@/lib/stats/dashboard";
import { termsByLetter, termsLearned, type Term } from "@/lib/stats/terms";

// An attempt on a level at a time. `at` is minutes after the start of the day, so the order is clear.
const attempt = (levelId: number, passed: boolean, at: number, mistakeType: string | null = passed ? null : "wrong_pin"): Attempt => ({
  levelId,
  passed,
  mistakeType,
  createdAt: new Date(Date.UTC(2026, 9, 18, 0, at)).toISOString(),
});

describe("first-try pass rate", () => {
  // The required dashboard test (PLAN.md section 4, test 2).
  it("is 67% when the first attempt passed on step 1, failed on step 2 (then passed on retry), and passed on step 3", () => {
    const attempts = [attempt(1, true, 1), attempt(2, false, 2), attempt(2, true, 3), attempt(3, true, 4)];
    expect(firstTryPassRate(attempts)).toEqual({ passed: 2, levels: 3, percent: 67 });
  });

  it("uses the earliest attempt of each level, in any order of the rows", () => {
    const attempts = [attempt(2, true, 9), attempt(1, true, 5), attempt(2, false, 3)];
    expect(firstTryPassRate(attempts)).toEqual({ passed: 1, levels: 2, percent: 50 });
  });

  it("is 100% when each level passed on the first attempt", () => {
    expect(firstTryPassRate([attempt(1, true, 1), attempt(2, true, 2)])).toEqual({ passed: 2, levels: 2, percent: 100 });
  });

  it("is 0% when each first attempt failed, also after a pass later", () => {
    expect(firstTryPassRate([attempt(1, false, 1), attempt(1, true, 2)])).toEqual({ passed: 0, levels: 1, percent: 0 });
  });

  it("is null with no attempts, so the dashboard shows no number", () => {
    expect(firstTryPassRate([])).toBeNull();
  });
});

describe("levels and sessions", () => {
  const sessions: Session[] = [
    { levelId: 1, status: "completed" },
    { levelId: 1, status: "completed" },
    { levelId: 2, status: "abandoned" },
    { levelId: 2, status: "completed" },
    { levelId: 3, status: "in_progress" },
  ];

  it("counts each level once, when it has a completed session", () => {
    expect(levelsCompleted(sessions)).toBe(2);
  });

  it("counts every completed session, also a second one on the same level", () => {
    expect(completedSessions(sessions)).toBe(3);
  });

  it("is 0 for a new learner", () => {
    expect(levelsCompleted([])).toBe(0);
    expect(completedSessions([])).toBe(0);
  });
});

describe("mistakes by type", () => {
  it("counts the failed attempts of each mistake type, most first", () => {
    const attempts = [
      attempt(1, false, 1, "short_power"),
      attempt(1, false, 2, "missing_ground"),
      attempt(2, false, 3, "short_power"),
      attempt(2, true, 4),
      attempt(3, false, 5, "wrong_pin"),
      attempt(3, false, 6, "short_power"),
      attempt(3, false, 7, "wrong_pin"),
    ];
    expect(mistakesByType(attempts)).toEqual([
      { type: "short_power", count: 3 },
      { type: "wrong_pin", count: 2 },
      { type: "missing_ground", count: 1 },
    ]);
  });

  it("puts types with the same count in name order, so the chart does not change between visits", () => {
    const attempts = [attempt(1, false, 1, "wrong_pin"), attempt(1, false, 2, "missing_ground")];
    expect(mistakesByType(attempts).map((m) => m.type)).toEqual(["missing_ground", "wrong_pin"]);
  });

  it("does not count passed attempts or failed attempts with no type", () => {
    expect(mistakesByType([attempt(1, true, 1), attempt(1, false, 2, null)])).toEqual([]);
  });
});

describe("top mistakes", () => {
  it("gives the 3 most frequent mistake types, each with its count and the level where it happened most", () => {
    const attempts = [
      attempt(1, false, 1, "short_power"),
      attempt(2, false, 2, "short_power"),
      attempt(2, false, 3, "short_power"),
      attempt(3, false, 4, "wrong_pin"),
      attempt(3, false, 5, "wrong_pin"),
      attempt(1, false, 6, "missing_ground"),
      attempt(2, false, 7, "reversed_led"),
      attempt(2, true, 8),
    ];
    expect(topMistakes(attempts)).toEqual([
      { type: "short_power", count: 3, levelId: 2 },
      { type: "wrong_pin", count: 2, levelId: 3 },
      { type: "missing_ground", count: 1, levelId: 1 },
    ]);
  });

  it("puts a level tie in the lower level id, so the link does not change between visits", () => {
    const attempts = [attempt(3, false, 1, "wrong_pin"), attempt(1, false, 2, "wrong_pin")];
    expect(topMistakes(attempts)).toEqual([{ type: "wrong_pin", count: 2, levelId: 1 }]);
  });

  it("gives all the types when there are fewer than 3", () => {
    expect(topMistakes([attempt(1, false, 1, "short_power")])).toEqual([{ type: "short_power", count: 1, levelId: 1 }]);
  });

  it("is empty with no failed attempts", () => {
    expect(topMistakes([attempt(1, true, 1)])).toEqual([]);
  });
});

describe("terms learned", () => {
  const terms: Term[] = [
    { project: "perch", level: 1, term: "Breadboard", definition: "A board with holes." },
    { project: "perch", level: 2, term: "Button", definition: "A part that joins two wires while you press it." },
    { project: "arduino-foundations", level: 2, term: "LED", definition: "A small light." },
  ];

  it("returns only the terms of the levels that the learner passed", () => {
    expect(termsLearned(terms, [{ project: "perch", level: 2 }]).map((t) => t.term)).toEqual(["Button"]);
  });

  it("keeps the order of the content", () => {
    const passed = [
      { project: "perch", level: 2 },
      { project: "perch", level: 1 },
    ];
    expect(termsLearned(terms, passed).map((t) => t.term)).toEqual(["Breadboard", "Button"]);
  });

  it("does not count a level of another project that has the same number", () => {
    expect(termsLearned(terms, [{ project: "perch", level: 2 }]).some((t) => t.project === "arduino-foundations")).toBe(false);
  });

  it("is empty when no level is passed, so a new learner sees no terms", () => {
    expect(termsLearned(terms, [])).toEqual([]);
  });
});

describe("terms by letter", () => {
  const terms: Term[] = [
    { project: "perch", level: 2, term: "Resistor", definition: "A small part." },
    { project: "perch", level: 1, term: "3V3", definition: "A pin." },
    { project: "perch", level: 1, term: "Ground", definition: "The way back." },
    { project: "perch", level: 2, term: "anode", definition: "The long leg." },
    { project: "perch", level: 2, term: "GPIO pin", definition: "A pin that the board controls." },
  ];

  it("groups the terms under their first letter, in alphabetical order, like a dictionary", () => {
    expect(termsByLetter(terms).map((g) => [g.letter, g.terms.map((t) => t.term)])).toEqual([
      ["3", ["3V3"]],
      ["A", ["anode"]],
      ["G", ["GPIO pin", "Ground"]],
      ["R", ["Resistor"]],
    ]);
  });

  it("is empty with no terms, so a new learner sees no letters", () => {
    expect(termsByLetter([])).toEqual([]);
  });
});
