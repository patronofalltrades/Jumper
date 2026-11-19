import { describe, expect, it } from "vitest";
import { datasheetGaps, datasheetPins, pinoutGrid } from "@/lib/circuit/datasheet";
import { FOOTPRINTS, type ModuleType } from "@/lib/circuit/modules";

const types = Object.keys(FOOTPRINTS) as ModuleType[];

describe("datasheet data in content/parts/ (issue #182)", () => {
  it.each(types)("%s has a summary, a supply line and a real https datasheet", (type) => {
    const sheet = FOOTPRINTS[type].datasheet;
    expect(sheet.summary.trim().length).toBeGreaterThan(20);
    expect(sheet.supply.trim().length).toBeGreaterThan(5);
    expect(sheet.url).toMatch(/^https:\/\/[^\s]+$/);
  });

  it.each(types)("%s has one line for each pin name, and no line for a pin that does not exist", (type) => {
    expect(datasheetGaps(type)).toEqual({ missing: [], extra: [] });
  });
});

describe("datasheetPins", () => {
  it("gives each pin name one time, in the order of the pins", () => {
    expect(datasheetPins("inmp441").map((p) => p.name)).toEqual(["GND", "VDD", "SD", "LR", "WS", "SCK"]);
  });

  it("counts the legs that share a name (the button has 2 legs for each pin)", () => {
    expect(datasheetPins("pushbutton").map((p) => [p.name, p.legs])).toEqual([
      ["1", 2],
      ["2", 2],
    ]);
  });

  it("marks the screw terminals of the amplifier", () => {
    const terminals = datasheetPins("max98357a").filter((p) => p.terminal).map((p) => p.name);
    expect(terminals).toEqual(["OUT-", "OUT+"]);
  });

  it("uses the printed label", () => {
    expect(datasheetPins("inmp441").find((p) => p.name === "LR")?.label).toBe("L/R");
  });
});

describe("pinoutGrid", () => {
  it("puts each pin at its row and column", () => {
    const grid = pinoutGrid("inmp441");
    expect(grid.map((row) => row.map((c) => c?.label))).toEqual([
      ["GND", "VDD", "SD"],
      ["L/R", "WS", "SCK"],
    ]);
  });

  it("keeps empty spots between pins, and drops rows with no pin", () => {
    const grid = pinoutGrid("max98357a");
    expect(grid).toHaveLength(2);
    expect(grid[1].map((c) => c?.label ?? null)).toEqual([null, null, "−", null, "+", null, null]);
    expect(grid[1][2]?.terminal).toBe(true);
  });
});
