import text from "@/content/ui/build.json";
import { railColumn, type Bench } from "@/lib/circuit/bench";
import { terminalAt, type Part } from "@/lib/circuit/parts";

// The holes in the text of a task (issue #148). A task says "Connect {from} to {to}." The app puts in the holes that
// the arrow points at (taskSpot), so the text and the arrow always agree, also when the guide picks another free hole.
// Pure: no React, no three.js. The words come from content/ui/build.json ("spot").

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));

/** A plain name for a pin of the main board: "GPIO4" → "pin 4 (GPIO 4)", "D13" → "pin 13 (D13)", "A0" → "analog pin A0". */
export function pinName(name: string) {
  const names: Record<string, string> = text.pins;
  if (names[name]) return names[name];
  const gpio = /^GPIO(\d+)$/.exec(name);
  const digital = /^D(\d+)$/.exec(name);
  const analog = /^A(\d+)$/.exec(name);
  if (gpio) return fill(text.pins.gpio, { n: gpio[1] });
  if (digital) return fill(text.pins.digital, { n: digital[1] });
  if (analog) return fill(text.pins.analog, { n: analog[1] });
  return name;
}

/** The column number printed beside a hole of a red or blue line: the nearest column to the hole. */
export const railNumber = (n: number) => Math.floor(railColumn(n) + 0.5);

/**
 * The words for one hole. `named`: the breadboard that the sentence already named, so the second hole of a task does
 * not say it again. A bench with one breadboard says "the breadboard", with no letter.
 */
export function holePhrase(bench: Bench, parts: Part[], hole: string, named?: string): string {
  const t = text.spot;
  const one = bench.breadboards.length === 1;
  const h = bench.byId.get(hole);
  if (!h) {
    const terminal = terminalAt(bench, parts, hole);
    if (!terminal) return hole;
    const partNames: Record<string, string> = text.tray.parts;
    const sign = hole.endsWith("-") ? "−" : "+";
    return fill(t.terminal, { sign, part: (partNames[terminal.part.type] ?? terminal.part.type).toLowerCase() });
  }
  if (h.kind === "pin") return fill(t.pin, { pin: pinName(h.row), board: bench.board.name.replace(/^Arduino /, "") });
  if (h.kind === "main") return fill(one ? t.mainOne : named === h.board ? t.mainSame : t.main, { board: h.board, row: h.row, column: h.n });

  const sign = h.row.endsWith("+") ? "+" : "-";
  const railNames: Record<string, string> = text.railName;
  // Say "left" or "right" only when the learner can reach two lines of the same color on this breadboard.
  const open = new Set(bench.holes.filter((x) => x.board === h.board && x.kind === "rail" && x.row.endsWith(sign) && !bench.covered.has(x.id)).map((x) => x.row));
  const sides: Record<string, string> = t.side;
  const line = open.size > 1 ? fill(sides[h.row[0]], { line: railNames[sign] }) : railNames[sign];
  return fill(one ? t.railOne : named === h.board ? t.railSame : t.rail, { line, board: h.board, column: railNumber(h.n) });
}

/** The breadboard of a hole, or undefined for a pin or a screw. */
const boardOf = (bench: Bench, hole: string) => {
  const h = bench.byId.get(hole);
  return h && h.kind !== "pin" ? h.board : undefined;
};

/** The task text with {from} and {to} filled from the taps of the arrow. A text with no holes stays as it is. */
export function taskText(bench: Bench, parts: Part[], instruction: string, taps: string[]): string {
  if (!/\{(from|to)\}/.test(instruction)) return instruction;
  const [from, to] = taps;
  const values: Record<string, string> = {};
  if (from) values.from = holePhrase(bench, parts, from);
  if (to) values.to = holePhrase(bench, parts, to, from ? boardOf(bench, from) : undefined);
  return fill(instruction, values);
}
