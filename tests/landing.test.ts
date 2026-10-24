import { describe, expect, it } from "vitest";
import boardsFile from "@/content/boards/perch.json";
import text from "@/content/ui/landing.json";
import { boardsSchema } from "@/lib/content/schema";
import { loadProjects } from "@/lib/content/load";
import { HOLD_TICKS, landingParts, wiringOrder } from "@/lib/game/landing";

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

describe("content/ui/landing.json", () => {
  it("has the pitch, the greeting of Volt, the 3 steps and the two buttons", () => {
    expect(text.pitch.title).not.toBe("");
    expect(text.volt).not.toBe("");
    expect(text.steps.items).toHaveLength(3);
    expect(text.signUp).toBe("Sign up");
    expect(text.logIn).toBe("Log in");
  });

  it("shows the available projects and the Coming soon projects from the catalog", () => {
    const projects = loadProjects();
    expect(projects.filter((p) => p.status === "available").map((p) => p.slug)).toEqual(["perch", "arduino-foundations"]);
    expect(projects.filter((p) => p.status === "coming_soon")).toHaveLength(4);
  });
});
