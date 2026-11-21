import type { Bench } from "../circuit/bench.ts";
import { connectionsOf, diffConnections, type ConnectionDiff } from "../circuit/connections.ts";
import { buildNets, endpointHole } from "../circuit/nets.ts";
import type { Part } from "../circuit/parts.ts";
import type { Lesson } from "../content/schema.ts";

// Compare views (TRD addendum 6.5): one selection, shown in each view. A selection is the id of a terminal or of a
// connection in the map of the lesson. This module finds where that id is in the schematic, on the 3D board and on the
// photos, and what changed between the reference board and the board of the learner. Pure: no React, no 3D code.

export type LessonMap = Lesson["map"];
export type Hotspot = { x: number; y: number };

/** Where a terminal or a connection is, in each view. */
export type Target = {
  id: string;
  kind: "terminal" | "connection";
  label: string;
  /** The authored text of a connection (F1-R3). */
  explain?: string;
  /** The ids of the elements of the schematic that show it. */
  schematic: string[];
  /** The terminals: one for a terminal, two for a connection. */
  terminals: string[];
  /** The holes of its terminals on this board. A terminal whose part is not on the board has no hole. */
  holes: string[];
  /** The points on each photo, by photo key. */
  photos: Record<string, Hotspot[]>;
};

const defined = <T>(x: T | null | undefined): x is T => x !== null && x !== undefined;

/** The label of a terminal, or its id when the map does not have it. */
export const terminalLabel = (map: LessonMap, id: string) => map.terminals.find((t) => t.id === id)?.label ?? id;

/** The target of a terminal id or a connection id, or null when the map does not have the id. */
export function linkedTargets(map: LessonMap, id: string, bench: Bench, parts: Part[]): Target | null {
  const terminal = map.terminals.find((t) => t.id === id);
  const connection = terminal ? undefined : map.connections.find((c) => c.id === id);
  if (!terminal && !connection) return null;
  const ids = terminal ? [terminal.id] : [connection!.a, connection!.b];
  const ends = ids.map((end) => map.terminals.find((t) => t.id === end)).filter(defined);
  const photos: Record<string, Hotspot[]> = {};
  for (const end of ends) for (const [key, spot] of Object.entries(end.photos ?? {})) (photos[key] ??= []).push(spot);
  return {
    id,
    kind: terminal ? "terminal" : "connection",
    label: terminal ? terminal.label : `${terminalLabel(map, connection!.a)} → ${terminalLabel(map, connection!.b)}`,
    explain: connection?.explain,
    schematic: [connection?.schematic, ...ends.map((end) => end.schematic)].filter(defined),
    terminals: ids,
    holes: ids.map((end) => endpointHole(bench, parts, end)).filter(defined),
    photos,
  };
}

/**
 * The map id for a hole of the 3D board: the first connection whose two ends are on the net of the hole, or else the
 * first terminal on that net. Null when no mapped terminal is on the net.
 */
export function selectionAt(map: LessonMap, bench: Bench, parts: Part[], hole: string): string | null {
  const nets = buildNets(bench, parts);
  const net = nets.get(hole);
  if (net === undefined) return null;
  const onNet = (terminal: string) => {
    const at = endpointHole(bench, parts, terminal);
    return at !== null && nets.get(at) === net;
  };
  return map.connections.find((c) => onNet(c.a) && onNet(c.b))?.id ?? map.terminals.find((t) => onNet(t.id))?.id ?? null;
}

/** True when the hole is on the same net as a hole of the target. Then the board already shows the target. */
export function showsTarget(bench: Bench, parts: Part[], target: Target, hole: string): boolean {
  const nets = buildNets(bench, parts);
  const net = nets.get(hole);
  return net !== undefined && target.holes.some((h) => nets.get(h) === net);
}

export type Difference = {
  diff: ConnectionDiff;
  /** The ids of the connections of the map that the board does not have now. */
  changed: string[];
  /** True when the board has the same connections as the reference. */
  same: boolean;
};

/** What the board of the learner changed from the reference board (F1-R4). Only the terminals of the map count. */
export function referenceDifference(map: LessonMap, bench: Bench, reference: Part[], parts: Part[]): Difference {
  const terminals = map.terminals.map((t) => t.id);
  const now = connectionsOf(bench, parts, terminals);
  const diff = diffConnections(connectionsOf(bench, reference, terminals), now);
  const has = new Set(now.map((c) => `${c.a}|${c.b}`));
  const changed = map.connections.filter((c) => !has.has(c.a < c.b ? `${c.a}|${c.b}` : `${c.b}|${c.a}`)).map((c) => c.id);
  return { diff, changed, same: diff.added.length + diff.removed.length + diff.moved.length === 0 };
}

export type DiffText = { moved: string; removed: string; added: string };
export type DiffLine = { kind: "moved" | "removed" | "added"; text: string; terminal: string };

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);

/** One line of text for each change, with a terminal to show on the board. The templates come from content/ui/journey.json. */
export function diffLines(map: LessonMap, diff: ConnectionDiff, text: DiffText): DiffLine[] {
  const name = (id: string) => terminalLabel(map, id);
  return [
    ...diff.moved.map((m) => ({ kind: "moved" as const, terminal: m.kept, text: fill(text.moved, { kept: name(m.kept), from: name(m.from), to: name(m.to) }) })),
    ...diff.removed.map((c) => ({ kind: "removed" as const, terminal: c.a, text: fill(text.removed, { a: name(c.a), b: name(c.b) }) })),
    ...diff.added.map((c) => ({ kind: "added" as const, terminal: c.a, text: fill(text.added, { a: name(c.a), b: name(c.b) }) })),
  ];
}
