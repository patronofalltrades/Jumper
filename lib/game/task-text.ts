import text from "@/content/ui/build.json";
import { railColumn, type Bench } from "@/lib/circuit/bench";
import { buildNets, endpointHole } from "@/lib/circuit/nets";
import { isModule, terminalAt, type Part } from "@/lib/circuit/parts";
import { taskSpot, type Plan, type Progress, type Target } from "./engine";
import { hologramGhost } from "./hologram";

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
  if (h.kind === "main") return fill(named === h.board ? t.mainSame : one ? t.mainOne : t.main, { board: h.board, row: h.row, column: h.n });

  const sign = h.row.endsWith("+") ? "+" : "-";
  const railNames: Record<string, string> = text.railName;
  // Say "left" or "right" only when the learner can reach two lines of the same color on this breadboard.
  const open = new Set(bench.holes.filter((x) => x.board === h.board && x.kind === "rail" && x.row.endsWith(sign) && !bench.covered.has(x.id)).map((x) => x.row));
  const sides: Record<string, string> = t.side;
  const line = open.size > 1 ? fill(sides[h.row[0]], { line: railNames[sign] }) : railNames[sign];
  return fill(named === h.board ? t.railSame : one ? t.railOne : t.rail, { line, board: h.board, column: railNumber(h.n) });
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
  // The two ends are in one line of 5 already (the light in the line of the resistor): no wire is needed.
  const strip = (h: string | undefined) => (h ? bench.byId.get(h)?.strip : undefined);
  const label = /^([^:{]+):/.exec(instruction)?.[1];
  if (label && from && to && strip(from) !== undefined && strip(from) === strip(to)) {
    return `${label}: ${fill(text.spot.joined, { hole: holePhrase(bench, parts, from) })}.`;
  }
  const values: Record<string, string> = {};
  if (from) values.from = holePhrase(bench, parts, from);
  if (to) values.to = holePhrase(bench, parts, to, from ? boardOf(bench, from) : undefined);
  return fill(instruction, values);
}

/**
 * The holes of a part, in the order of the task text: for a wire, the end in the line of the first end of the task
 * (`target.a`) comes first. For a module, the hole of pin 1. For a resistor, an LED or a speaker, its two legs.
 * The level clip uses them, so the caption names the holes of the part that it shows.
 */
export function partTaps(bench: Bench, before: Part[], target: Target, part: Part): string[] {
  if (isModule(part)) return [part.at];
  const { a, b } = part as { a: string; b: string };
  if (target.kind !== "wire") return [a, b];
  const nets = buildNets(bench, [...before, part]);
  const first = endpointHole(bench, before, target.a);
  const onFirst = (h: string) => first !== null && nets.get(h) !== undefined && nets.get(h) === nets.get(first);
  return onFirst(b) && !onFirst(a) ? [b, a] : [a, b];
}

/**
 * The text of a task in the task list, on the board now. When a part of the task is not on the board yet (the button of
 * "connect … to the button"), the holes come from the finished board of the level clip, as the ghost of the row does
 * (issue #113). The task of now always has its part ends on the board, so its text is the text of the arrow.
 */
export function filledTask(bench: Bench, parts: Part[], instruction: string, target: Target, swaps: string[], finish: Part[] = []): string {
  if (!/\{(from|to)\}/.test(instruction)) return instruction;
  let taps = taskSpot(bench, parts, target, swaps, finish).taps;
  if (!taps.length) {
    const ids = new Set(parts.map((p) => p.id));
    const board = [...parts, ...finish.filter((p) => !ids.has(p.id) && p.type !== "wire")];
    taps = taskSpot(bench, board, target, swaps, finish).taps;
    return taskText(bench, board, instruction, taps);
  }
  return taskText(bench, parts, instruction, taps);
}

/**
 * The text of each task of the task list (issue #148). A task that the learner did is read on the board now. The task
 * of now and the tasks after it are read on the board of the guide: each task before them gets its ghost (the part in
 * the holes of the arrow, issue #113), so a row names the holes that the arrow will show when the learner gets there.
 */
export function taskTexts(bench: Bench, parts: Part[], plan: Plan, instructions: string[], progress: Progress, finish: Part[] = []): string[] {
  const now = progress.phase === "intro" ? 0 : Math.min(progress.index, plan.tasks.length);
  let board = parts;
  return instructions.map((instruction, i) => {
    const { target } = plan.tasks[i];
    if (i < now) return filledTask(bench, parts, instruction, target, progress.swaps, finish);
    const text = filledTask(bench, board, instruction, target, progress.swaps, finish);
    const ghost = hologramGhost(bench, board, { kind: "task", index: i }, plan, progress.swaps, finish);
    const ids = new Set(board.map((p) => p.id));
    const added = (ghost?.parts ?? []).filter((p) => !ids.has(p.id) || p.type === "wire").map((p) => (p.type === "wire" ? { ...p, id: `guide${i}` } : p));
    board = [...board, ...added];
    return text;
  });
}
