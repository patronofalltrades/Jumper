import type { Bench } from "../circuit/bench.ts";
import { connectionsOf, diffConnections, type ConnectionDiff } from "../circuit/connections.ts";
import { isModule, LEG_NAMES, partPins, type Part } from "../circuit/parts.ts";
import { sameBoard, type RunRecord } from "./record.ts";

// What changed between two runs (TRD addendum 6.3, issue #213): the connections, the parts and the lines of the sketch.
// The list gives each change. It does not tell which change is the cause of a different result (F3-AC3, F3-R5).

/** One line of a sketch diff. `before` and `after`: the line number in each sketch (1 = the first line). */
export type LineChange = { kind: "same" | "removed" | "added"; text: string; before?: number; after?: number };

/**
 * The lines of `a` and `b`, in order: the lines that stay, the lines that only `a` has (removed) and the lines that only
 * `b` has (added). It uses the longest common subsequence, so a line that moved down shows as one removed and one added.
 */
export function diffLines(a: string, b: string): LineChange[] {
  const x = a.split("\n");
  const y = b.split("\n");
  // lcs[i][j]: the length of the longest common subsequence of x[i..] and y[j..].
  const lcs = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const out: LineChange[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) out.push({ kind: "same", text: x[i], before: ++i, after: ++j });
    else if (j < y.length && (i === x.length || lcs[i][j + 1] > lcs[i + 1][j])) out.push({ kind: "added", text: y[j], after: ++j });
    else out.push({ kind: "removed", text: x[i], before: ++i });
  }
  return out;
}

/**
 * The named points of a bench with these parts: each pin of the main board, each open rail, and each pin of each part
 * that is not a wire. A level needs no lesson file for this list, so two runs of any level can be compared.
 */
export function runTerminals(bench: Bench, parts: readonly Part[]): string[] {
  const ids = new Set<string>();
  for (const pin of bench.pins) ids.add(`${bench.board.id}.${pin.name}`);
  for (const board of Object.keys(bench.openRail)) ids.add(`bb${board}.+`).add(`bb${board}.-`);
  for (const p of parts) {
    if (p.type === "wire") continue;
    const names = isModule(p) ? partPins(bench, p).map((pin) => pin.name) : LEG_NAMES[p.type];
    for (const name of names) ids.add(`${p.id}.${name}`);
  }
  return [...ids];
}

export type RunDiff = {
  /** The connections between named points that the second run has more, has less, or has with one other end. */
  connections: ConnectionDiff;
  /** The parts (not the wires) that only one of the runs has. */
  parts: { added: Part[]; removed: Part[] };
  /** True when a wire or a part is in other holes, but the connections and the parts are the same. */
  layoutOnly: boolean;
  /** The lines of the sketch that changed. No `same` lines. */
  code: LineChange[];
  /** The number of changes in the lists above. */
  count: number;
};

/** What changed from the run `before` to the run `after`. */
export function diffRuns(before: RunRecord, after: RunRecord, bench: Bench): RunDiff {
  const old = before.parts as Part[];
  const now = after.parts as Part[];
  const terminals = runTerminals(bench, [...old, ...now]);
  const connections = diffConnections(connectionsOf(bench, old, terminals), connectionsOf(bench, now, terminals));
  const real = (p: Part) => p.type !== "wire";
  const parts = {
    added: now.filter((p) => real(p) && !old.some((o) => o.id === p.id && o.type === p.type)),
    removed: old.filter((p) => real(p) && !now.some((o) => o.id === p.id && o.type === p.type)),
  };
  const code = diffLines(before.code, after.code).filter((line) => line.kind !== "same");
  const wiring = connections.added.length + connections.removed.length + connections.moved.length + parts.added.length + parts.removed.length;
  const layoutOnly = wiring === 0 && !sameBoard(before, now);
  return { connections, parts, layoutOnly, code, count: wiring + code.length + (layoutOnly ? 1 : 0) };
}
