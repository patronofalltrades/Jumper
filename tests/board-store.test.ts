import { describe, expect, it } from "vitest";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadProjects } from "@/lib/content/load";
import { createBoardStore } from "@/lib/game/board-store";

const tap = (store: ReturnType<typeof createBoardStore>, ...holes: string[]) => holes.forEach((h) => store.getState().tapHole(h));

describe("board store", () => {
  it("does not change a read-only board (a saved snapshot)", () => {
    const store = createBoardStore();
    const parts = [{ id: "w1", type: "wire" as const, a: "A-a3", b: "A-a9", color: "#D63A2F" }];
    store.getState().open("snapshot/1", { parts, readOnly: true });
    tap(store, "A-b3", "A-b9");
    store.getState().removePart("w1");
    expect(store.getState().parts).toEqual(parts);
    expect(store.getState().pending).toBeNull();
  });

  it("keeps the board that the level opened with, so a new part shows as placed by the learner", () => {
    const store = createBoardStore();
    const start = [{ id: "w1", type: "wire" as const, a: "A-a3", b: "A-a9", color: "#D63A2F" }];
    store.getState().open("perch/2", { parts: start });
    tap(store, "A-a20", "A-a25");
    expect(store.getState().base).toEqual(start);
    expect(store.getState().parts).toHaveLength(2);
    // A board that this browser saved keeps the base of its first visit.
    store.getState().open("perch/3", { parts: store.getState().parts, base: start });
    expect(store.getState().base).toEqual(start);
  });

  it("places a wire with two taps", () => {
    const store = createBoardStore();
    tap(store, "A-a3");
    expect(store.getState().pending).toBe("A-a3");
    tap(store, "A-a9");
    expect(store.getState().parts).toEqual([{ id: "w1", type: "wire", a: "A-a3", b: "A-a9", color: "#D63A2F" }]);
    expect(store.getState().pending).toBeNull();
  });

  it("places an LED with the first tap as the + leg", () => {
    const store = createBoardStore();
    store.getState().setTool("led");
    tap(store, "A-b10", "A-b11");
    expect(store.getState().parts[0]).toMatchObject({ id: "led1", type: "led", a: "A-b10", b: "A-b11" });
  });

  it("does not start a part on an ESP32-S3 pin, and says why", () => {
    const store = createBoardStore();
    tap(store, "A-j8");
    expect(store.getState().pending).toBeNull();
    expect(store.getState().notice).toEqual({ problem: "esp_pin", hole: "A-j8" });
  });

  it("cancels the part when you tap the first hole again", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a3");
    expect(store.getState().pending).toBeNull();
    expect(store.getState().parts).toEqual([]);
  });

  it("removes a part by a tap on one of its holes, with the Remove tool", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a9");
    store.getState().setTool("remove");
    tap(store, "A-a9");
    expect(store.getState().parts).toEqual([]);
  });

  it("undoes the last action: first the remove, then the place", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a9");
    store.getState().removePart("w1");
    store.getState().undo();
    expect(store.getState().parts.map((p) => p.id)).toEqual(["w1"]);
    store.getState().undo();
    expect(store.getState().parts).toEqual([]);
    store.getState().undo();
    expect(store.getState().notice).toEqual({ problem: "nothing_to_undo" });
  });

  it("starts a different level with an empty bench, and keeps the parts when the same level opens again", () => {
    const store = createBoardStore();
    store.getState().open("perch/2");
    tap(store, "A-a3", "A-a9");
    store.getState().open("perch/2");
    expect(store.getState().parts).toHaveLength(1);
    store.getState().open("perch/3");
    expect(store.getState().parts).toEqual([]);
    expect(store.getState().history).toEqual([]);
  });
});

describe("board store: modules", () => {
  it("puts a module down with one click on a laptop", () => {
    const store = createBoardStore();
    store.getState().setTool("inmp441");
    tap(store, "A-e1");
    expect(store.getState().parts).toEqual([{ id: "mic1", type: "inmp441", at: "A-e1" }]);
  });

  it("on a phone, shows where the module goes on the first tap, and puts it down on a second tap on the same hole", () => {
    const store = createBoardStore();
    store.getState().setTool("st7789-154");
    store.getState().tapHole("B-f3", true);
    expect(store.getState().pending).toBe("B-f3");
    expect(store.getState().parts).toEqual([]);
    store.getState().tapHole("B-f5", true);
    expect(store.getState().pending).toBe("B-f5");
    store.getState().tapHole("B-f5", true);
    expect(store.getState().parts).toEqual([{ id: "lcd1", type: "st7789-154", at: "B-f5" }]);
    expect(store.getState().pending).toBeNull();
  });

  it("refuses a module that does not fit, and says why", () => {
    const store = createBoardStore();
    store.getState().setTool("pushbutton");
    tap(store, "A-a3");
    expect(store.getState().parts).toEqual([]);
    expect(store.getState().notice).toEqual({ problem: "needs_gap", hole: "A-a3" });
    store.getState().tapHole("B-j29", true);
    expect(store.getState().notice).toEqual({ problem: "off_board", hole: "B-j29" });
    store.getState().tapHole("B-j29", true);
    expect(store.getState().parts).toEqual([]);
  });

  it("removes a module by a tap on a pin or under its body, and undo puts it back", () => {
    const store = createBoardStore();
    store.getState().setTool("inmp441");
    tap(store, "A-e1");
    store.getState().setTool("remove");
    tap(store, "A-g2");
    expect(store.getState().parts).toEqual([]);
    store.getState().undo();
    expect(store.getState().parts.map((p) => p.id)).toEqual(["mic1"]);
    tap(store, "A-f3");
    expect(store.getState().parts).toEqual([]);
  });

  it("places a speaker with two taps, on any two free holes", () => {
    const store = createBoardStore();
    store.getState().setTool("speaker");
    tap(store, "A-a1", "A-a20");
    expect(store.getState().parts).toEqual([{ id: "spk1", type: "speaker", a: "A-a1", b: "A-a20" }]);
  });
});

const perchBoards = await loadBoards("perch");

describe("board store: build mode", () => {
  const level3 = () => {
    const perch = loadProjects().find((p) => p.slug === "perch")!;
    const level = perch.levels[2];
    const store = createBoardStore();
    store.getState().open("perch/3", {
      plan: { tasks: level.tasks.map((t) => ({ target: t.target, xp: t.xp })), forbid: level.rules.forbid },
      parts: startBoard(perchBoards, 3),
    });
    return store;
  };

  it("starts in the intro, then picks the tool of the first task", () => {
    const store = level3();
    expect(store.getState().progress.phase).toBe("intro");
    store.getState().start();
    expect(store.getState().progress.phase).toBe("task");
    expect(store.getState().tool).toBe("inmp441");
  });

  it("snaps a correct part in with a green flash on its pins, and picks the wire for the next task", () => {
    const store = level3();
    store.getState().start();
    tap(store, "B-e27");
    expect(store.getState().progress).toMatchObject({ index: 1, tasksDone: 1, xp: 10 });
    expect(store.getState().flash).toMatchObject({ kind: "snap", holes: expect.arrayContaining(["B-e27", "B-f29"]) });
    expect(store.getState().tool).toBe("wire");
  });

  it("opens the 'what happened' pop-up of the task that the learner finished, and Got it closes it", () => {
    const store = level3();
    store.getState().start();
    expect(store.getState().done).toBeNull();
    tap(store, "B-e27");
    expect(store.getState().done).toBe(0);
    store.getState().seen();
    expect(store.getState().done).toBeNull();
    // A wrong wire finishes no task.
    tap(store, "B-c28", "B-R-20");
    expect(store.getState().done).toBeNull();
  });

  it("buzzes a wrong wire with the forbid rule that it breaks, and Undo ends the mistake", () => {
    const store = level3();
    store.getState().start();
    tap(store, "B-e27");
    // VDD of the mic (column 28, rows a–e) to the ground rail.
    tap(store, "B-c28", "B-R-20");
    expect(store.getState().progress).toMatchObject({ phase: "mistake", mistakes: 1, mistake: { code: "reversed_power" } });
    expect(store.getState().flash?.kind).toBe("buzz");
    store.getState().undo();
    expect(store.getState().progress).toMatchObject({ phase: "task", mistake: null, mistakes: 1, index: 1 });
  });

  it("removes the speaker with the amplifier whose terminal holds it", () => {
    const store = createBoardStore();
    store.getState().setTool("max98357a");
    tap(store, "A-c11");
    store.getState().setTool("speaker");
    tap(store, "amp1.OUT+", "amp1.OUT-");
    expect(store.getState().parts.map((p) => p.id)).toEqual(["amp1", "spk1"]);
    store.getState().removePart("amp1");
    expect(store.getState().parts).toEqual([]);
  });
});
