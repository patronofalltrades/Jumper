import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import boardsFile from "@/content/boards/perch.json";
import text from "@/content/ui/landing.json";
import { boardsSchema } from "@/lib/content/schema";
import { loadProjects } from "@/lib/content/load";
import { perchBench } from "@/lib/circuit/bench";
import { startProgress, step } from "@/lib/game/engine";
import type { LegPart } from "@/lib/circuit/parts";
import { firstWire, HOLD_TICKS, keptWire, landingParts, levelAt, REVEAL_TICK_MS, revealMs, scrollCount, wiringOrder } from "@/lib/game/landing";

const boards = boardsSchema.parse(boardsFile);
const order = wiringOrder(boards);
const ids = (parts: { id: string }[]) => parts.map((p) => p.id);

describe("wiringOrder", () => {
  it("adds the parts of level 1, then level 2, and so on, each in task order", () => {
    const expected = Object.keys(boards.levels)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((level) => ids(boards.levels[level]));
    expect(ids(order)).toEqual(expected);
    expect(ids(order).slice(0, 5)).toEqual(["w1", "w2", "w3", "w4", "btn1"]);
  });

  it("puts a module before the wires and leads that go into it", () => {
    for (const [i, part] of order.entries()) {
      if (!("a" in part)) continue;
      for (const end of [part.a, part.b]) {
        const owner = end.includes(".") ? end.split(".")[0] : null;
        if (owner) expect(ids(order.slice(0, i))).toContain(owner);
      }
    }
  });
});

describe("landingParts", () => {
  it("starts with an empty board and adds one part at each tick", () => {
    expect(landingParts(order, 0, false)).toEqual([]);
    expect(ids(landingParts(order, 1, false))).toEqual(["w1"]);
    expect(ids(landingParts(order, 2, false))).toEqual(["w1", "w2"]);
    expect(landingParts(order, order.length, false)).toEqual(order);
  });

  it("keeps the finished board for a short time, then starts again", () => {
    for (let t = order.length; t <= order.length + HOLD_TICKS; t++) expect(landingParts(order, t, false)).toEqual(order);
    expect(landingParts(order, order.length + HOLD_TICKS + 1, false)).toEqual([]);
    expect(ids(landingParts(order, order.length + HOLD_TICKS + 2, false))).toEqual(["w1"]);
  });

  it("shows the finished board at once with reduced motion", () => {
    for (const t of [0, 1, 7, 500]) expect(landingParts(order, t, true)).toEqual(order);
  });
});

describe("revealMs", () => {
  it("gives one tick for each part, and the full board in less than 5 seconds", () => {
    expect(revealMs([])).toBe(0);
    expect(revealMs(order)).toBe(order.length * REVEAL_TICK_MS);
    expect(revealMs(order)).toBeLessThan(5000);
  });
});

describe("firstWire", () => {
  const target = loadProjects()
    .find((p) => p.slug === text.board.project)!
    .levels[0].tasks.find((task) => task.kind === "wire")!.target;
  const first = firstWire(order, target)!;
  const bench = perchBench();
  const task = { ...startProgress(), phase: "task" as const };

  it("gives the first wire of the board to the visitor", () => {
    expect(first.wire).toEqual(order[0]);
    expect(first.rest).toEqual(order.slice(1));
    expect(first.plan.tasks).toHaveLength(1);
    expect(firstWire(order.slice(4), target)).toBeNull();
    expect(firstWire(order, undefined)).toBeNull();
    expect(firstWire([], target)).toBeNull();
  });

  it("is done when the visitor makes that wire", () => {
    const { progress, effect } = step(bench, first.plan, task, { type: "change", before: [], after: [first.wire] });
    expect(effect).toBe("snap");
    expect(progress.tasksDone).toBe(1);
    expect(progress.phase).toBe("ready_to_check");
  });

  it("is a mistake when the visitor makes a different wire", () => {
    const wrong = { ...first.wire, id: "wrong", a: "A-a30", b: "B-j30" };
    const { progress, effect } = step(bench, first.plan, task, { type: "change", before: [], after: [wrong] });
    expect(effect).toBe("buzz");
    expect(progress.phase).toBe("mistake");
    expect(progress.tasksDone).toBe(0);
  });
});

describe("keptWire", () => {
  const wire = order[0] as LegPart;
  const rest = order.slice(1);

  it("keeps the wire of the visitor when its holes are free on the finished board", () => {
    const made = { ...wire, id: "v1", b: "A-L+2" };
    expect(keptWire(made, wire, rest)).toBe(made);
  });

  it("uses the wire of the project when a later part needs a hole, or when the visitor made no wire", () => {
    const later = rest.find((p) => p.type === "wire") as LegPart;
    expect(keptWire({ ...wire, id: "v1", b: later.a }, wire, rest)).toBe(wire);
    expect(keptWire(undefined, wire, rest)).toBe(wire);
  });
});

describe("scrollCount", () => {
  it("has the start parts at the top, all the parts at the end, and more parts as the visitor scrolls", () => {
    expect(scrollCount(0, 4, 35)).toBe(4);
    expect(scrollCount(1, 4, 35)).toBe(35);
    expect(scrollCount(0.5, 4, 35)).toBe(20);
    for (let p = 0; p < 1; p += 0.05) expect(scrollCount(p + 0.05, 4, 35)).toBeGreaterThanOrEqual(scrollCount(p, 4, 35));
  });

  it("stays in range for a scroll position below 0 or above 1", () => {
    expect(scrollCount(-0.3, 4, 35)).toBe(4);
    expect(scrollCount(1.7, 4, 35)).toBe(35);
    expect(scrollCount(0.5, 40, 35)).toBe(35);
  });
});

describe("levelAt", () => {
  const sizes = Object.keys(boards.levels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => boards.levels[level].length);

  it("gives the level of the last part on the board", () => {
    expect(levelAt(0, sizes)).toBe(0);
    expect(levelAt(sizes[0], sizes)).toBe(0);
    expect(levelAt(sizes[0] + 1, sizes)).toBe(1);
    expect(levelAt(order.length, sizes)).toBe(sizes.length - 1);
    expect(levelAt(order.length + 5, sizes)).toBe(sizes.length - 1);
    expect(levelAt(3, [])).toBe(0);
  });
});

describe("content/ui/landing.json", () => {
  it("has the hero, the tutor cards, the 4 steps and the buttons (issue #152)", () => {
    expect(text.pitch.title_start).not.toBe("");
    expect(text.volt).not.toBe("");
    expect(text.tutor.wiring).toHaveLength(4);
    expect(text.tutor.codeCards).toHaveLength(4);
    expect(text.steps.items).toHaveLength(4);
    expect(text.getStarted).toBe("Get started");
    expect(text.haveAccount).toBe("I already have an account");
    expect(text.logIn).toBe("Log in");
  });

  it("has the footer text (issue #172)", () => {
    for (const value of Object.values(text.footer)) expect(value).not.toBe("");
    expect(text.signUp).toBe("Sign up");
  });

  it("uses step pictures that are in public/ and projects that are in the catalog", () => {
    for (const step of text.steps.items) if ("image" in step && step.image) expect(existsSync(join("public", step.image))).toBe(true);
    const slugs = loadProjects().map((p) => p.slug);
    for (const slug of text.courses.show) expect(slugs).toContain(slug);
    // The hero board (issue #171): its project is in the catalog.
    expect(slugs).toContain(text.board.project);
  });

  it("shows the available projects and the Coming soon projects from the catalog", () => {
    const projects = loadProjects();
    expect(projects.filter((p) => p.status === "available").map((p) => p.slug)).toEqual(["perch", "arduino-foundations"]);
    expect(projects.filter((p) => p.status === "coming_soon")).toHaveLength(4);
  });
});
