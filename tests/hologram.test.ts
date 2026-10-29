import { describe, expect, it } from "vitest";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { checkLevel, connectionStates, joinRules } from "@/lib/circuit/check";
import { buildNets, endpointHole } from "@/lib/circuit/nets";
import { checkHole, partPins, type Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard, startLevels } from "@/lib/content/boards";
import { loadLevelClips } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { createBoardStore } from "@/lib/game/board-store";
import { needsAck, startProgress, step, taskSpot, type Effect, type Plan, type Progress } from "@/lib/game/engine";
import { connectionHologram, hologramGhost } from "@/lib/game/hologram";

// Issue #113: a pointer on a row of the task list or the connection list shows a see-through ghost on the board.
// The ghost of a task is the part or wire in the holes of the guide (taskSpot). The ghost of a connection is a wire
// between free holes of its two ends.

const holesOf = (bench: ReturnType<typeof perchBench>, part: Part) => partPins(bench, part).map((p) => p.hole);

describe("a learner who copies the hologram of each task", () => {
  for (const project of loadProjects()) {
    for (const level of project.levels) {
      it(`${project.slug} level ${level.position}: the ghost is in the guide holes, and copying it passes every task and Check`, async () => {
        const bench = createBench(await loadBenchSpec(project.slug));
        const boards = await loadBoards(project.slug);
        const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
        const finish = (await loadLevelClips(project.slug)).get(level.position)?.order;
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
          const ghost = hologramGhost(bench, board, { kind: "task", index: progress.index }, plan, progress.swaps, finish);
          if (needsAck(target)) {
            // A part that is always on the bench has no ghost.
            expect(ghost, `task ${progress.index + 1}`).toBeNull();
            send({ type: "ack", parts: board });
            continue;
          }
          expect(ghost, `task ${progress.index + 1}`).not.toBeNull();
          expect(ghost!.parts, `task ${progress.index + 1}`).toHaveLength(1);
          const spot = taskSpot(bench, board, target, progress.swaps, finish);
          const [part] = ghost!.parts;
          expect("at" in part ? [part.at] : [part.a, part.b], `task ${progress.index + 1}`).toEqual(spot.taps.slice(0, "at" in part ? 1 : 2));
          // The learner puts a part where the ghost is. A wire gets an id of its own.
          const copy: Part = part.type === "wire" ? { ...part, id: `g${n}` } : part;
          const after = [...board, copy];
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

describe("hologram of a task", () => {
  const bench = perchBench();
  const perch = loadProjects().find((p) => p.slug === "perch")!;
  const level2 = perch.levels.find((l) => l.position === 2)!;
  const plan: Plan = { tasks: level2.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level2.rules.forbid };
  const resistorIndex = level2.tasks.findIndex((t) => t.target.kind === "place" && t.target.id === "r1");

  it("shows the resistor of Perch level 2 in the holes of the level clip, A-a2 and A-a4", async () => {
    const boards = await loadBoards("perch");
    const finish = (await loadLevelClips("perch")).get(2)!.order;
    const ghost = hologramGhost(bench, startBoard(boards, 2), { kind: "task", index: resistorIndex }, plan, [], finish);
    expect(ghost).toEqual({ parts: [{ id: "r1", type: "resistor", a: "A-a2", b: "A-a4" }], line: [] });
  });

  it("shows a part that is on the board already where it is", async () => {
    const boards = await loadBoards("perch");
    const r1: Part = { id: "r1", type: "resistor", a: "A-a20", b: "A-a22" };
    const ghost = hologramGhost(bench, [...startBoard(boards, 2), r1], { kind: "task", index: resistorIndex }, plan, [], []);
    expect(ghost).toEqual({ parts: [r1], line: [] });
  });

  it("shows the wire of a task whose part is not on the board yet, with the hole of the finished board", async () => {
    const boards = await loadBoards("perch");
    const finish = (await loadLevelClips("perch")).get(2)!.order;
    const index = level2.tasks.findIndex((t) => t.target.kind === "wire" && [t.target.a, t.target.b].some((e) => e.startsWith("btn1.")));
    const t = level2.tasks[index].target as { a: string; b: string };
    const ghost = hologramGhost(bench, startBoard(boards, 2), { kind: "task", index }, plan, [], finish)!;
    expect(ghost.parts).toHaveLength(1);
    const wire = ghost.parts[0] as Part & { a: string; b: string };
    expect(wire.type).toBe("wire");
    const button = [t.a, t.b].findIndex((e) => e.startsWith("btn1."));
    expect([wire.a, wire.b][button]).toBe(endpointHole(bench, finish, [t.a, t.b][button]));
  });

  it("shows nothing for a task that is not in the plan", () => {
    expect(hologramGhost(bench, [], { kind: "task", index: 99 }, plan, [], [])).toBeNull();
    expect(hologramGhost(bench, [], { kind: "task", index: 0 }, null, [], [])).toBeNull();
  });
});

describe("hologram of a connection", () => {
  const bench = perchBench();
  const perch = loadProjects().find((p) => p.slug === "perch")!;

  it("shows a ghost wire only for a connection that must be made", () => {
    expect(connectionHologram({ kind: "require", connection: { a: "r1.2", b: "led1.anode" }, ok: false })).toEqual({ kind: "connection", a: "r1.2", b: "led1.anode" });
    expect(connectionHologram({ kind: "forbid", connection: { a: "led1.anode", b: "esp.GND" }, ok: true })).toBeNull();
    expect(connectionHologram({ kind: "stray", connection: { a: "r1.1", b: "esp.GPIO37" }, ok: false })).toBeNull();
  });

  it("puts the ghost wire of a missing wire in free holes of the two ends, as the guide of a wire task", async () => {
    const finish = (await loadLevelClips("perch")).get(2)!.order;
    const rules = joinRules(perch.levels, [1, 2]);
    // The finished board of level 2 with no wires of level 2: some connections are missing.
    const start = startBoard(await loadBoards("perch"), 2);
    const board = finish.filter((p) => p.type !== "wire" || start.some((s) => s.id === p.id));
    const missing = connectionStates(bench, board, rules).find((s) => s.kind === "require" && !s.ok)!;
    expect(missing).toBeDefined();
    const ghost = hologramGhost(bench, board, connectionHologram(missing)!, null, [], finish)!;
    expect(ghost.parts).toEqual([]);
    expect(ghost.line).toHaveLength(2);
    expect(ghost.line).toEqual(taskSpot(bench, board, { kind: "wire", ...missing.connection }).taps);
    const nets = buildNets(bench, board);
    [missing.connection.a, missing.connection.b].forEach((end, i) => {
      const hole = ghost.line[i];
      expect(nets.get(hole)).toBe(nets.get(endpointHole(bench, board, end)!));
      if (bench.byId.has(hole)) expect(checkHole(bench, board, hole)).toBeNull();
    });
  });

  it("uses the holes of the finished board for an end whose part is not on the board", async () => {
    const finish = (await loadLevelClips("perch")).get(2)!.order;
    const led = finish.find((p) => p.id === "led1")!;
    const ghost = hologramGhost(bench, [], { kind: "connection", a: "led1.anode", b: "led1.cathode" }, null, [], finish)!;
    expect(ghost.line).toEqual(holesOf(bench, led));
  });
});

describe("board store: hologram", () => {
  it("shows and hides a hologram, and never changes the parts, the tasks or the XP", () => {
    const store = createBoardStore();
    const parts: Part[] = [{ id: "w1", type: "wire", a: "A-a3", b: "A-a9", color: "#D63A2F" }];
    const plan: Plan = { tasks: [{ target: { kind: "wire", a: "esp.3V3", b: "A-a3" }, xp: 10 }], forbid: [] };
    store.getState().open("perch/1", { parts, plan });
    const before = { parts: store.getState().parts, progress: store.getState().progress, history: store.getState().history };
    expect(store.getState().hologram).toBeNull();
    store.getState().setHologram({ kind: "task", index: 0 });
    expect(store.getState().hologram).toEqual({ kind: "task", index: 0 });
    store.getState().setHologram({ kind: "connection", a: "esp.3V3", b: "A-a3" });
    expect(store.getState().hologram).toEqual({ kind: "connection", a: "esp.3V3", b: "A-a3" });
    expect({ parts: store.getState().parts, progress: store.getState().progress, history: store.getState().history }).toEqual(before);
    store.getState().setHologram(null);
    expect(store.getState().hologram).toBeNull();
  });

  it("hides the hologram when a different level opens", () => {
    const store = createBoardStore();
    store.getState().open("perch/1");
    store.getState().setHologram({ kind: "task", index: 0 });
    store.getState().open("perch/2");
    expect(store.getState().hologram).toBeNull();
  });
});
