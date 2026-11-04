import { describe, expect, it } from "vitest";
import text from "@/content/ui/onboarding.json";
import { isVisitorPage, needsLogin } from "@/lib/auth/rules";
import { loadProjects } from "@/lib/content/load";
import { pickFeatured } from "@/lib/game/featured";
import { questionIds, startCookie, startProject } from "@/lib/game/onboarding";

const AVAILABLE = ["perch", "arduino-foundations"];

describe("questionIds (issue #152)", () => {
  it("asks where to start only when the learner picks Perch", () => {
    expect(questionIds({})).toEqual(["build", "why", "level", "goal"]);
    expect(questionIds({ build: "arduino-foundations" })).toEqual(["build", "why", "level", "goal"]);
    expect(questionIds({ build: "perch" })).toEqual(["build", "why", "level", "goal", "start"]);
  });
});

describe("startProject", () => {
  it("opens the project that the learner picked", () => {
    expect(startProject({ build: "perch", start: "picked" }, AVAILABLE)).toBe("perch");
    expect(startProject({ build: "arduino-foundations" }, AVAILABLE)).toBe("arduino-foundations");
  });

  it("opens Arduino Foundations when the learner wants the basics first", () => {
    expect(startProject({ build: "perch", start: "basics" }, AVAILABLE)).toBe("arduino-foundations");
  });

  it("gives no project for a project that is not available, or no answer", () => {
    expect(startProject({ build: "desk-weather-station" }, AVAILABLE)).toBeNull();
    expect(startProject({}, AVAILABLE)).toBeNull();
  });
});

describe("the start cookie", () => {
  it("writes a cookie for one year that the lobby can read", () => {
    expect(startCookie("perch")).toBe("jumper_start=perch; path=/; max-age=31536000; samesite=lax");
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
  it("has a question with options for each question id, and the build options are catalog projects", () => {
    for (const id of ["build", "why", "level", "goal", "start"] as const) expect(text.questions[id].options.length).toBeGreaterThan(1);
    const slugs = loadProjects().map((p) => p.slug);
    for (const option of text.questions.build.options) expect(slugs).toContain(option.value);
  });
});
