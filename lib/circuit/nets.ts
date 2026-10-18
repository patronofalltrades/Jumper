import type { Bench } from "./bench.ts";
import type { ModuleType } from "./modules.ts";
import { isModule, partPins, type Part } from "./parts.ts";

/** Hole id → net id. Holes with the same net id have an electrical connection. */
export type Nets = Map<string, string>;

function unionFind() {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  return { find, union };
}

/**
 * Groups the holes into nets. The breadboard strips connect their holes, wires join strips,
 * and the ESP32-S3 pins with the same name (3V3, GND) are connected on the board itself. In the same way, the pins of a
 * module with the same name connect (the two legs on each side of a pushbutton).
 * Resistors, LEDs, speakers and modules do not join other pins: current goes through them, but they are not a plain connection.
 */
export function buildNets(bench: Bench, parts: Part[]): Nets {
  const uf = unionFind();
  const strip = (hole: string) => bench.byId.get(hole)!.strip;

  for (const p of parts) if (p.type === "wire") uf.union(strip(p.a), strip(p.b));

  const firstPinStrip = new Map<string, string>();
  for (const pin of bench.pins) {
    const s = strip(pin.hole);
    const first = firstPinStrip.get(pin.name);
    if (first) uf.union(s, first);
    else firstPinStrip.set(pin.name, s);
  }

  for (const p of parts) {
    if (!isModule(p)) continue;
    const firstByName = new Map<string, string>();
    for (const pin of partPins(bench, p)) {
      const first = firstByName.get(pin.name);
      if (first) uf.union(strip(pin.hole), first);
      else firstByName.set(pin.name, strip(pin.hole));
    }
  }

  return new Map(bench.holes.map((h) => [h.id, uf.find(h.strip)]));
}

/** All holes in the same net as this hole, the hole too. */
export function netHoles(nets: Nets, hole: string): Set<string> {
  const net = nets.get(hole);
  const out = new Set<string>();
  if (net === undefined) return out;
  for (const [h, n] of nets) if (n === net) out.add(h);
  return out;
}

/**
 * The hole of an endpoint name, as in content/projects: `esp.GPIO4` (an ESP32-S3 pin), `bbA.+` (a rail that is not
 * under the ESP32-S3), `r1.2` / `led1.anode` (a leg of a part on the bench) or `mic1.WS` (a pin of a module).
 * Null if the bench does not have it.
 */
export function endpointHole(bench: Bench, parts: Part[], endpoint: string): string | null {
  const dot = endpoint.indexOf(".");
  const owner = endpoint.slice(0, dot);
  const pin = endpoint.slice(dot + 1);

  if (owner === "esp") return bench.pins.find((p) => p.name === pin)?.hole ?? null;

  const board = /^bb([AB])$/.exec(owner)?.[1] as "A" | "B" | undefined;
  if (board) {
    const rail = bench.openRail[board][pin as "+" | "-"];
    return rail ? `${board}-${rail}1` : null;
  }

  const part = parts.find((p) => p.id === owner);
  if (!part) return null;
  return partPins(bench, part).find((p) => p.name === pin)?.hole ?? null;
}

/** True when the two endpoints are on the same net. For example `connected(bench, parts, nets, "esp.3V3", "bbA.+")`. */
export function connected(bench: Bench, parts: Part[], nets: Nets, a: string, b: string): boolean {
  const ha = endpointHole(bench, parts, a);
  const hb = endpointHole(bench, parts, b);
  return ha !== null && hb !== null && nets.get(ha) === nets.get(hb);
}

export type ModulePin = { type: ModuleType; pin: string };

export type HoleInfo = {
  kind: "pin" | "part" | "main" | "rail";
  /** The ESP32-S3 pin in this hole, for example "GPIO4". */
  pin?: string;
  /** The polarity of a rail hole. */
  rail?: "+" | "-";
  /** The module pin in this hole: the part type and the pin label. */
  part?: ModulePin;
  /** ESP32-S3 pins on the same net, without the pin in this hole. */
  pins: string[];
  /** Module pins on the same net, without the pin in this hole. */
  partPins: ModulePin[];
  /** Polarity of the rails on the same net. */
  rails: ("+" | "-")[];
};

/** What is at a hole, and what it connects to: the facts for the hint next to the pointer. */
export function describeHole(bench: Bench, parts: Part[], nets: Nets, hole: string): HoleInfo {
  const h = bench.byId.get(hole)!;
  const net = netHoles(nets, hole);
  let part: HoleInfo["part"];
  // Module pins on the net, one entry for each part and pin name (the 2 legs "1" of a button are one entry).
  const modulePins = new Map<string, ModulePin>();
  let ownKey = "";
  for (const p of parts) {
    if (!isModule(p)) continue;
    for (const pin of partPins(bench, p)) {
      const key = `${p.id}.${pin.name}`;
      if (pin.hole === hole) {
        part = { type: p.type, pin: pin.label };
        ownKey = key;
      }
      if (net.has(pin.hole)) modulePins.set(key, { type: p.type, pin: pin.label });
    }
  }
  modulePins.delete(ownKey);
  const own = bench.pinAt.get(hole)?.name;
  const pins = new Set<string>();
  const rails = new Set<"+" | "-">();
  for (const id of net) {
    const pin = bench.pinAt.get(id)?.name;
    if (pin && pin !== own) pins.add(pin);
    const other = bench.byId.get(id)!;
    if (other.kind === "rail" && !bench.covered.has(id)) rails.add(other.row.endsWith("+") ? "+" : "-");
  }
  const polarity = h.kind === "rail" ? (h.row.endsWith("+") ? "+" : "-") : undefined;
  if (polarity) rails.delete(polarity);
  return { kind: own ? "pin" : part ? "part" : h.kind, pin: own, part, rail: polarity, pins: [...pins], partPins: [...modulePins.values()], rails: [...rails] };
}
