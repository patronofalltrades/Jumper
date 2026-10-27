import { describe, expect, it } from "vitest";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { checkLevel, joinRules } from "@/lib/circuit/check";
import { buildNets, connected, endpointHole } from "@/lib/circuit/nets";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { needsAck, startProgress, step, taskMarks, taskSpot, toolFor, type Effect, type Plan, type Progress } from "@/lib/game/engine";

const bench = perchBench();
const perch = loadProjects().find((p) => p.slug === "perch")!;
const boards = await loadBoards("perch");
const planOf = (position: number): Plan => {
  const level = perch.levels.find((l) => l.position === position)!;
  return { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
};
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });

/** A learner on one level: start, "Got it" on the parts that are always there, then put each part down. */
function learner(position: number, start: Part[] = startBoard(boards, position), plan: Plan = planOf(position)) {
  let progress: Progress = startProgress();
  let board = start;
  const effects: Effect[] = [];
  const send = (event: Parameters<typeof step>[3]) => {
    const next = step(bench, plan, progress, event);
    progress = next.progress;
    effects.push(next.effect);
    return next;
  };
  const ackAll = () => {
    while (progress.phase === "task" && needsAck(plan.tasks[progress.index].target)) send({ type: "ack", parts: board });
  };
  return {
    plan,
    get progress() {
      return progress;
    },
    get board() {
      return board;
    },
    effects,
    send,
    start() {
      send({ type: "start" });
      ackAll();
    },
    put(...parts: Part[]) {
      for (const p of parts) {
        const after = [...board, p];
        send({ type: "change", before: board, after });
        board = after;
        ackAll();
      }
    },
    /** Replaces the whole board, as Undo does. */
    set(after: Part[]) {
      send({ type: "change", before: board, after });
      board = after;
    },
    remove(id: string) {
      const after = board.filter((p) => p.id !== id);
      send({ type: "change", before: board, after });
      board = after;
    },
  };
}

describe("each Perch level, played with its finished board", () => {
  for (const level of perch.levels) {
    it(`level ${level.position}: every part snaps in, with no mistakes, every task has a tick, and the level rules are true at the end`, () => {
      const l = learner(level.position);
      l.start();
      l.put(...boards.levels[level.position]);

      expect(l.effects.every((e) => e === "snap" || e === null)).toBe(true);
      expect(l.progress).toMatchObject({
        phase: "ready_to_check",
        index: level.tasks.length,
        tasksDone: level.tasks.length,
        mistakes: 0,
        xp: level.tasks.reduce((n, t) => n + t.xp, 0),
      });
      expect(taskMarks(bench, l.plan, l.board, l.progress).every((m) => m === "done")).toBe(true);
      const nets = buildNets(bench, l.board);
      for (const r of level.rules.require) expect(connected(bench, l.board, nets, r.a, r.b), `${r.a} → ${r.b}`).toBe(true);
      for (const f of level.rules.forbid) expect(connected(bench, l.board, nets, f.a, f.b), f.code).toBe(false);
    });
  }
});

describe("task engine", () => {
  it("waits in the intro until the learner starts", () => {
    const l = learner(1);
    l.put(wire("w1", "B-e5", "A-L+1"));
    expect(l.progress.phase).toBe("intro");
    l.send({ type: "start" });
    expect(l.progress).toMatchObject({ phase: "task", index: 0 });
  });

  it("finishes a task for a part that is always on the bench with Got it, and gives its XP", () => {
    const l = learner(1);
    l.send({ type: "start" });
    expect(l.send({ type: "ack", parts: [] }).effect).toBe("snap");
    expect(l.progress).toMatchObject({ index: 1, tasksDone: 1, xp: l.plan.tasks[0].xp });
  });

  it("does not accept Got it on a wire task", () => {
    const l = learner(1);
    l.start();
    expect(l.progress.index).toBe(3);
    expect(l.send({ type: "ack", parts: [] })).toMatchObject({ effect: null, progress: { index: 3 } });
  });

  it("snaps a correct wire and opens the next task", () => {
    const l = learner(1);
    l.start();
    l.put(wire("w1", "B-c6", "A-L+4"));
    expect(l.effects.at(-1)).toBe("snap");
    expect(l.progress).toMatchObject({ phase: "task", index: 4, mistakes: 0 });
  });

  it("buzzes a forbidden wire and opens a Mistake pop-up with the text of the forbid rule", () => {
    const l = learner(1);
    l.start();
    // 3V3 (row a of B, column 5) to a GND pin (row j of A, column 5): a short circuit.
    l.put(wire("w1", "B-e5", "A-f5"));
    expect(l.effects.at(-1)).toBe("buzz");
    expect(l.progress.phase).toBe("mistake");
    expect(l.progress.mistakes).toBe(1);
    expect(l.progress.mistake).toMatchObject({ code: "short_power", parts: ["w1"] });
    expect(l.progress.mistake!.message).toContain("short circuit");
  });

  it("buzzes a wire that does not make the connection of the task, with a general mistake", () => {
    const l = learner(1);
    l.start();
    l.put(wire("w1", "A-a1", "A-a5"));
    expect(l.progress.mistake).toEqual({ code: "wrong_wire", parts: ["w1"] });
  });

  it("ends the mistake when the wrong wire goes, or on Try again", () => {
    const l = learner(1);
    l.start();
    l.put(wire("w1", "A-a1", "A-a5"));
    l.remove("w1");
    expect(l.progress).toMatchObject({ phase: "task", mistake: null, mistakes: 1 });
    l.put(wire("w2", "A-a1", "A-a5"));
    l.send({ type: "dismiss" });
    expect(l.progress).toMatchObject({ phase: "task", mistake: null, mistakes: 2 });
  });

  it("lets the learner use either side of the resistor, and remembers the choice", () => {
    const l = learner(2);
    l.start();
    l.put(...boards.levels[2].slice(0, 3));
    expect(l.progress.index).toBe(3);
    // The resistor goes from A-a2 (side 1) to A-a4 (side 2), and the LED + leg is in the line of side 1.
    l.put({ id: "r1", type: "resistor", a: "A-a2", b: "A-a4" }, { id: "led1", type: "led", a: "A-b2", b: "A-b1" });
    // GPIO 2 to side 2 is good: the resistor is the same both ways.
    l.put(wire("w7", "A-f9", "A-c4"));
    expect(l.progress).toMatchObject({ swaps: ["r1"], mistakes: 0 });
    // Task 7 (the resistor to the LED + leg) is already true, so the engine goes on to task 8.
    expect(l.progress.index).toBe(7);
  });

  it("refuses a part on the wrong breadboard", () => {
    const l = learner(3);
    l.start();
    l.put({ id: "mic1", type: "inmp441", at: "A-e1" });
    expect(l.progress.mistake).toEqual({ code: "wrong_place", parts: ["mic1"] });
  });

  it("refuses the speaker leads the wrong way round in the terminal", () => {
    const l = learner(4);
    l.start();
    l.put(...boards.levels[4].slice(0, -1));
    l.put({ id: "spk1", type: "speaker", a: "amp1.OUT-", b: "amp1.OUT+" });
    expect(l.progress.mistake?.code).toBe("wrong_place");
  });

  it("gives the tool of each task", () => {
    expect(toolFor("resistor-220")).toBe("resistor");
    expect(toolFor("inmp441")).toBe("inmp441");
    expect(toolFor("bb400")).toBeNull();
    expect(toolFor("esp32-s3-devkitc-1")).toBeNull();
  });
});

describe("task spot", () => {
  it("glows the free holes of both ends of a wire task", () => {
    const spot = taskSpot(bench, [], planOf(1).tasks[3].target);
    // 3V3 is in B-a5 and B-a6: their lines, and the + rail of A.
    expect(spot.holes).toEqual(expect.arrayContaining(["B-a5", "B-e5", "B-b6", "A-L+1", "A-L+25"]));
    expect(spot.holes).not.toContain("A-L-1");
  });

  it("shows a free hole to tap at each end of a wire task, the second one near the first", () => {
    const spot = taskSpot(bench, [], planOf(1).tasks[3].target);
    const [first, second] = spot.taps.map((h) => bench.byId.get(h)!);
    // First: an empty hole in the line of 3V3, not the pin hole. Second: a hole on the + rail of A.
    expect(first.strip).toBe(bench.byId.get("B-a5")!.strip);
    expect(["B-a5", "B-a6"]).not.toContain(first.id);
    expect(second.id).toMatch(/^A-L\+/);
    expect(spot.at).toEqual({ x: first.x, z: first.z });
  });

  it("outlines a part that is always on the bench", () => {
    const spot = taskSpot(bench, [], planOf(1).tasks[0].target);
    expect(spot.taps).toEqual([]);
    expect(spot.area).toMatchObject({ x0: expect.any(Number), x1: expect.any(Number) });
    expect(taskSpot(bench, [], planOf(1).tasks[2].target).area).toEqual(bench.board.outline);
  });

  it("glows only the holes where pin 1 of a module can go", () => {
    const spot = taskSpot(bench, [], planOf(3).tasks[0].target);
    expect(spot.holes.sort()).toEqual(["B-e1", "B-e2", "B-e27", "B-e28"]);
    expect(spot.holes).toContain(spot.taps[0]);
  });

  it("glows the terminal for the speaker", () => {
    const amp: Part = { id: "amp1", type: "max98357a", at: "A-c11" };
    expect(taskSpot(bench, [amp], planOf(4).tasks.at(-1)!.target).holes).toEqual(["amp1.OUT+", "amp1.OUT-"]);
  });
});

describe("task list", () => {
  /** A learner who finished all the tasks of level 2 with its finished board. */
  function finished() {
    const l = learner(2);
    l.start();
    l.put(...boards.levels[2]);
    return l;
  }
  const marks = (l: ReturnType<typeof learner>, parts = l.board) => taskMarks(bench, l.plan, parts, l.progress);

  it("on an empty board, marks the task of the pop-up as now and the others as to do", () => {
    const l = learner(2);
    l.start();
    expect(marks(l)).toEqual(["now", "todo", "todo", "todo", "todo", "todo", "todo", "todo"]);
  });

  it("ticks the tasks of level 1 that need only Got it, when the learner presses it", () => {
    const l = learner(1);
    l.send({ type: "start" });
    expect(marks(l).slice(0, 3)).toEqual(["now", "todo", "todo"]);
    l.send({ type: "ack", parts: [] });
    expect(marks(l).slice(0, 3)).toEqual(["done", "now", "todo"]);
  });

  it("ticks every task on a full board after the last task", () => {
    const l = finished();
    expect(l.progress.phase).toBe("ready_to_check");
    expect(marks(l)).toEqual(Array(8).fill("done"));
  });

  it("takes away the tick of a removed wire, makes its task now, and gives the tick back when the wire comes back", () => {
    const l = finished();
    // w7: GPIO 2 to the resistor (task 6).
    const w7 = l.board.find((p) => p.id === "w7")!;
    l.remove("w7");
    expect(marks(l)).toEqual(["done", "done", "done", "done", "done", "now", "done", "done"]);
    expect(marks(l, [...l.board, w7])).toEqual(Array(8).fill("done"));
  });

  it("ticks a wire on the other side of the button", () => {
    const l = learner(2);
    l.start();
    // The button is in A-e27: side 1 in column 27, side 2 in column 29. GPIO 1 (A-f8) goes to side 2, and GND to side 1.
    l.put({ id: "btn1", type: "pushbutton", at: "A-e27" }, wire("w5", "A-f8", "A-a29"), wire("w6", "A-a27", "A-L-23"));
    expect(l.progress.mistakes).toBe(0);
    expect(marks(l).slice(0, 4)).toEqual(["done", "done", "done", "now"]);
  });

  it("does not tick a task that the learner did not reach yet", () => {
    const l = learner(2);
    l.start();
    // The resistor of task 4 is on the board, but the learner is on task 1: a mistake, not a tick.
    l.put({ id: "r1", type: "resistor", a: "A-a2", b: "A-a4" });
    expect(l.progress.phase).toBe("mistake");
    expect(marks(l)).toEqual(["now", "todo", "todo", "todo", "todo", "todo", "todo", "todo"]);
  });
});

describe("going back (issue #63)", () => {
  const [w1, w2, w3, w4] = boards.levels[1].filter((p) => p.type === "wire");
  const marks = (l: ReturnType<typeof learner>) => taskMarks(bench, l.plan, l.board, l.progress);

  it("puts an undone wire back with a snap, no mistake, and no new XP", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2);
    const { xp, tasksDone } = l.progress;
    l.set([w1]);
    l.put(w2);
    expect(l.effects.at(-1)).toBe("snap");
    expect(l.progress).toMatchObject({ phase: "task", mistakes: 0, xp, tasksDone, index: 5 });
  });

  it("moves the task back when a wire goes, and the task list agrees with the pop-up", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2);
    l.remove("w1");
    expect(l.progress).toMatchObject({ phase: "task", index: 3, tasksDone: 5 });
    expect(marks(l)).toEqual(["done", "done", "done", "now", "done", "todo", "todo"]);
    l.put(w1);
    expect(l.progress).toMatchObject({ phase: "task", index: 5, mistakes: 0, tasksDone: 5 });
  });

  it("puts a removed wire back without a mistake", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2);
    l.remove("w2");
    l.put(w2);
    expect(l.progress).toMatchObject({ phase: "task", index: 5, mistakes: 0, tasksDone: 5 });
  });

  it("goes back from ready_to_check to the first task that is not done, and forward again when the board is full", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2, w3, w4);
    expect(l.progress.phase).toBe("ready_to_check");
    l.remove("w2");
    expect(l.progress).toMatchObject({ phase: "task", index: 4, mistakes: 0 });
    l.put(w2);
    expect(l.progress).toMatchObject({ phase: "ready_to_check", index: 7, mistakes: 0, tasksDone: 7 });
    expect(l.effects.at(-1)).toBe("snap");
  });

  it("still buzzes a wrong wire when the learner has gone back", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2);
    l.remove("w1");
    l.put(wire("w9", "A-a1", "A-a5"));
    expect(l.progress).toMatchObject({ phase: "mistake", mistakes: 1 });
  });

  it("treats a progress with reached equal to the index (an old save) like a new one", () => {
    const l = learner(1);
    l.start();
    l.put(w1, w2);
    expect(l.progress).toMatchObject({ index: 5, reached: 5 });
    l.remove("w2");
    expect(l.progress).toMatchObject({ index: 4, reached: 5 });
  });
});

// Issue #72: a correct part that does a later task snaps in quietly. Its task finishes when the learner gets to it.
describe("a correct part placed early (issue #72)", () => {
  const [mic, vdd, gnd, lr, ws, sck, sd] = boards.levels[3];
  const marks = (l: ReturnType<typeof learner>) => taskMarks(bench, l.plan, l.board, l.progress);
  /** Level 3 with the mic and the 3 power wires done: the pop-up asks for WS → GPIO 4. */
  function atWs() {
    const l = learner(3);
    l.start();
    l.put(mic, vdd, gnd, lr);
    return l;
  }

  it("S1: snaps a wire of a later task with no mistake, and the pop-up stays on the task of now", () => {
    const l = atWs();
    const before = l.progress;
    expect(before).toMatchObject({ phase: "task", index: 4, mistakes: 0 });
    l.put(sd);
    expect(l.effects.at(-1)).toBe("snap");
    expect(l.progress).toEqual(before);
    expect(marks(l)[6]).toBe("todo");
    expect(marks(l)[4]).toBe("now");
  });

  it("S2: finishes the early task by itself when the learner gets there, and counts it once", () => {
    const l = atWs();
    l.put(sd, ws);
    expect(l.progress).toMatchObject({ phase: "task", index: 5, tasksDone: 5, xp: 50, mistakes: 0 });
    l.put(sck);
    expect(l.progress).toMatchObject({ phase: "ready_to_check", index: 7, tasksDone: 7, xp: 70, mistakes: 0 });
    expect(l.effects.every((e) => e === "snap" || e === null)).toBe(true);
    expect(marks(l).every((m) => m === "done")).toBe(true);
  });

  it("S3: Remove or Undo of the early wire gives no mistake and no task, and the wire snaps again when put back", () => {
    const l = atWs();
    l.put(sd);
    const before = l.progress;
    l.remove("w14");
    expect(l.progress).toEqual(before);
    l.put(sd);
    l.set(l.board.filter((p) => p.id !== "w14"));
    expect(l.progress).toEqual(before);
    l.put(sd, ws, sck);
    expect(l.progress).toMatchObject({ phase: "ready_to_check", tasksDone: 7, xp: 70, mistakes: 0 });
    // Remove after the task is done: the task goes back, and there is still no mistake.
    l.remove("w14");
    expect(l.progress).toMatchObject({ phase: "task", index: 6, mistakes: 0, tasksDone: 7 });
  });

  it("S4: still buzzes when the early wire makes a forbidden connection", () => {
    const plan: Plan = { ...planOf(3), forbid: [...planOf(3).forbid, { a: "mic1.SD", b: "esp.GPIO6", code: "no_sd", message: "No SD." }] };
    const l = learner(3, startBoard(boards, 3), plan);
    l.start();
    l.put(mic, vdd, gnd, lr, sd);
    expect(l.effects.at(-1)).toBe("buzz");
    expect(l.progress).toMatchObject({ phase: "mistake", mistakes: 1, mistake: { code: "no_sd" } });
  });

  it("S5: still buzzes a wire that does no task, and a module of no task", () => {
    const l = atWs();
    l.put(wire("x1", "B-a15", "B-a20"));
    expect(l.progress).toMatchObject({ phase: "mistake", mistakes: 1, mistake: { code: "wrong_wire" } });
    const m = atWs();
    m.put({ id: "mic9", type: "inmp441", at: "B-e10" });
    expect(m.progress.mistake?.code).toBe("wrong_part");
  });

  it("S6: an early wire with a Got it task between: the engine stops on Got it, and finishes the early task after it", () => {
    const t = planOf(1).tasks;
    const plan: Plan = { tasks: [t[3], t[0], t[4]], forbid: planOf(1).forbid };
    const l = learner(1, [], plan);
    l.start();
    expect(l.progress.index).toBe(0);
    l.put(boards.levels[1][1]);
    expect(l.effects.at(-1)).toBe("snap");
    expect(l.progress).toMatchObject({ index: 0, mistakes: 0, tasksDone: 0 });
    l.put(boards.levels[1][0]);
    // Task 1 is done, the next one is Got it, and the learner presses it.
    expect(l.progress).toMatchObject({ phase: "ready_to_check", tasksDone: 3, mistakes: 0 });
  });

  it("S7: an early wire on the other side of the button is not a mistake, and the swap comes when the learner gets there", () => {
    const l = learner(2);
    l.start();
    l.put({ id: "btn1", type: "pushbutton", at: "A-e27" });
    expect(l.progress.index).toBe(1);
    // GND to the physical side 1 (column 27) is task 3 for a button that is turned round.
    l.put(wire("w6", "A-a27", "A-L-23"));
    expect(l.effects.at(-1)).toBe("snap");
    expect(l.progress).toMatchObject({ phase: "task", index: 1, mistakes: 0, swaps: [] });
    l.put(wire("w5", "A-f8", "A-a29"));
    expect(l.progress).toMatchObject({ phase: "task", index: 3, mistakes: 0, swaps: ["btn1"], tasksDone: 3 });
  });

  it("S8: Arduino Foundations: an early wire to the resistor snaps, and the LED finishes the tasks after it", async () => {
    const arduino = createBench(await loadBenchSpec("arduino-foundations"));
    const project = loadProjects().find((p) => p.slug === "arduino-foundations")!;
    const level = project.levels.find((x) => x.position === 2)!;
    const plan: Plan = { tasks: level.tasks.map((x) => ({ target: x.target, xp: x.xp })), forbid: level.rules.forbid };
    const [r1, led1, w3, w4] = (await loadBoards("arduino-foundations")).levels[2];
    let progress: Progress = { ...startProgress(), phase: "task" };
    let board: Part[] = [];
    const put = (p: Part) => {
      const next = step(arduino, plan, progress, { type: "change", before: board, after: [...board, p] });
      progress = next.progress;
      board = [...board, p];
      return next.effect;
    };
    put(r1);
    expect(progress.index).toBe(1);
    expect(put(w3)).toBe("snap");
    expect(progress).toMatchObject({ phase: "task", index: 1, mistakes: 0, tasksDone: 1 });
    put(led1);
    expect(progress).toMatchObject({ phase: "task", index: 4, tasksDone: 4, mistakes: 0 });
    put(w4);
    expect(progress).toMatchObject({ phase: "ready_to_check", tasksDone: 5, xp: 50, mistakes: 0 });
  });

  it("S9: works for an old save, where reached equals index", () => {
    const l = atWs();
    const old: Progress = { ...l.progress, reached: l.progress.index };
    const next = step(bench, l.plan, old, { type: "change", before: l.board, after: [...l.board, sd] });
    expect(next.effect).toBe("snap");
    expect(next.progress).toEqual(old);
  });
});

describe("boards", () => {
  it("has no boards for a project without a board file", async () => {
    expect(await loadBoards("desk-weather-station")).toEqual({ levels: {} });
    expect(await loadBoards("../x")).toEqual({ levels: {} });
  });

  it("starts a level with the boards of the levels before it", () => {
    expect(startBoard(boards, 1)).toEqual([]);
    expect(startBoard(boards, 3).map((p) => p.id)).toEqual([...boards.levels[1], ...boards.levels[2]].map((p) => p.id));
  });
});

// Issue #65: Check and the buzz use the rules of the earlier levels too.
describe("joined rules of the earlier levels", () => {
  const upTo = (position: number) => joinRules(perch.levels, Array.from({ length: position }, (_, i) => i + 1));

  for (const level of perch.levels) {
    it(`level ${level.position}: the finished board passes the rules of levels 1 to ${level.position}`, () => {
      expect(checkLevel(bench, startBoard(boards, level.position + 1), upTo(level.position))).toEqual({ passed: true });
    });
  }

  it("level 2 with the 3V3 wire of level 1 removed does not pass Check", () => {
    const l = learner(2);
    l.start();
    l.remove("w1");
    l.put(...boards.levels[2]);
    expect(checkLevel(bench, l.board, upTo(2))).toMatchObject({ passed: false, code: "wrong_pin", connection: { a: "esp.3V3", b: "bbA.+" } });
  });

  it("buzzes in level 3 for a wire that breaks a rule of level 2", () => {
    const plan: Plan = { tasks: planOf(3).tasks, forbid: upTo(3).forbid };
    const l = learner(3, startBoard(boards, 3), plan);
    l.start();
    const board = l.board;
    // GPIO 1 to GND goes around the button (a forbid rule of level 2 only).
    l.put(wire("short", endpointHole(bench, board, "esp.GPIO1")!, endpointHole(bench, board, "esp.GND")!));
    expect(l.effects.at(-1)).toBe("buzz");
    expect(l.progress.phase).toBe("mistake");
  });
});
