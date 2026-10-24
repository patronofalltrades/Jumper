import type { Bench } from "../circuit/bench.ts";
import { buildNets } from "../circuit/nets.ts";
import { isModule, partPins, type Part } from "../circuit/parts.ts";

// What the sketch sees on the bench, and what it changes (issue #58). It uses the nets of lib/circuit:
// - digitalRead on a pin reads what its net touches: ground (LOW), power (HIGH), or an output pin. A pressed button
//   joins its two sides, and a resistor passes the level too (as a pull-up or a pull-down would).
// - An LED lights when its + leg touches a HIGH pin or power, and its − leg touches ground or a LOW pin. A resistor in
//   the way passes the current; a button passes it only while it is pressed.
// - The small LED marked L on the Uno is on pin 13 inside the board, so it lights when pin 13 is a HIGH output.

/** The id of the L light on the Uno, as in content/sketches/. */
export const BOARD_LED = "uno.L";
/** The Uno pin of the L light. */
const BOARD_LED_PIN = 13;

export type Mode = "INPUT" | "OUTPUT" | "INPUT_PULLUP";
export type PinState = { mode: Mode; out: 0 | 1 };
/** The digital pins that the sketch set: pin number → mode and output level. Pins that it did not set are INPUT. */
export type Pins = ReadonlyMap<number, PinState>;

export type Circuit = {
  /** The level that a pin reads. Null: nothing drives the pin and it has no pull-up, so it "floats" (it reads LOW here). */
  read(pin: number, pins: Pins, pressed: ReadonlySet<string>): 0 | 1 | null;
  /** The LEDs that light: their part ids, and BOARD_LED. */
  lit(pins: Pins, pressed: ReadonlySet<string>): Set<string>;
  /** The ids of the buttons on the bench, for the press control. */
  buttons: string[];
};

/** The circuit of a bench with its parts. Make it again when the parts change. */
export function sketchCircuit(bench: Bench, parts: Part[]): Circuit {
  const nets = buildNets(bench, parts);
  const netOf = (hole: string | undefined) => (hole === undefined ? undefined : nets.get(hole));
  const pinNet = (name: string) => bench.pins.filter((p) => p.name === name).map((p) => netOf(p.hole)).filter((n): n is string => n !== undefined);

  const highs = new Set([...pinNet("5V"), ...pinNet("3V3"), ...pinNet("VIN")]);
  const lows = new Set(pinNet("GND"));
  /** The net of each digital pin of the board: D0 → 0 … D13 → 13. */
  const digital = new Map<number, string>();
  for (const p of bench.pins) {
    const n = /^D(\d+)$/.exec(p.name)?.[1];
    const net = netOf(p.hole);
    if (n !== undefined && net !== undefined) digital.set(Number(n), net);
  }

  const resistors: [string, string][] = [];
  const buttons = new Map<string, [string, string]>();
  const leds: { id: string; anode: string; cathode: string }[] = [];
  for (const p of parts) {
    if (isModule(p)) {
      if (p.type !== "pushbutton") continue;
      const pins = partPins(bench, p);
      const a = netOf(pins.find((pin) => pin.name === "1")?.hole);
      const b = netOf(pins.find((pin) => pin.name === "2")?.hole);
      if (a !== undefined && b !== undefined) buttons.set(p.id, [a, b]);
    } else if (p.type === "resistor" || p.type === "led") {
      const a = netOf(p.a);
      const b = netOf(p.b);
      if (a === undefined || b === undefined) continue;
      if (p.type === "resistor") resistors.push([a, b]);
      else leds.push({ id: p.id, anode: a, cathode: b });
    }
  }

  /** The nets that a resistor or a pressed button joins: net → its group. */
  function groups(pressed: ReadonlySet<string>) {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      while (parent.has(x) && parent.get(x) !== x) x = parent.get(x)!;
      return x;
    };
    const join = ([a, b]: [string, string]) => parent.set(find(a), find(b));
    resistors.forEach(join);
    for (const [id, sides] of buttons) if (pressed.has(id)) join(sides);
    return find;
  }

  /** What drives each group: power or a HIGH output (high), ground or a LOW output (low). */
  function drivers(pins: Pins, find: (net: string) => string, skip?: number) {
    const high = new Set([...highs].map(find));
    const low = new Set([...lows].map(find));
    for (const [pin, state] of pins) {
      const net = digital.get(pin);
      if (net === undefined || state.mode !== "OUTPUT" || pin === skip) continue;
      (state.out ? high : low).add(find(net));
    }
    return { high, low };
  }

  return {
    buttons: [...buttons.keys()],

    read(pin, pins, pressed) {
      const state = pins.get(pin);
      if (state?.mode === "OUTPUT") return state.out;
      const net = digital.get(pin);
      if (net === undefined) return state?.mode === "INPUT_PULLUP" ? 1 : null;
      const find = groups(pressed);
      const { high, low } = drivers(pins, find, pin);
      const group = find(net);
      if (low.has(group)) return 0;
      if (high.has(group)) return 1;
      return state?.mode === "INPUT_PULLUP" ? 1 : null;
    },

    lit(pins, pressed) {
      const find = groups(pressed);
      const { high, low } = drivers(pins, find);
      const on = new Set<string>();
      for (const led of leds) if (high.has(find(led.anode)) && low.has(find(led.cathode))) on.add(led.id);
      const builtIn = pins.get(BOARD_LED_PIN);
      if (bench.board.type === "arduino-uno" && builtIn?.mode === "OUTPUT" && builtIn.out === 1) on.add(BOARD_LED);
      return on;
    },
  };
}
