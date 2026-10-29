import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { diagnose } from "@/lib/circuit/diagnose";
import type { Part } from "@/lib/circuit/parts";
import { loadBoards, startBoard } from "@/lib/content/boards";

const bench = perchBench();
const boards = await loadBoards("perch");
/** The finished board of a level: the parts of that level and of all the levels before it. */
const finished = (position: number) => startBoard(boards, position + 1);
/** The board with one part changed, or without it when `next` is null. The part keeps its id. */
const change = (parts: Part[], id: string, next: Record<string, unknown> | null): Part[] =>
  parts.flatMap((p) => (p.id !== id ? [p] : next ? [{ ...p, ...next } as Part] : []));
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });

// Level 2 (Talk button and status light). The LED cathode (led1.cathode, hole A-b3) joins the blue − line by wire w8.
describe("diagnose: what the learner's wire end connects to now", () => {
  it("says that the end connects to nothing, and in which column", () => {
    const board = change(finished(2), "w8", null);
    expect(diagnose(bench, board, { a: "led1.cathode", b: "esp.GND" })).toMatchObject({
      kind: "nothing",
      end: "led1.cathode",
      other: "esp.GND",
      to: { id: "A-b3", n: 3 },
    });
  });

  it("says that the end goes to a pin of the board, and which pin", () => {
    // w8 goes to GPIO 4 (hole B-a8) instead of the blue − line.
    const board = change(finished(2), "w8", { b: "B-a8" });
    expect(diagnose(bench, board, { a: "led1.cathode", b: "esp.GND" })).toMatchObject({
      kind: "pin",
      end: "led1.cathode",
      other: "esp.GND",
      pin: "GPIO4",
    });
  });

  it("says that the end goes to a rail, and which rail", () => {
    // w8 goes to the red + line (hole A-L+3) instead of the blue − line. w1 is taken out, so the red line has no pin
    // on it (with w1, the red line would be 3V3, and the text would name the pin).
    const board = change(change(finished(2), "w1", null), "w8", { b: "A-L+3" });
    expect(diagnose(bench, board, { a: "led1.cathode", b: "esp.GND" })).toMatchObject({
      kind: "rail",
      end: "led1.cathode",
      other: "esp.GND",
      rail: "+",
    });
  });

  it("says that the wire is 1 line away: the next column, in the same row", () => {
    // The resistor leg r1.1 (A-a2) must join GPIO 2 (A-j9). The wire w7 is gone, and a wire goes to column 1 (A-a1).
    const board = [...change(finished(2), "w7", null), wire("w7b", "A-a1", "A-j9")];
    expect(diagnose(bench, board, { a: "esp.GPIO2", b: "r1.1" })).toMatchObject({
      kind: "line",
      end: "r1.1",
      other: "esp.GPIO2",
      from: { id: "A-a1" },
      to: { id: "A-a2" },
    });
  });

  it("says that the wire is 1 hole away: the same column, across the center gap", () => {
    // The LED moves to row e (led1.cathode at A-e3). The wire goes to A-f3, on the other side of the gap.
    const board = [...change(change(finished(2), "w8", null), "led1", { a: "A-e4", b: "A-e3" }), wire("w8b", "A-f3", "A-L-3")];
    expect(diagnose(bench, board, { a: "led1.cathode", b: "esp.GND" })).toMatchObject({
      kind: "hole",
      end: "led1.cathode",
      other: "esp.GND",
      from: { id: "A-f3" },
      to: { id: "A-e3" },
    });
  });

  it("gives no reason when the end has a wire that goes nowhere", () => {
    // The button leg btn1.2 (A-e29) shares its line with a wire that ends in a free hole. That is not one of the 3 cases.
    const board = [...change(finished(2), "w6", null), wire("w6x", "A-a29", "A-a30")];
    expect(diagnose(bench, board, { a: "btn1.2", b: "esp.GND" })).toBeNull();
  });

  it("gives no reason when both ends are fixed (the board or a rail), so the general text stays", () => {
    const board = finished(1).filter((p) => p.id !== "w2");
    expect(diagnose(bench, board, { a: "esp.GND", b: "bbA.-" })).toBeNull();
  });

  it("names the pin of the line that the wire goes to, for a part pin of the mic", () => {
    // The WS wire of the mic (w12) goes to GPIO 5 instead of GPIO 4.
    const board = change(finished(3), "w12", { b: "B-d9" });
    expect(diagnose(bench, board, { a: "mic1.WS", b: "esp.GPIO4" })).toMatchObject({
      kind: "pin",
      end: "mic1.WS",
      other: "esp.GPIO4",
      pin: "GPIO5",
    });
  });
});
