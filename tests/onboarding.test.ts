import { describe, expect, it } from "vitest";
import text from "@/content/ui/onboarding.json";
import { isVisitorPage, needsLogin } from "@/lib/auth/rules";
import { loadProjects } from "@/lib/content/load";
import { pickFeatured } from "@/lib/game/featured";
import { needsOnboarding, QUESTION_IDS, startAnswerFor, startCookie, startProject } from "@/lib/game/onboarding";

const AVAILABLE = ["perch", "arduino-foundations"];

const START = text.questions.start.options;

describe("QUESTION_IDS (issue #152)", () => {
  it("asks the same questions of each visitor, and ends with where to start", () => {
    expect(QUESTION_IDS).toEqual(["make", "why", "level", "goal", "start"]);
  });
});

describe("startProject", () => {
  it("opens the project of the start answer", () => {
    expect(startProject({ start: "basics" }, START, AVAILABLE)).toBe("arduino-foundations");
    expect(startProject({ start: "device" }, START, AVAILABLE)).toBe("perch");
  });

  it("gives no project with no start answer, or for a project that is not available", () => {
    expect(startProject({ make: "robot" }, START, AVAILABLE)).toBeNull();
    expect(startProject({ start: "device" }, START, ["arduino-foundations"])).toBeNull();
  });
});

describe("startAnswerFor", () => {
  it("gives the start answer for a project link, and null for a project that no answer opens", () => {
    expect(startAnswerFor("perch", START)).toBe("device");
    expect(startAnswerFor("arduino-foundations", START)).toBe("basics");
    expect(startAnswerFor("focus-timer", START)).toBeNull();
    expect(startAnswerFor(null, START)).toBeNull();
  });
});

describe("the start cookie", () => {
  it("writes a cookie for one year that the lobby can read", () => {
    expect(startCookie("perch")).toBe("jumper_start=perch; path=/; max-age=31536000; samesite=lax");
  });
});

describe("needsOnboarding", () => {
  it("sends a new visitor with no start cookie to the onboarding before sign-up", () => {
    expect(needsOnboarding(undefined)).toBe(true);
    expect(needsOnboarding("")).toBe(true);
  });

  it("lets a visitor who answered the questions open the sign-up form", () => {
    expect(needsOnboarding("perch")).toBe(false);
  });
});

describe("pickFeatured", () => {
  const catalog = [
    { slug: "perch", status: "available" as const },
    { slug: "arduino-foundations", status: "available" as const },
    { slug: "focus-timer", status: "coming_soon" as const },
  ];

  it("uses the onboarding choice for a learner who has not started a level", () => {
    expect(pickFeatured(catalog, "arduino-foundations", false)?.slug).toBe("arduino-foundations");
  });

  it("keeps the first available project for a learner who has started, or with no choice", () => {
    expect(pickFeatured(catalog, "arduino-foundations", true)?.slug).toBe("perch");
    expect(pickFeatured(catalog, null, false)?.slug).toBe("perch");
  });

  it("never features a Coming soon project", () => {
    expect(pickFeatured(catalog, "focus-timer", false)?.slug).toBe("perch");
  });
});

describe("/start", () => {
  it("is a visitor page: no log-in, and a logged-in user goes to the lobby", () => {
    expect(needsLogin("/start")).toBe(false);
    expect(isVisitorPage("/start")).toBe(true);
  });
});

describe("content/ui/onboarding.json", () => {
  it("has a question with options for each question id, and each start option opens an available project", () => {
    for (const id of QUESTION_IDS) expect(text.questions[id].options.length).toBeGreaterThan(1);
    const available = loadProjects().filter((p) => p.status === "available").map((p) => p.slug);
    for (const option of START) expect(available).toContain(option.project);
  });

  it("names no project and no board in the questions", () => {
    const names = loadProjects().flatMap((p) => [p.title.split(":")[0], p.board]);
    const words = JSON.stringify(text.questions);
    for (const name of names) expect(words, name).not.toContain(name);
  });
});
