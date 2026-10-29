import { describe, expect, it } from "vitest";
import { createBench, perchBench } from "@/lib/circuit/bench";
import { ledSpot } from "@/lib/circuit/led-spot";
import type { Part } from "@/lib/circuit/parts";
import { loadBenchSpec } from "@/lib/content/benches";

// Issue #102 (Hanif's answer 4 on PR #108): the reversed_led text tells the learner the exact holes for the LED. The long
// leg (+) goes in the line of the free leg of the resistor. The short leg (−) goes in the same row, in the next column,
// in a line that has nothing in it yet.

const perch = perchBench();
const arduino = createBench(await loadBenchSpec("arduino-foundations"));
const r1: Part = { id: "r1", type: "resistor", a: "A-a12", b: "A-a15" };
const reversed: Part = { id: "led1", type: "led", a: "A-b16", b: "A-b15" };
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });
const ids = (spot: ReturnType<typeof ledSpot>) => spot && { resistor: spot.resistor.id, long: spot.long.id, short: spot.short.id };

describe("ledSpot", () => {
  it("puts the long leg next to the free leg 2 of the resistor, and the short leg in the next column", () => {
    expect(ids(ledSpot(perch, [r1, reversed], "r1", "led1"))).toEqual({ resistor: "A-a15", long: "A-b15", short: "A-b16" });
  });

  it("does not count the LED that the learner must move", () => {
    const onTop: Part = { id: "led1", type: "led", a: "A-b15", b: "A-c16" };
    expect(ids(ledSpot(perch, [r1, onTop], "r1", "led1"))).toEqual({ resistor: "A-a15", long: "A-b15", short: "A-b16" });
  });

  it("uses the column on the other side when the next column has a part in it", () => {
    expect(ids(ledSpot(perch, [r1, reversed, wire("w9", "A-e16", "A-L-3")], "r1", "led1"))).toEqual({ resistor: "A-a15", long: "A-b15", short: "A-b14" });
  });

  it("uses leg 1 of the resistor when leg 2 is not free", () => {
    expect(ids(ledSpot(perch, [r1, reversed, wire("w7", "A-f9", "A-c15")], "r1", "led1"))).toEqual({ resistor: "A-a12", long: "A-b12", short: "A-b13" });
  });

  it("does not use a line with a pin of the main board", () => {
    // Header J3 of the ESP32-S3 is in row j of breadboard A, from column 5: each line f–j of those columns has a pin.
    const low: Part = { id: "r1", type: "resistor", a: "A-f6", b: "A-f9" };
    expect(ledSpot(perch, [low], "r1", "led1")).toBeNull();
  });

  it("is null when the two legs of the resistor are not free", () => {
    expect(ledSpot(perch, [r1, wire("w7", "A-f9", "A-c15"), wire("w8", "A-f10", "A-c12")], "r1", "led1")).toBeNull();
  });

  it("is null when the resistor is not on the bench", () => {
    expect(ledSpot(perch, [reversed], "r1", "led1")).toBeNull();
  });

  it("works on the Arduino bench", () => {
    const r: Part = { id: "r1", type: "resistor", a: "A-c22", b: "A-c26" };
    const turned: Part = { id: "led1", type: "led", a: "A-e27", b: "A-e26" };
    expect(ids(ledSpot(arduino, [r, turned], "r1", "led1"))).toEqual({ resistor: "A-c26", long: "A-a26", short: "A-a27" });
  });
});
