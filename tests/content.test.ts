import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import { buildNets, connected } from "@/lib/circuit/nets";
import { placeConnections } from "@/lib/game/engine";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { loadTerms } from "@/lib/content/terms";
import { taskSchema } from "@/lib/content/schema";
import dashboard from "@/content/ui/dashboard.json";
import avatars from "@/content/ui/avatars.json";

const projects = loadProjects();
const levels = projects.flatMap((p) => p.levels.map((l) => ({ project: p.slug, ...l })));
const tasks = levels.flatMap((l) => l.tasks.map((t) => ({ where: `${l.project} level ${l.position}`, ...t })));
const isInOrder = (xs: { position: number }[]) => xs.every((x, i) => x.position === i + 1);
const pair = (c: { a: string; b: string }) => [c.a, c.b].sort().join(" ~ ");

describe("content/projects", () => {
  it("has the 6 catalog projects, with Perch and Arduino Foundations available (issue #57)", () => {
    expect(projects.map((p) => p.slug)).toEqual([
      "perch",
      "arduino-foundations",
      "desk-weather-station",
      "plant-watering-monitor",
      "focus-timer",
      "line-following-robot",
    ]);
    expect(projects.filter((p) => p.status === "available").map((p) => p.slug)).toEqual(["perch", "arduino-foundations"]);
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

  it("makes each level require the connections that its tasks teach, and others only if the start board has them", async () => {
    for (const l of levels) {
      // A wire task teaches one connection. A part that goes into a terminal (the speaker) teaches one for each lead.
      const taught = l.tasks.flatMap((t) => (t.target.kind === "wire" ? [pair(t.target)] : placeConnections(t.target).map(pair)));
      const required = l.rules.require.map(pair);
      for (const c of taught) expect(required, `${l.project} level ${l.position}`).toContain(c);
      // Arduino Foundations level 4 also requires the button of level 3, which is on its start board.
      const bench = createBench(await loadBenchSpec(l.project));
      const start = startBoard(await loadBoards(l.project), l.position);
      const nets = buildNets(bench, start);
      for (const r of l.rules.require.filter((r) => !taught.includes(pair(r)))) {
        expect(connected(bench, start, nets, r.a, r.b), `${l.project} level ${l.position}: ${pair(r)}`).toBe(true);
      }
    }
  });

  it("says which red + or blue − line a task means: the side and the breadboard, as in open_rails (issue #100)", async () => {
    for (const p of projects.filter((p) => p.status === "available")) {
      const spec = await loadBenchSpec(p.slug);
      const side = { L: "left", R: "right" } as const;
      for (const t of p.levels.flatMap((l) => l.tasks)) {
        for (const m of t.instruction.matchAll(/(red \+|blue −) line(?: on the (left|right) side of breadboard ([A-Z]))?/g)) {
          const sign = m[1].startsWith("red") ? "+" : "-";
          const rail = m[3] && spec.open_rails[m[3]]?.[sign];
          expect(rail && m[2] === side[rail[0] as "L" | "R"], `${p.slug}: ${t.instruction}`).toBeTruthy();
        }
      }
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

describe("content/terms", () => {
  const terms = loadTerms();

  it("has terms for Perch and Arduino Foundations, and each term has a level of its project", () => {
    expect(new Set(terms.map((t) => t.project))).toEqual(new Set(["perch", "arduino-foundations"]));
    for (const t of terms) {
      const level = projects.find((p) => p.slug === t.project)?.levels.find((l) => l.position === t.level);
      expect(level, `${t.project} level ${t.level}: ${t.term}`).toBeDefined();
    }
  });

  it("has no term twice in one project", () => {
    const keys = terms.map((t) => `${t.project} ${t.term}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("writes each sentence of a definition in 20 words or fewer (ASD-STE100)", () => {
    for (const t of terms) {
      for (const sentence of t.definition.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).length, `${t.term}: ${sentence}`).toBeLessThanOrEqual(20);
      }
    }
  });
});
