import { describe, expect, it } from "vitest";
import { createBench } from "@/lib/circuit/bench";
import { connectionsOf, diffConnections } from "@/lib/circuit/connections";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";
import { loadBoards, startBoard } from "@/lib/content/boards";

// TRD addendum 6.2: the connections of a board by terminal, and the difference between two boards.

const bench = createBench(await loadBenchSpec("arduino-foundations"));
const boards = await loadBoards("arduino-foundations");
const led: Part[] = [...startBoard(boards, 2), ...boards.levels[2]];
const TERMINALS = ["uno.5V", "uno.GND", "uno.D12", "uno.D13", "bbA.+", "bbA.-", "r1.1", "r1.2", "led1.anode", "led1.cathode"];
const keys = (list: { a: string; b: string }[]) => list.map((c) => `${c.a}|${c.b}`);
const move = (parts: Part[], id: string, a: string, b: string) => parts.map((p) => (p.id === id ? { ...p, a, b } : p));

describe("connectionsOf", () => {
  it("gives the terminal pairs that are on the same net, each pair one time, in order", () => {
    expect(keys(connectionsOf(bench, led, TERMINALS))).toEqual([
      "bbA.+|uno.5V",
      "bbA.-|led1.cathode",
      "bbA.-|uno.GND",
      "led1.anode|r1.2",
      "led1.cathode|uno.GND",
      "r1.1|uno.D13",
    ]);
  });

  it("gives the same connections when the same circuit is in other holes, with other wire ids", () => {
    const shifted: Part[] = [
      { id: "wa", type: "wire", a: "uno-5V", b: "A-L+1" },
      { id: "wb", type: "wire", a: "uno-GND1", b: "A-L-2" },
      { id: "r1", type: "resistor", a: "A-h10", b: "A-h14" },
      { id: "led1", type: "led", a: "A-j14", b: "A-j16" },
      { id: "wc", type: "wire", a: "uno-D13", b: "A-f10" },
      { id: "wd", type: "wire", a: "A-f16", b: "A-L-9" },
    ];
    expect(connectionsOf(bench, shifted, TERMINALS)).toEqual(connectionsOf(bench, led, TERMINALS));
  });

  it("gives nothing for a terminal that is not on the bench", () => {
    expect(connectionsOf(bench, [], ["led1.anode", "r1.2"])).toEqual([]);
  });
});

describe("diffConnections", () => {
  const before = connectionsOf(bench, led, TERMINALS);

  it("finds no change on the same board", () => {
    expect(diffConnections(before, before)).toEqual({ added: [], removed: [], moved: [] });
  });

  it("gives one moved connection, with the old and the new end, when the pin 13 wire goes to pin 12", () => {
    const after = connectionsOf(bench, move(led, "w3", "uno-D12", "A-a22"), TERMINALS);
    expect(diffConnections(before, after)).toEqual({
      added: [],
      removed: [],
      moved: [{ kept: "r1.1", from: "uno.D13", to: "uno.D12", before: { a: "r1.1", b: "uno.D13" }, after: { a: "r1.1", b: "uno.D12" } }],
    });
  });

  it("gives removed connections when a wire goes away", () => {
    const after = connectionsOf(bench, led.filter((p) => p.id !== "w4"), TERMINALS);
    expect(diffConnections(before, after)).toEqual({ added: [], removed: [{ a: "bbA.-", b: "led1.cathode" }, { a: "led1.cathode", b: "uno.GND" }], moved: [] });
  });

  it("puts each change in one list only, when several connections change", () => {
    const after = connectionsOf(bench, move(led, "w4", "A-a27", "A-L+22"), TERMINALS);
    const diff = diffConnections(before, after);
    expect(diff.moved.map((m) => `${m.kept}: ${m.from} → ${m.to}`)).toEqual(["led1.cathode: bbA.- → bbA.+", "led1.cathode: uno.GND → uno.5V"]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});
