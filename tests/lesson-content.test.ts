import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import { buildNets, connected, endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { loadProjects } from "@/lib/content/load";
import { loadSketchStep } from "@/lib/content/sketches";

// TRD addendum 6.1: the lesson file agrees with the board, the level and the list of supported changes.

const lesson = (await loadLesson("af-led"))!;
const bench = createBench(await loadBenchSpec(lesson.project));
const boards = await loadBoards(lesson.project);
const baseline: Part[] = lesson.baseline.levels.flatMap((level) => boards.levels[level]);
const nets = buildNets(bench, baseline);
const holes = new Set(bench.holes.map((h) => h.id));

describe("the af-led lesson file", () => {
  it("loads, and an unknown lesson gives null", async () => {
    expect(lesson.id).toBe("af-led");
    expect(lesson.version).toBeGreaterThan(0);
    expect(await loadLesson("no-such-lesson")).toBeNull();
    expect(await loadLesson("../projects/perch")).toBeNull();
  });

  it("points to a level with a code step, and its board levels exist", async () => {
    const project = loadProjects().find((p) => p.slug === lesson.project);
    expect(project?.levels.some((l) => l.position === lesson.level)).toBe(true);
    expect(await loadSketchStep(lesson.project, lesson.level)).not.toBeNull();
    for (const level of lesson.baseline.levels) expect(boards.levels[level]).toBeDefined();
  });

  it("has concepts, and each part of the kit is on the reference board or is the main board", () => {
    expect(lesson.concepts.length).toBeGreaterThan(0);
    for (const item of lesson.inventory) expect(item.id === bench.board.id || baseline.some((p) => p.id === item.id)).toBe(true);
  });

  it("maps terminals that are on the reference board, with ids used one time", () => {
    const ids = lesson.map.terminals.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(endpointHole(bench, baseline, id), id).not.toBeNull();
  });

  it("maps connections between mapped terminals, and each one is really connected on the reference board", () => {
    const terminals = new Set(lesson.map.terminals.map((t) => t.id));
    const ids = lesson.map.connections.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of lesson.map.connections) {
      expect(terminals.has(c.a) && terminals.has(c.b), c.id).toBe(true);
      expect(connected(bench, baseline, nets, c.a, c.b), c.id).toBe(true);
    }
  });

  it("has a valid list of changes: a supported change has ops and a model result, a change that is not supported has a reason", () => {
    const ids = lesson.changes.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson.changes.some((c) => c.supported)).toBe(true);
    for (const c of lesson.changes) {
      if (c.supported) expect(c.ops && c.model, c.id).toBeTruthy();
      else expect(c.reason, c.id).toBeTruthy();
    }
  });

  it("uses only holes that the bench has, and only parts that are on the reference board, in its changes", () => {
    for (const c of lesson.changes) {
      for (const op of c.ops ?? []) {
        if (op.op === "place" || op.op === "wire") for (const hole of [op.a, op.b]) expect(holes.has(hole), `${c.id}: ${hole}`).toBe(true);
        if (op.op === "place" || op.op === "remove") expect(baseline.some((p) => p.id === op.part), `${c.id}: ${op.part}`).toBe(true);
      }
    }
  });
});
