import { describe, expect, it } from "vitest";
import { perchBench } from "@/lib/circuit/bench";
import { bodyHoles, footprintHoles, FOOTPRINTS, isModuleType } from "@/lib/circuit/modules";
import { buildNets, connected, describeHole, endpointHole } from "@/lib/circuit/nets";
import { checkHole, checkModule, checkPlacement, nextPartId, partAt, partPins, terminalAt, type Part } from "@/lib/circuit/parts";
import { loadProjects } from "@/lib/content/load";

const bench = perchBench();
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });
// Columns 1–4 and 27–30 are free of ESP32-S3 lines on both breadboards.
const mic: Part = { id: "mic1", type: "inmp441", at: "A-e1" };

describe("module footprints", () => {
  it("puts the mic pins in 2 rows of 3, across the center gap", () => {
    expect(footprintHoles(bench, "inmp441", "A-e3")!.map((p) => `${p.name}@${p.hole}`)).toEqual([
      "GND@A-e3",
      "VDD@A-e4",
      "SD@A-e5",
      "LR@A-f3",
      "WS@A-f4",
      "SCK@A-f5",
    ]);
  });

  it("puts the amp header in the order of the Adafruit board: LRC, BCLK, DIN, GAIN, SD, GND, Vin", () => {
    expect(FOOTPRINTS.max98357a.pins.filter((p) => p.row === 0).map((p) => p.name)).toEqual(["LRC", "BCLK", "DIN", "GAIN", "SD", "GND", "VIN"]);
  });

  it("puts the 4 legs of the button across the center gap, and the speaker terminal of the amp on the far side", () => {
    expect(footprintHoles(bench, "pushbutton", "A-e10")!.map((p) => p.hole)).toEqual(["A-e10", "A-e12", "A-f10", "A-f12"]);
    const amp = footprintHoles(bench, "max98357a", "A-c3")!;
    expect(amp.find((p) => p.name === "VIN")!.hole).toBe("A-c9");
    // − is on the LRC side and + on the Vin side, as on the real board. The terminal is on top: these are the holes under it.
    expect(amp.find((p) => p.name === "OUT-")).toMatchObject({ hole: "A-f5", terminal: true });
    expect(amp.find((p) => p.name === "OUT+")).toMatchObject({ hole: "A-f7", terminal: true });
  });

  it("gives no holes when a pin is off the breadboard", () => {
    expect(footprintHoles(bench, "st7789-154", "B-j24")).toBeNull();
    expect(footprintHoles(bench, "max98357a", "A-h3")).toBeNull();
    expect(footprintHoles(bench, "inmp441", "A-L+3")).toBeNull();
  });

  it("covers the holes next to the pins with the body, and not the pin holes", () => {
    const pins = footprintHoles(bench, "inmp441", "A-e3")!;
    const covered = bodyHoles(bench, "inmp441", pins).map((h) => h.id);
    expect(covered).toContain("A-d4");
    expect(covered).toContain("A-g4");
    expect(covered).toContain("A-e6");
    expect(covered).not.toContain("A-e3");
    expect(covered).not.toContain("A-c4");
    expect(covered).not.toContain("A-h4");
  });

  it("names every module pin that perch.json uses", () => {
    const perch = loadProjects().find((p) => p.slug === "perch")!;
    for (const level of perch.levels) {
      const placed = level.tasks.flatMap((t) => (t.target.kind === "place" && isModuleType(t.target.part) ? [t.target] : []));
      const endpoints = [...level.rules.require, ...level.tasks.flatMap((t) => (t.target.kind === "wire" ? [t.target] : []))].flatMap((c) => [c.a, c.b]);
      for (const { id, part } of placed) {
        const names = new Set(FOOTPRINTS[part as keyof typeof FOOTPRINTS].pins.map((p) => p.name));
        for (const e of endpoints.filter((e) => e.startsWith(`${id}.`))) expect(names.has(e.slice(id.length + 1)), e).toBe(true);
      }
    }
  });
});

describe("module placement", () => {
  it("accepts a module on free holes", () => {
    expect(checkModule(bench, [], "inmp441", "A-e1")).toBeNull();
    expect(checkModule(bench, [], "inmp441", "B-e27")).toBeNull();
    expect(checkModule(bench, [], "st7789-154", "B-h20")).toBeNull();
    expect(checkModule(bench, [], "pushbutton", "A-e1")).toBeNull();
    expect(checkModule(bench, [], "max98357a", "A-c1")).toBeNull();
  });

  it("accepts the amp on one side of the gap anywhere, because its speaker terminal is not in the breadboard", () => {
    expect(checkModule(bench, [], "max98357a", "A-c11")).toBeNull();
    expect(checkModule(bench, [], "max98357a", "B-f11")).toBeNull();
  });

  it("refuses a module pin in a line of an ESP32-S3 pin", () => {
    // Column 14 of A: row j holds GPIO 38, so the mic pins in rows f–j would connect to it.
    expect(checkModule(bench, [], "inmp441", "A-e14")).toBe("esp_line");
    expect(checkModule(bench, [], "pushbutton", "A-e10")).toBe("esp_line");
    // Rows a–e of B share their lines with the J1 pins in row a.
    expect(checkModule(bench, [], "st7789-154", "B-c10")).toBe("esp_line");
    expect(checkModule(bench, [], "max98357a", "B-c3")).toBe("esp_line");
  });

  it("refuses a module that hangs off the board, or with pin 1 on a rail", () => {
    expect(checkModule(bench, [], "st7789-154", "B-j24")).toBe("off_board");
    expect(checkModule(bench, [], "inmp441", "B-R+3")).toBe("rail_pin");
    expect(checkModule(bench, [], "inmp441", "B-x3")).toBe("no_hole");
  });

  it("refuses a button or a mic that does not go across the center gap", () => {
    expect(checkModule(bench, [], "pushbutton", "A-a1")).toBe("needs_gap");
    expect(checkModule(bench, [], "inmp441", "A-c3")).toBe("needs_gap");
  });

  it("refuses a pin in an ESP32-S3 pin hole, or a hole under the ESP32-S3", () => {
    expect(checkModule(bench, [], "st7789-154", "A-j5")).toBe("esp_pin");
    expect(checkModule(bench, [], "st7789-154", "A-j1")).toBe("covered");
    // The body would sit on the pins of J3, in row j.
    expect(checkModule(bench, [], "st7789-154", "A-i5")).toBe("covered");
  });

  it("refuses a pin in a full hole, and a body on top of another part", () => {
    expect(checkModule(bench, [wire("w1", "A-e3", "A-a20")], "inmp441", "A-e1")).toBe("taken");
    expect(checkModule(bench, [wire("w1", "A-d2", "A-a20")], "inmp441", "A-e1")).toBe("on_part");
    expect(checkModule(bench, [mic], "inmp441", "A-e3")).toBe("taken");
    expect(checkModule(bench, [mic], "inmp441", "A-e5")).toBe("on_part");
  });

  it("keeps legs out of the pin holes and from under the body", () => {
    expect(checkHole(bench, [mic], "A-f2")).toBe("part_pin");
    expect(checkHole(bench, [mic], "A-g2")).toBe("under_part");
    expect(checkHole(bench, [mic], "A-h2")).toBeNull();
    expect(partAt(bench, [mic], "A-f3")).toBe(mic);
  });

  it("numbers modules with their prefix", () => {
    expect(nextPartId([mic], "inmp441")).toBe("mic2");
    expect(nextPartId([], "st7789-154")).toBe("lcd1");
    expect(nextPartId([], "speaker")).toBe("spk1");
  });
});

describe("module nets", () => {
  it("finds module pins by name, as in perch.json", () => {
    expect(endpointHole(bench, [mic], "mic1.WS")).toBe("A-f2");
    expect(endpointHole(bench, [mic], "mic1.XX")).toBeNull();
    const spk: Part = { id: "spk1", type: "speaker", a: "A-a1", b: "A-a4" };
    expect(endpointHole(bench, [spk], "spk1.+")).toBe("A-a1");
    expect(endpointHole(bench, [spk], "spk1.-")).toBe("A-a4");
  });

  it("connects a mic pin to an ESP32-S3 pin through a wire", () => {
    // GPIO4 is the 4th pin of J1, in hole B-a8.
    const parts = [mic, wire("w1", "A-h2", "B-c8")];
    const nets = buildNets(bench, parts);
    expect(connected(bench, parts, nets, "mic1.WS", "esp.GPIO4")).toBe(true);
    expect(connected(bench, parts, nets, "mic1.SCK", "esp.GPIO4")).toBe(false);
  });

  it("connects the two legs of a button with the same name, and not pin 1 to pin 2", () => {
    const parts: Part[] = [{ id: "btn1", type: "pushbutton", at: "A-e10" }];
    const nets = buildNets(bench, parts);
    expect(nets.get("A-a10")).toBe(nets.get("A-j10"));
    expect(nets.get("A-a12")).toBe(nets.get("A-j12"));
    expect(nets.get("A-a10")).not.toBe(nets.get("A-a12"));
  });

  it("describes a module pin, and names it on the other end of a wire", () => {
    const parts = [mic, wire("w1", "A-h2", "B-c8")];
    const nets = buildNets(bench, parts);
    expect(describeHole(bench, parts, nets, "A-f2")).toMatchObject({ kind: "part", part: { type: "inmp441", pin: "WS" }, pins: ["GPIO4"], partPins: [] });
    expect(describeHole(bench, parts, nets, "B-a8")).toMatchObject({ kind: "pin", pin: "GPIO4", partPins: [{ type: "inmp441", pin: "WS" }] });
  });
});

describe("screw terminal of the amp", () => {
  const amp: Part = { id: "amp1", type: "max98357a", at: "A-c11" };
  const spk: Part = { id: "spk1", type: "speaker", a: "amp1.OUT+", b: "amp1.OUT-" };

  it("names the terminal pins by their endpoint, and finds the hole under them", () => {
    expect(partPins(bench, amp).filter((p) => p.terminal).map((p) => p.hole)).toEqual(["amp1.OUT-", "amp1.OUT+"]);
    expect(terminalAt(bench, [amp], "amp1.OUT+")!.under.id).toBe("A-f15");
    expect(terminalAt(bench, [], "amp1.OUT+")).toBeNull();
  });

  it("takes one speaker lead or wire end in each terminal, and no resistor or LED leg", () => {
    expect(checkHole(bench, [amp], "amp1.OUT+")).toBeNull();
    expect(checkHole(bench, [amp], "amp9.OUT+")).toBe("no_hole");
    expect(checkPlacement(bench, [amp], "speaker", "amp1.OUT+", "amp1.OUT-")).toBeNull();
    expect(checkHole(bench, [amp, spk], "amp1.OUT+")).toBe("taken");
    expect(checkPlacement(bench, [amp], "led", "amp1.OUT+", "A-a1")).toBe("no_hole");
    // The hole under the terminal is under the body of the amp.
    expect(checkHole(bench, [amp], "A-f15")).toBe("under_part");
  });

  it("connects the speaker to the amp outputs through the terminal, and not to the ESP32-S3", () => {
    const parts = [amp, spk];
    const nets = buildNets(bench, parts);
    expect(endpointHole(bench, parts, "amp1.OUT+")).toBe("amp1.OUT+");
    expect(connected(bench, parts, nets, "spk1.+", "amp1.OUT+")).toBe(true);
    expect(connected(bench, parts, nets, "spk1.-", "amp1.OUT-")).toBe(true);
    expect(connected(bench, parts, nets, "amp1.OUT+", "esp.GPIO37")).toBe(false);
    expect(partAt(bench, parts, "amp1.OUT+")).toBe(spk);
    expect(describeHole(bench, parts, nets, "amp1.OUT+")).toMatchObject({ kind: "part", part: { type: "max98357a", pin: "+" } });
  });
});
