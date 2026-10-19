import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placeConnections } from "@/lib/game/engine";
import { loadProjects } from "@/lib/content/load";
import { taskSchema } from "@/lib/content/schema";
import dashboard from "@/content/ui/dashboard.json";
import avatars from "@/content/ui/avatars.json";

const projects = loadProjects();
const levels = projects.flatMap((p) => p.levels.map((l) => ({ project: p.slug, ...l })));
const tasks = levels.flatMap((l) => l.tasks.map((t) => ({ where: `${l.project} level ${l.position}`, ...t })));
const isInOrder = (xs: { position: number }[]) => xs.every((x, i) => x.position === i + 1);
const pair = (c: { a: string; b: string }) => [c.a, c.b].sort().join(" ~ ");

describe("content/projects", () => {
  it("has the 6 catalog projects, with Perch the only available one", () => {
    expect(projects.map((p) => p.slug)).toEqual([
      "perch",
      "arduino-foundations",
      "desk-weather-station",
      "plant-watering-monitor",
      "focus-timer",
      "line-following-robot",
    ]);
    expect(projects.filter((p) => p.status === "available").map((p) => p.slug)).toEqual(["perch"]);
  });

  it("gives Perch 5 levels", () => {
    expect(projects[0].levels.map((l) => l.title)).toEqual([
      "Set up the board",
      "Talk button and status light",
      "Ears",
      "Voice",
      "Face",
    ]);
  });

  it("numbers projects, levels and tasks 1, 2, 3… with no gaps", () => {
    expect(isInOrder(projects)).toBe(true);
    for (const p of projects) expect(isInOrder(p.levels), p.slug).toBe(true);
    for (const l of levels) expect(isInOrder(l.tasks), `${l.project} level ${l.position}`).toBe(true);
  });

  it("gives every task a target, a why and a source", () => {
    expect(tasks.length).toBeGreaterThan(0);
    for (const t of tasks) {
      expect(t.target, t.where).toBeDefined();
      expect(t.popup_why.trim(), t.where).not.toBe("");
      expect(t.source_url, t.where).toMatch(/^https:\/\//);
    }
  });

  it("makes each level require exactly the connections that its tasks teach", () => {
    for (const l of levels) {
      // A wire task teaches one connection. A part that goes into a terminal (the speaker) teaches one for each lead.
      const taught = l.tasks.flatMap((t) => (t.target.kind === "wire" ? [pair(t.target)] : placeConnections(t.target).map(pair)));
      expect(l.rules.require.map(pair).sort(), `${l.project} level ${l.position}`).toEqual(taught.sort());
    }
  });

  it("gives each forbidden connection a mistake code and a message", () => {
    for (const l of levels) {
      for (const f of l.rules.forbid) {
        expect(f.code).not.toBe("");
        expect(f.message).not.toBe("");
      }
    }
  });
});

describe("content/ui/dashboard.json", () => {
  it("gives each mistake code of a level Check a plain label for the chart", () => {
    const codes = new Set(["missing_ground", "wrong_pin", ...levels.flatMap((l) => l.rules.forbid.map((f) => f.code))]);
    const labels: Record<string, string> = dashboard.mistakes;
    for (const code of codes) expect(labels[code], code).toBeTruthy();
  });
});

describe("content/ui/avatars.json", () => {
  it("has 5 characters, each with a unique id and an image in public/avatars", () => {
    const ids = avatars.avatars.map((a) => a.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(existsSync(`public/avatars/${id}.svg`)).toBe(true);
  });
});

describe("taskSchema", () => {
  const task = {
    position: 1,
    kind: "wire",
    instruction: "Connect WS to GPIO 4.",
    popup_why: "WS selects the channel.",
    concept: null,
    target: { kind: "wire", a: "mic1.WS", b: "esp.GPIO4" },
    source_url: "https://example.com/datasheet",
    xp: 10,
  };

  it("accepts a complete task", () => {
    expect(taskSchema.safeParse(task).success).toBe(true);
  });

  it("refuses a task without a why or a source", () => {
    expect(taskSchema.safeParse({ ...task, popup_why: "" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...task, source_url: undefined }).success).toBe(false);
  });

  it("refuses a task whose kind does not match its target", () => {
    expect(taskSchema.safeParse({ ...task, kind: "place" }).success).toBe(false);
  });

  it("refuses an endpoint that is not <part>.<pin>", () => {
    expect(taskSchema.safeParse({ ...task, target: { kind: "wire", a: "WS", b: "esp.GPIO4" } }).success).toBe(false);
  });
});
