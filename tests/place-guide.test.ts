import { describe, expect, it } from "vitest";
import { createBench, perchBench, type Bench } from "@/lib/circuit/bench";
import { checkLevel, joinRules } from "@/lib/circuit/check";
import { checkPlacement, type Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard, startLevels } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { needsAck, startProgress, step, taskSpot, toolFor, type Effect, type Plan, type Progress, type Target } from "@/lib/game/engine";

// Issue #101: a resistor or LED place task glows good holes and gives two taps, from the finished board of the level.

/** The lines of 5 (strips) that have a pin of the main board. */
const pinStrips = (bench: Bench) => new Set(bench.pins.map((p) => bench.byId.get(p.hole)!.strip));

/** A resistor or LED place task on a breadboard. */
const isLegPlace = (target: Target) => target.kind === "place" && (toolFor(target.part) === "resistor" || toolFor(target.part) === "led");

/** The part that a learner makes when they tap only the arrow holes of the task. */
function tapPart(target: Target, taps: string[], n: number): Part {
  if (target.kind === "wire") return { id: `g${n}`, type: "wire", a: taps[0], b: taps[1] };
  const type = toolFor(target.part)!;
  if (type === "wire" || type === "resistor" || type === "led" || type === "speaker") return { id: target.id, type, a: taps[0], b: taps[1] };
  return { id: target.id, type, at: taps[0] };
}

describe("a learner who taps only the arrow holes", () => {
  for (const project of loadProjects()) {
    for (const level of project.levels) {
      it(`${project.slug} level ${level.position}: passes every task with no mistake, and passes Check`, async () => {
        const bench = createBench(await loadBenchSpec(project.slug));
        const boards = await loadBoards(project.slug);
        const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
        const finish = boards.levels[level.position] ?? [];
        const pins = pinStrips(bench);
        let board = startBoard(boards, level.position);
        let progress: Progress = startProgress();
        const effects: Effect[] = [];
        const send = (event: Parameters<typeof step>[3]) => {
          const next = step(bench, plan, progress, event);
          progress = next.progress;
          effects.push(next.effect);
        };

        send({ type: "start" });
        for (let n = 0; progress.phase === "task" && n < 100; n++) {
          const { target } = plan.tasks[progress.index];
          if (needsAck(target)) {
            send({ type: "ack", parts: board });
            continue;
          }
          const spot = taskSpot(bench, board, target, progress.swaps, finish);
          if (isLegPlace(target)) {
            expect(spot.taps, `task ${progress.index + 1}`).toHaveLength(2);
            for (const h of [...spot.holes, ...spot.taps]) expect(pins.has(bench.byId.get(h)!.strip), `${h} is in a line with a board pin`).toBe(false);
          }
          const after = [...board, tapPart(target, spot.taps, n)];
          send({ type: "change", before: board, after });
          board = after;
          expect(progress.mistake, `task ${progress.index + 1}`).toBeNull();
        }

        expect(effects.every((e) => e === "snap" || e === null)).toBe(true);
        expect(progress).toMatchObject({ phase: "ready_to_check", mistakes: 0, tasksDone: level.tasks.length });
        const rules = joinRules(project.levels, [...startLevels(boards, level.position), level.position]);
        expect(checkLevel(bench, board, rules)).toEqual({ passed: true });
      });
    }
  }
});

describe("resistor and LED guide holes", () => {
  const bench = perchBench();
  const perch = loadProjects().find((p) => p.slug === "perch")!;
  const level2 = perch.levels.find((l) => l.position === 2)!;
  const resistor = level2.tasks.find((t) => t.target.kind === "place" && t.target.id === "r1")!.target;
  const led = level2.tasks.find((t) => t.target.kind === "place" && t.target.id === "led1")!.target;

  it("glows the holes of the level clip for Perch level 2: resistor A-a2 and A-a4, LED A-b4 (long leg) and A-b3", async () => {
    const boards = await loadBoards("perch");
    const finish = boards.levels[2];
    const before = startBoard(boards, 2);
    const r = taskSpot(bench, before, resistor, [], finish);
    expect(r.taps).toEqual(["A-a2", "A-a4"]);
    expect(r.holes).toEqual(["A-a2", "A-a4"]);
    const at = bench.byId.get("A-a2")!;
    expect(r.at).toEqual({ x: at.x, z: at.z });

    const withResistor: Part[] = [...before, { id: "r1", type: "resistor", a: "A-a2", b: "A-a4" }];
    expect(taskSpot(bench, withResistor, led, [], finish).taps).toEqual(["A-b4", "A-b3"]);
  });

  it("does not point at the center of breadboard A (A-f15, the line of GPIO37)", () => {
    const spot = taskSpot(bench, [], resistor);
    expect(spot.taps).toHaveLength(2);
    expect(spot.taps).not.toContain("A-f15");
  });

  it("uses the nearest free holes in lines with no board pin when a hole of the finished board is taken", async () => {
    const boards = await loadBoards("perch");
    const finish = boards.levels[2];
    const board: Part[] = [...startBoard(boards, 2), { id: "w99", type: "wire", a: "A-a2", b: "A-L-2" }];
    const spot = taskSpot(bench, board, resistor, [], finish);
    expect(spot.taps).toHaveLength(2);
    expect(spot.taps).not.toContain("A-a2");
    expect(checkPlacement(bench, board, "resistor", spot.taps[0], spot.taps[1])).toBeNull();
    const pins = pinStrips(bench);
    for (const h of spot.taps) expect(pins.has(bench.byId.get(h)!.strip)).toBe(false);
  });

  it("puts the long leg of the LED in the line of the free resistor leg when its holes are taken", async () => {
    const boards = await loadBoards("perch");
    const finish = boards.levels[2];
    // The resistor is in other holes, so the LED holes of the finished board do not touch it.
    const board: Part[] = [...startBoard(boards, 2), { id: "r1", type: "resistor", a: "A-a20", b: "A-a22" }];
    const spot = taskSpot(bench, board, led, [], finish);
    expect(spot.taps).toHaveLength(2);
    const anode = bench.byId.get(spot.taps[0])!;
    expect(["A-a20", "A-a22"].map((h) => bench.byId.get(h)!.strip)).toContain(anode.strip);
    expect(checkPlacement(bench, board, "led", spot.taps[0], spot.taps[1])).toBeNull();
  });
});
