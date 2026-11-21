import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import { buildNets, connected, endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards } from "@/lib/content/boards";
import { loadLesson } from "@/lib/content/lessons";
import { loadProjects } from "@/lib/content/load";
import { loadSketchStep } from "@/lib/content/sketches";
import { linkedTargets } from "@/lib/journey/select";

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

// Issue #208: the photos of the real circuit (SparkFun, CC BY-SA 4.0). The license needs the credit on each photo.
describe("the photos of the af-led lesson", () => {
  const photos = Object.entries(lesson.media?.photos ?? {});

  it("has a reference photo and a second layout, each with a file of less than 1 MB", () => {
    expect(photos.map(([key]) => key).sort()).toEqual(["layout2", "ref"]);
    for (const [key, photo] of photos) {
      const file = path.join(process.cwd(), "public", photo.src);
      expect(existsSync(file), `${key}: ${photo.src}`).toBe(true);
      expect(statSync(file).size, key).toBeLessThan(1_000_000);
    }
  });

  it("gives a credit, a license and the changes for each photo", () => {
    for (const [key, photo] of photos) {
      expect(photo.credit.author, key).toBe("SparkFun Electronics");
      expect(photo.credit.license, key).toBe("CC BY-SA 4.0");
      expect(photo.credit.licenseUrl, key).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
      expect(photo.credit.source, key).toMatch(/^https:\/\/learn\.sparkfun\.com\//);
      expect(photo.credit.changes.length, key).toBeGreaterThan(10);
      expect(photo.alt.length, key).toBeGreaterThan(60);
    }
  });

  it("puts each point on a photo of the lesson, in the picture, and no two points of a photo in one place", () => {
    const keys = new Set(photos.map(([key]) => key));
    for (const t of lesson.map.terminals) {
      for (const [key, spot] of Object.entries(t.photos ?? {})) {
        expect(keys.has(key), `${t.id}: ${key}`).toBe(true);
        expect(spot.x > 0.02 && spot.x < 0.98 && spot.y > 0.02 && spot.y < 0.98, `${t.id}: ${key}`).toBe(true);
      }
    }
    for (const key of keys) {
      const spots = lesson.map.terminals.flatMap((t) => (t.photos?.[key] ? [{ id: t.id, ...t.photos[key] }] : []));
      for (const a of spots) for (const b of spots) if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.y - b.y), `${key}: ${a.id} and ${b.id}`).toBeGreaterThan(0.025);
    }
  });

  it("shows only the terminals that are in each photo", () => {
    const on = (key: string) => lesson.map.terminals.filter((t) => t.photos?.[key]).map((t) => t.id).sort();
    // The reference photo has no 5 V wire, and its black wire goes directly to GND: no + line and no − line.
    expect(on("ref")).toEqual(["led1.anode", "led1.cathode", "r1.1", "r1.2", "uno.D13", "uno.GND"]);
    // The second layout uses the − line. It has no 5 V wire.
    expect(on("layout2")).toEqual(["bbA.-", "led1.anode", "led1.cathode", "r1.1", "r1.2", "uno.D13", "uno.GND"]);
    expect(linkedTargets(lesson.map, "c-5v-rail", bench, baseline)!.photos).toEqual({});
    expect(linkedTargets(lesson.map, "c-gnd-rail", bench, baseline)!.photos.ref).toHaveLength(1);
  });

  it("has a note only for a connection of the map", () => {
    const ids = new Set(lesson.map.connections.map((c) => c.id));
    for (const [key, photo] of photos) for (const id of Object.keys(photo.notes ?? {})) expect(ids.has(id), `${key}: ${id}`).toBe(true);
  });
});
