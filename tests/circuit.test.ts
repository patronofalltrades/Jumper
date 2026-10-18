import { describe, expect, it } from "vitest";
import { nearestHole, perchBench } from "@/lib/circuit/bench";
import { buildNets, connected, endpointHole, netHoles } from "@/lib/circuit/nets";
import { checkHole, checkPlacement, nextPartId, type Part } from "@/lib/circuit/parts";
import { loadProjects } from "@/lib/content/load";

const bench = perchBench();
const wire = (id: string, a: string, b: string): Part => ({ id, type: "wire", a, b });
const nets = (parts: Part[] = []) => buildNets(bench, parts);

describe("hole names", () => {
  it("gives each 400-hole breadboard 300 main holes and 100 rail holes", () => {
    for (const board of ["A", "B"]) {
      const holes = bench.holes.filter((h) => h.board === board);
      expect(holes.filter((h) => h.kind === "main")).toHaveLength(300);
      expect(holes.filter((h) => h.kind === "rail")).toHaveLength(100);
    }
  });

  it("names holes <board>-<row><column> and rail holes <board>-<rail><n>", () => {
    expect(bench.byId.get("A-c14")).toMatchObject({ board: "A", row: "c", n: 14 });
    expect(bench.byId.get("B-R+25")).toMatchObject({ board: "B", kind: "rail", row: "R+", n: 25 });
    expect(bench.byId.has("A-k1")).toBe(false);
    expect(bench.byId.has("A-a31")).toBe(false);
  });

  it("puts A on the left, B on the right, and column 1 nearest to you", () => {
    expect(bench.byId.get("A-j1")!.x).toBeLessThan(bench.byId.get("B-a1")!.x);
    expect(bench.byId.get("A-a1")!.z).toBeGreaterThan(bench.byId.get("A-a30")!.z);
  });

  it("finds the nearest hole within half a pitch, and no hole in the center gap", () => {
    const c14 = bench.byId.get("A-c14")!;
    expect(nearestHole(bench, c14.x + 0.3, c14.z - 0.2)?.id).toBe("A-c14");
    expect(nearestHole(bench, 5.5, c14.z)).toBeNull();
  });
});

describe("breadboard nets", () => {
  const n = nets();
  const same = (a: string, b: string) => n.get(a) === n.get(b);

  it("connects the 5 holes of a half-column, and not the other half or the next column", () => {
    expect(same("A-a7", "A-e7")).toBe(true);
    expect(same("A-f7", "A-j7")).toBe(true);
    expect(same("A-e7", "A-f7")).toBe(false);
    expect(same("A-a7", "A-a8")).toBe(false);
  });

  it("connects a rail along its full length, and keeps the + and − rails apart", () => {
    expect(same("A-L+1", "A-L+25")).toBe(true);
    expect(same("A-L+1", "A-L-1")).toBe(false);
  });

  it("keeps the two breadboards apart until a wire joins them", () => {
    expect(same("A-L+1", "B-R+1")).toBe(false);
    const wired = nets([wire("w1", "A-L+3", "B-R+3")]);
    expect(wired.get("A-L+25")).toBe(wired.get("B-R+1"));
  });

  it("joins every hole of two strips when a wire connects them", () => {
    const wired = nets([wire("w1", "A-a3", "A-a20")]);
    expect(netHoles(wired, "A-e3")).toEqual(
      new Set(["A-a3", "A-b3", "A-c3", "A-d3", "A-e3", "A-a20", "A-b20", "A-c20", "A-d20", "A-e20"]),
    );
  });

  it("does not connect through a resistor or an LED", () => {
    const parts: Part[] = [
      { id: "r1", type: "resistor", a: "A-a3", b: "A-a8" },
      { id: "led1", type: "led", a: "A-b10", b: "A-b11" },
    ];
    const withParts = nets(parts);
    expect(withParts.get("A-a3")).not.toBe(withParts.get("A-a8"));
    expect(withParts.get("A-b10")).not.toBe(withParts.get("A-b11"));
  });

  it("connects ESP32-S3 pins with the same name, because the board connects them", () => {
    const gnd = bench.pins.filter((p) => p.name === "GND").map((p) => p.hole);
    expect(gnd).toHaveLength(4);
    for (const hole of gnd) expect(n.get(hole)).toBe(n.get(gnd[0]));
    expect(netHoles(n, "B-c5").has("B-c6")).toBe(true); // the two 3V3 pins
  });
});

describe("which holes are connected", () => {
  it("finds ESP32-S3 pins, open rails and part legs by endpoint name", () => {
    const parts: Part[] = [{ id: "led1", type: "led", a: "A-b10", b: "A-b11" }];
    expect(endpointHole(bench, parts, "esp.GPIO1")).toBe("A-j8");
    expect(endpointHole(bench, parts, "bbA.+")).toBe("A-L+1");
    expect(endpointHole(bench, parts, "bbB.-")).toBe("B-R-1");
    expect(endpointHole(bench, parts, "led1.cathode")).toBe("A-b11");
    expect(endpointHole(bench, parts, "esp.GPIO99")).toBeNull();
    expect(endpointHole(bench, parts, "r1.1")).toBeNull();
  });

  it("connects 3V3 to the + rail of A with one wire into a free hole of the 3V3 strip", () => {
    expect(connected(bench, [], nets(), "esp.3V3", "bbA.+")).toBe(false);
    const parts = [wire("w1", "B-d5", "A-L+3")];
    expect(connected(bench, parts, nets(parts), "esp.3V3", "bbA.+")).toBe(true);
    expect(connected(bench, parts, nets(parts), "esp.GND", "bbA.+")).toBe(false);
  });

  it("follows a path of several wires", () => {
    const parts = [wire("w1", "A-i8", "A-a2"), wire("w2", "A-e2", "B-j2")];
    const gpio1 = endpointHole(bench, parts, "esp.GPIO1")!;
    expect(netHoles(nets(parts), gpio1).has("B-f2")).toBe(true);
  });
});

describe("placement rules", () => {
  it("lets a leg go only into a free, reachable hole", () => {
    const parts = [wire("w1", "A-a1", "A-a2")];
    expect(checkHole(bench, parts, "A-a3")).toBeNull();
    expect(checkHole(bench, parts, "A-a1")).toBe("taken");
    expect(checkHole(bench, parts, "A-j8")).toBe("esp_pin");
    expect(checkHole(bench, parts, "A-R+10")).toBe("covered");
    expect(checkHole(bench, parts, "A-z1")).toBe("no_hole");
  });

  it("leaves row i of A and row b of B free beside the ESP32-S3 pins", () => {
    expect(checkHole(bench, [], "A-i8")).toBeNull();
    expect(checkHole(bench, [], "B-b8")).toBeNull();
  });

  it("limits how far apart LED and resistor legs go", () => {
    expect(checkPlacement(bench, [], "led", "A-a3", "A-a4")).toBeNull();
    expect(checkPlacement(bench, [], "led", "A-a3", "A-a9")).toBe("led_span");
    expect(checkPlacement(bench, [], "resistor", "A-a3", "A-a4")).toBe("resistor_span");
    expect(checkPlacement(bench, [], "resistor", "A-a3", "A-a7")).toBeNull();
    expect(checkPlacement(bench, [], "wire", "A-a3", "B-j30")).toBeNull();
  });

  it("gives each new part the next free id of its type", () => {
    const parts: Part[] = [wire("w1", "A-a1", "A-a2"), { id: "r1", type: "resistor", a: "A-b1", b: "A-b5" }];
    expect(nextPartId(parts, "wire")).toBe("w2");
    expect(nextPartId(parts, "resistor")).toBe("r2");
    expect(nextPartId(parts, "led")).toBe("led1");
  });
});

describe("ESP32-S3 pin names", () => {
  it("has 44 pins: two headers of 22", () => {
    expect(bench.pins).toHaveLength(44);
    expect(new Set(bench.pins.map((p) => p.hole)).size).toBe(44);
  });

  it("has every esp.* pin that content/projects/perch.json uses", () => {
    const perch = loadProjects().find((p) => p.slug === "perch")!;
    const endpoints = perch.levels.flatMap((l) => [
      ...l.rules.require.flatMap((r) => [r.a, r.b]),
      ...l.rules.forbid.flatMap((r) => [r.a, r.b]),
      ...l.tasks.flatMap((t) => (t.target.kind === "wire" ? [t.target.a, t.target.b] : [])),
    ]);
    const espPins = new Set(endpoints.filter((e) => e.startsWith("esp.")));
    expect(espPins.size).toBeGreaterThan(10);
    for (const e of espPins) expect(endpointHole(bench, [], e), e).not.toBeNull();
  });

  it("names each rail that perch.json uses, and keeps those rails out from under the ESP32-S3", () => {
    for (const e of ["bbA.+", "bbA.-", "bbB.+", "bbB.-"]) {
      const hole = endpointHole(bench, [], e)!;
      expect(bench.covered.has(hole), e).toBe(false);
    }
  });
});
