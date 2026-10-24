import { describe, expect, it } from "vitest";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { checkLevel } from "@/lib/circuit/check";
import { buildNets, describeHole, endpointHole, netHoles } from "@/lib/circuit/nets";
import { checkPlacement, type Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { carriesBoard, loadBoards, startBoard } from "@/lib/content/boards";
import { loadLevelClips } from "@/lib/content/clips";
import { loadProjects } from "@/lib/content/load";
import { benchSchema } from "@/lib/content/schema";
import { createBoardStore } from "@/lib/game/board-store";
import { needsAck, startProgress, step, taskMarks, taskSpot, type Effect, type Plan, type Progress } from "@/lib/game/engine";
import arduinoSpec from "@/content/benches/arduino-foundations.json";
import perchSpec from "@/content/benches/perch.json";

// Issue #57: the Arduino Foundations bench (the Uno beside one breadboard) and its 4 levels.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const project = loadProjects().find((p) => p.slug === "arduino-foundations")!;
const boards = await loadBoards("arduino-foundations");
const levelOf = (position: number) => project.levels.find((l) => l.position === position)!;
const planOf = (position: number): Plan => {
  const level = levelOf(position);
  return { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
};
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });

/** A learner on one level: start, "Got it" on the parts that are always there, then put each part down. */
function learner(position: number, start: Part[] = startBoard(boards, position)) {
  const plan = planOf(position);
  let progress: Progress = startProgress();
  let board = start;
  const effects: Effect[] = [];
  const send = (event: Parameters<typeof step>[3]) => {
    const next = step(bench, plan, progress, event);
    progress = next.progress;
    effects.push(next.effect);
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
  };
}

describe("the bench files", () => {
  it("are valid content/benches/ files", () => {
    expect(benchSchema.safeParse(perchSpec).success).toBe(true);
    expect(benchSchema.safeParse(arduinoSpec).success).toBe(true);
  });

  it("give a project without a bench file the Perch bench", async () => {
    expect(createBench(await loadBenchSpec("desk-weather-station"))).toBe(perchBench());
    expect(createBench(await loadBenchSpec("../x"))).toBe(perchBench());
  });

  it("keep the Perch bench: two breadboards, 44 ESP32-S3 pins in breadboard holes, 88 holes under the board", () => {
    const perch = perchBench();
    expect(perch.breadboards.map((b) => b.id)).toEqual(["A", "B"]);
    expect(perch.holes).toHaveLength(800);
    expect(perch.pins).toHaveLength(44);
    expect(perch.pins.every((p) => !p.socket && perch.byId.get(p.hole)!.kind === "main")).toBe(true);
    expect(perch.covered.size).toBe(88);
    expect(perch.board).toMatchObject({ id: "esp", name: "ESP32-S3", outline: { x0: 10.5, x1: 20.5, z1: 12.2 } });
    expect(perch.openRail).toEqual({ A: { "+": "L+", "-": "L-" }, B: { "+": "R+", "-": "R-" } });
  });
});

describe("the Uno bench", () => {
  it("has one breadboard and the Uno on the table beside it, with no hole under the Uno", () => {
    expect(bench.breadboards.map((b) => b.id)).toEqual(["A"]);
    expect(bench.holes.filter((h) => h.kind !== "pin")).toHaveLength(400);
    expect(bench.covered.size).toBe(0);
    expect(bench.board).toMatchObject({ type: "arduino-uno", id: "uno", name: "Arduino Uno" });
    // The Uno is on the left of the breadboard and does not touch it.
    expect(bench.board.outline.x1).toBeLessThan(Math.min(...bench.holes.filter((h) => h.board === "A").map((h) => h.x)) - 1);
  });

  it("has the header pins of the issue: 5V, 3V3, 3 GND, VIN, D0–D13 and A0–A5", () => {
    const names = bench.pins.map((p) => p.name).sort();
    const expected = ["5V", "3V3", "GND", "GND", "GND", "VIN", ...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`)].sort();
    expect(names).toEqual(expected);
    expect(bench.pins.every((p) => p.socket && bench.byId.get(p.hole)!.kind === "pin")).toBe(true);
  });

  it("puts the 3 GND pins on one net, and keeps 5V, 3V3 and each other pin on a net of its own", () => {
    const nets = buildNets(bench, []);
    const gnd = bench.pins.filter((p) => p.name === "GND").map((p) => p.hole);
    expect(gnd).toEqual(["uno-GND1", "uno-GND2", "uno-GND3"]);
    expect(new Set(gnd.map((h) => nets.get(h))).size).toBe(1);
    const others = bench.pins.filter((p) => p.name !== "GND").map((p) => nets.get(p.hole));
    expect(new Set([...others, nets.get(gnd[0])]).size).toBe(others.length + 1);
  });

  it("lets a wire go from each Uno pin to a breadboard hole, and lights up the whole net from the pin", () => {
    for (const pin of bench.pins) expect(checkPlacement(bench, [], "wire", pin.hole, "A-a1"), pin.name).toBeNull();
    // 5V to the red + line: the hover on the pin lights up all 25 holes of the rail.
    const parts = [wire("w1", "uno-5V", "A-L+3")];
    const lit = netHoles(buildNets(bench, parts), "uno-5V");
    expect(lit.size).toBe(26);
    expect([...lit].filter((h) => h.startsWith("A-L+"))).toHaveLength(25);
    // The 3 GND pins light up together.
    expect(netHoles(buildNets(bench, []), "uno-GND1")).toEqual(new Set(["uno-GND1", "uno-GND2", "uno-GND3"]));
  });

  it("takes one wire end in each pin, and no resistor or LED leg", () => {
    const parts = [wire("w1", "uno-D13", "A-a10")];
    expect(checkPlacement(bench, parts, "wire", "uno-D13", "A-a12")).toBe("taken");
    expect(checkPlacement(bench, [], "led", "uno-D13", "A-a1")).toBe("socket_leg");
    expect(checkPlacement(bench, [], "resistor", "A-a1", "uno-GND1")).toBe("socket_leg");
  });

  it("names the pins for the hint: uno.D13, uno.GND and the left rails of the breadboard", () => {
    expect(endpointHole(bench, [], "uno.D13")).toBe("uno-D13");
    expect(endpointHole(bench, [], "uno.GND")).toBe("uno-GND1");
    expect(endpointHole(bench, [], "bbA.+")).toBe("A-L+1");
    expect(endpointHole(bench, [], "bbA.-")).toBe("A-L-1");
    expect(endpointHole(bench, [], "bbB.+")).toBeNull();
    const info = describeHole(bench, [], buildNets(bench, []), "uno-GND2");
    expect(info).toMatchObject({ kind: "pin", pin: "GND", pins: [] });
  });

  it("points the Got it task of the Uno at the outline of the Uno", () => {
    expect(taskSpot(bench, [], planOf(1).tasks[0].target).area).toEqual(bench.board.outline);
  });
});

describe("each Arduino Foundations level, played with its finished board", () => {
  it("has 4 levels, each with a finished board", () => {
    expect(project.status).toBe("available");
    expect(project.levels.map((l) => l.title)).toEqual(["Power the breadboard", "Light an LED", "Read a button", "Button and LED together"]);
    for (const l of project.levels) expect(boards.levels[l.position], `level ${l.position}`).toBeDefined();
  });

  for (const level of project.levels) {
    it(`level ${level.position}: every part snaps in, with no mistakes, every task has a tick, and the level Check passes`, () => {
      const l = learner(level.position);
      l.start();
      l.put(...boards.levels[level.position]);

      expect(l.effects.every((e) => e === "snap" || e === null)).toBe(true);
      expect(l.progress).toMatchObject({ phase: "ready_to_check", tasksDone: level.tasks.length, mistakes: 0 });
      expect(taskMarks(bench, l.plan, l.board, l.progress).every((m) => m === "done")).toBe(true);
      expect(checkLevel(bench, l.board, level.rules)).toEqual({ passed: true });
    });
  }

  it("starts level 3 with the powered breadboard only, and level 4 with the button of level 3", () => {
    expect(startBoard(boards, 3).map((p) => p.id)).toEqual(["w1", "w2"]);
    expect(startBoard(boards, 4).map((p) => p.id)).toEqual(["w1", "w2", "btn1", "w3", "w4"]);
    // The learner's own board of the level before goes on to levels 2 and 4, not to level 3 (it has the LED).
    expect([1, 2, 3, 4].map((n) => carriesBoard(boards, n))).toEqual([false, true, false, true]);
  });

  it("passes level 4 only with the button and the LED together", () => {
    const rules = levelOf(4).rules;
    const full = [...startBoard(boards, 4), ...boards.levels[4]];
    expect(checkLevel(bench, full, rules).passed).toBe(true);
    expect(checkLevel(bench, full.filter((p) => p.id !== "btn1"), rules).passed).toBe(false);
  });

  it("passes level 1 in other valid holes: 5V from the far end of the rail, and GND from another GND pin", () => {
    const parts = [wire("w1", "uno-5V", "A-L+25"), wire("w2", "uno-GND1", "A-L-1")];
    expect(checkLevel(bench, parts, levelOf(1).rules)).toEqual({ passed: true });
  });
});

describe("mistakes on the Uno bench", () => {
  it("gives a Mistake pop-up for 5V straight to GND: this shorts 5 V to ground", () => {
    const l = learner(1);
    l.start();
    l.put(wire("w1", "uno-5V", "uno-GND3"));
    expect(l.progress.phase).toBe("mistake");
    expect(l.progress.mistake?.code).toBe("short_power");
    expect(l.progress.mistake?.message).toMatch(/this shorts 5 V to ground/i);
  });

  it("fails the level 2 Check with a reversed LED, and with no resistor, and names the reason", () => {
    const rules = levelOf(2).rules;
    const start = startBoard(boards, 2);
    const reversed = [...start, ...boards.levels[2].map((p) => (p.id === "led1" && "a" in p ? { ...p, a: p.b, b: p.a } : p))];
    const turned = checkLevel(bench, reversed, rules);
    expect(turned).toMatchObject({ passed: false, code: "reversed_led" });

    // No resistor: pin 13 goes straight to the long leg of the LED.
    const noResistor = [
      ...start,
      { id: "led1", type: "led", a: "A-e20", b: "A-e21" },
      wire("w3", "uno-D13", "A-a20"),
      wire("w4", "A-a21", "A-L-17"),
    ] as Part[];
    expect(checkLevel(bench, noResistor, rules)).toMatchObject({ passed: false, code: "missing_resistor" });
  });

  it("fails the level 3 Check with a wire around the button", () => {
    const parts = [...startBoard(boards, 3), { id: "btn1", type: "pushbutton", at: "A-e15" } as Part, wire("w3", "uno-D2", "A-L-14")];
    expect(checkLevel(bench, parts, levelOf(3).rules)).toMatchObject({ passed: false, code: "button_bypassed" });
  });
});

describe("the board store on the Uno bench", () => {
  it("puts a wire from an Uno pin to a breadboard hole with two taps, and snaps it in for the task", () => {
    const store = createBoardStore();
    store.getState().open("arduino-foundations/1", { bench, plan: planOf(1) });
    expect(store.getState().bench).toBe(bench);
    store.getState().start();
    store.getState().ack();
    store.getState().ack();
    store.getState().tapHole("uno-5V");
    store.getState().tapHole("A-L+7");
    expect(store.getState().parts).toMatchObject([{ type: "wire", a: "uno-5V", b: "A-L+7" }]);
    expect(store.getState().progress.tasksDone).toBe(3);
    expect(store.getState().flash?.kind).toBe("snap");
  });

  it("goes back to the Perch bench for a board that does not name its bench", () => {
    const store = createBoardStore();
    store.getState().open("arduino-foundations/1", { bench });
    store.getState().open("landing", { readOnly: true });
    expect(store.getState().bench).toBe(perchBench());
  });
});

describe("walkthrough clips", () => {
  it("gives the Arduino levels no clip, because they have no recorded video yet", async () => {
    expect((await loadLevelClips("arduino-foundations")).size).toBe(0);
    expect((await loadLevelClips("perch")).size).toBe(5);
  });
});
