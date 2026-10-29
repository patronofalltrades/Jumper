import { describe, expect, it } from "vitest";
import { createBench, perchBench, type Bench } from "@/lib/circuit/bench";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import build from "@/content/ui/build.json";
import { needsAck, startProgress, step, type Plan, type Progress } from "@/lib/game/engine";

// Issue #102: the LED place task checks the direction of the LED. A short leg (−) in a line with a resistor leg, or a
// long leg (+) on ground, gives the reversed_led Mistake at once. A wire that joins the two LED legs gives led_shorted.

const perchLevels = loadProjects().find((p) => p.slug === "perch")!.levels;
const arduinoLevels = loadProjects().find((p) => p.slug === "arduino-foundations")!.levels;
const perch = { bench: perchBench(), levels: perchLevels, boards: await loadBoards("perch") };
const arduino = {
  bench: createBench(await loadBenchSpec("arduino-foundations")),
  levels: arduinoLevels,
  boards: await loadBoards("arduino-foundations"),
};
type Game = typeof perch;

const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });
const led = (anode: string, cathode: string): Part => ({ id: "led1", type: "led", a: anode, b: cathode });

/** A learner on one level: start, "Got it" on the parts that are always there, then put each part down. */
function learner(game: Game, position: number) {
  const level = game.levels.find((l) => l.position === position)!;
  const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid };
  const bench: Bench = game.bench;
  let progress: Progress = startProgress();
  let board = startBoard(game.boards, position);
  let effect: string | null = null;
  const send = (event: Parameters<typeof step>[3]) => {
    const next = step(bench, plan, progress, event);
    progress = next.progress;
    effect = next.effect;
  };
  const ackAll = () => {
    while (progress.phase === "task" && needsAck(plan.tasks[progress.index].target)) send({ type: "ack", parts: board });
  };
  send({ type: "start" });
  ackAll();
  return {
    level,
    get progress() {
      return progress;
    },
    get effect() {
      return effect;
    },
    put(...parts: Part[]) {
      for (const p of parts) {
        send({ type: "change", before: board, after: [...board, p] });
        board = [...board, p];
        ackAll();
      }
    },
    remove(id: string) {
      const after = board.filter((p) => p.id !== id);
      send({ type: "change", before: board, after });
      board = after;
    },
  };
}

const messageOf = (level: Game["levels"][number], code: string) => level.rules.forbid.find((f) => f.code === code)?.message;

describe("Perch level 2: the direction of the LED", () => {
  /** The button tasks (1 to 3) are done, and the resistor is in A-a12 and A-a15 (task 4). */
  const atLed = () => {
    const l = learner(perch, 2);
    l.put(...perch.boards.levels[2].slice(0, 3), { id: "r1", type: "resistor", a: "A-a12", b: "A-a15" });
    expect(l.progress).toMatchObject({ phase: "task", index: 4, mistakes: 0 });
    return l;
  };

  it("gives reversed_led at once for the short leg in the line of a resistor leg (the steps of the issue)", () => {
    const l = atLed();
    l.put(led("A-b16", "A-b15"));
    expect(l.effect).toBe("buzz");
    expect(l.progress).toMatchObject({ phase: "mistake", index: 4, mistakes: 1, mistake: { code: "reversed_led", parts: ["led1"] } });
  });

  it("tells the exact holes for the LED in the reversed_led text (Hanif's answer 4)", () => {
    const l = atLed();
    l.put(led("A-b16", "A-b15"));
    const text = l.progress.mistake?.message ?? "";
    expect(text).toContain("Put the long leg (+) in row b, column 15 of breadboard A.");
    expect(text).toContain("the free leg of the resistor (row a, column 15)");
    expect(text).toContain("Put the short leg (−) in row b, column 16.");
    expect(text).toContain("connect column 16 to the blue − line");
    expect(text).toContain("The short leg (−) is the shorter of its two legs.");
    expect(text).not.toMatch(/[{}]/);
  });

  it("keeps the plain reversed_led text when the level has no place text", () => {
    const level = perch.levels.find((l) => l.position === 2)!;
    const forbid = level.rules.forbid.map(({ place_message: _, ...f }) => f);
    const plan: Plan = { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid };
    let progress = step(perch.bench, plan, startProgress(), { type: "start" }).progress;
    let board = startBoard(perch.boards, 2);
    while (needsAck(plan.tasks[progress.index].target)) progress = step(perch.bench, plan, progress, { type: "ack", parts: board }).progress;
    for (const p of [...perch.boards.levels[2].slice(0, 3), { id: "r1", type: "resistor", a: "A-a12", b: "A-a15" } as Part, led("A-b16", "A-b15")]) {
      progress = step(perch.bench, plan, progress, { type: "change", before: board, after: [...board, p] }).progress;
      board = [...board, p];
      while (progress.phase === "task" && needsAck(plan.tasks[progress.index].target)) progress = step(perch.bench, plan, progress, { type: "ack", parts: board }).progress;
    }
    expect(progress.mistake).toMatchObject({ code: "reversed_led", message: messageOf(level, "reversed_led") });
  });

  it("gives reversed_led for the short leg in the line of the other resistor leg too", () => {
    const l = atLed();
    l.put(led("A-b11", "A-b12"));
    expect(l.progress).toMatchObject({ phase: "mistake", mistake: { code: "reversed_led" } });
  });

  it("gives reversed_led at once for the long leg on ground", () => {
    const l = atLed();
    // Line 29 goes to the blue − line (the wire of task 3).
    l.put(led("A-b29", "A-b28"));
    expect(l.progress).toMatchObject({ phase: "mistake", mistake: { code: "reversed_led" } });
  });

  it("ends the Mistake when the learner takes the LED away, and accepts it the right way round", () => {
    const l = atLed();
    l.put(led("A-b16", "A-b15"));
    l.remove("led1");
    expect(l.progress).toMatchObject({ phase: "task", index: 4, mistake: null });
    l.put(led("A-b15", "A-b16"));
    expect(l.effect).toBe("snap");
    expect(l.progress).toMatchObject({ phase: "task", index: 5, mistakes: 1, tasksDone: 5 });
  });

  it("accepts the LED with its long leg in the line of a resistor leg", () => {
    const l = atLed();
    l.put(led("A-b15", "A-b16"));
    expect(l.effect).toBe("snap");
    expect(l.progress).toMatchObject({ phase: "task", index: 5, mistakes: 0 });
  });

  it("gives led_shorted for a wire that joins the two LED legs", () => {
    const l = atLed();
    // The long leg is in the line of the resistor, so task 7 is done too.
    l.put(led("A-b15", "A-b16"), wire("w7", "A-f9", "A-c12"));
    expect(l.progress).toMatchObject({ phase: "task", index: 7, mistakes: 0 });
    l.put(wire("w8", "A-c15", "A-c16"));
    expect(l.effect).toBe("buzz");
    expect(l.progress).toMatchObject({ phase: "mistake", mistake: { code: "led_shorted", parts: ["w8"] } });
    expect(l.progress.mistake?.message).toBe(messageOf(l.level, "led_shorted"));
  });

  it("has the 'same line of 5' tip in task 7", () => {
    const task7 = perchLevels.find((l) => l.position === 2)!.tasks.find((t) => t.position === 7)!;
    expect(task7.instruction).toMatch(/same line of 5, or connect them with a wire/);
  });
});

describe("Arduino Foundations levels 2 and 4: the direction of the LED", () => {
  for (const position of [2, 4]) {
    /** The resistor is in A-c22 and A-c26 (task 1). */
    const atLed = () => {
      const l = learner(arduino, position);
      l.put(arduino.boards.levels[position][0]);
      expect(l.progress).toMatchObject({ phase: "task", index: 1, mistakes: 0 });
      return l;
    };

    it(`level ${position}: gives reversed_led at once for the short leg in the line of a resistor leg`, () => {
      const l = atLed();
      l.put(led("A-e27", "A-e26"));
      expect(l.effect).toBe("buzz");
      expect(l.progress).toMatchObject({ phase: "mistake", index: 1, mistake: { code: "reversed_led", parts: ["led1"] } });
      const text = l.progress.mistake?.message ?? "";
      expect(text).toContain("Put the long leg (+) in row a, column 26.");
      expect(text).toContain("the free leg of the resistor (row c, column 26)");
      expect(text).toContain("Put the short leg (−) in row a, column 27.");
      expect(text).not.toMatch(/[{}]/);
    });

    it(`level ${position}: accepts the LED the right way round`, () => {
      const l = atLed();
      l.put(led("A-e26", "A-e27"));
      expect(l.effect).toBe("snap");
      expect(l.progress).toMatchObject({ phase: "task", index: 2, mistakes: 0 });
    });

    it(`level ${position}: gives led_shorted for a wire that joins the two LED legs`, () => {
      const l = atLed();
      l.put(led("A-e26", "A-e27"), wire("w9", "A-a26", "A-a27"));
      expect(l.progress).toMatchObject({ phase: "mistake", mistake: { code: "led_shorted", parts: ["w9"] } });
      expect(l.progress.mistake?.message).toBe(messageOf(l.level, "led_shorted"));
    });
  }
});

describe("the LED place text", () => {
  it("tells where the long leg and the short leg go, in the guide and in the LED task of each level", () => {
    const withLed = [...perchLevels, ...arduinoLevels].filter((l) => l.tasks.some((t) => t.target.kind === "place" && t.target.part === "led"));
    for (const l of withLed) {
      const task = l.tasks.find((t) => t.target.kind === "place" && t.target.part === "led")!;
      expect(task.instruction, l.title).toMatch(/long leg \(\+\) in the same column as the free leg of the resistor/);
      expect(task.instruction, l.title).toMatch(/short leg \(−\) in the next column/);
      expect(l.rules.forbid.find((f) => f.code === "reversed_led")?.place_message, l.title).toMatch(/\{long_column\}/);
    }
    expect(build.guide.led.start).toMatch(/same column as the free leg of the resistor/);
    expect(build.guide.led.finish).toMatch(/next column/);
  });
});

describe("the led_shorted rule", () => {
  it("is in each level that puts an LED", () => {
    const withLed = [...perchLevels, ...arduinoLevels].filter((l) => l.tasks.some((t) => t.target.kind === "place" && t.target.part === "led"));
    expect(withLed).toHaveLength(3);
    for (const l of withLed) expect(l.rules.forbid, l.title).toContainEqual(expect.objectContaining({ a: "led1.anode", b: "led1.cathode", code: "led_shorted" }));
  });
});
