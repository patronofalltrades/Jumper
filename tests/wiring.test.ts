import { describe, expect, it } from "vitest";
import type { Part } from "@/lib/circuit/parts";
import { countWiring, readWiring, toWiring } from "@/lib/snapshots/wiring";

// A small Perch board: two wires, a resistor, an LED and the mic module.
const board: Part[] = [
  { id: "w1", type: "wire", a: "A-a8", b: "B-a14", color: "#D63A2F" },
  { id: "w2", type: "wire", a: "A-j3", b: "bbA.-", color: "#25292D" },
  { id: "r1", type: "resistor", a: "A-c10", b: "A-c14" },
  { id: "led1", type: "led", a: "A-d14", b: "A-d15" },
  { id: "mic1", type: "inmp441", at: "B-c12" },
];

// What the database gives back: the saved JSON, read again.
const saveAndOpen = (parts: Part[]) => readWiring(JSON.parse(JSON.stringify(toWiring(parts))));

describe("snapshot wiring", () => {
  it("opens the same board that was saved", () => {
    expect(saveAndOpen(board)).toEqual(board);
  });

  it("keeps every wire, with its color", () => {
    const opened = saveAndOpen(board)!;
    expect(countWiring(opened)).toEqual({ parts: 3, wires: 2 });
    expect(opened.find((p) => p.id === "w1")).toEqual(board[0]);
  });

  it("saves an empty board as an empty board", () => {
    expect(saveAndOpen([])).toEqual([]);
  });

  it("refuses wiring that is not a board", () => {
    expect(readWiring(null)).toBeNull();
    expect(readWiring({ version: 1, parts: [{ id: "x1", type: "laser", at: "A-a1" }] })).toBeNull();
    expect(readWiring({ version: 2, parts: [] })).toBeNull();
  });
});
