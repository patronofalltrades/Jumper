import { z } from "zod";
import type { Bench } from "../circuit/bench.ts";
import type { Part } from "../circuit/parts.ts";
import { partSchema } from "../content/schema.ts";
import { sketchCircuit } from "../sketch/circuit.ts";
import { checkGoal, type Goal } from "../sketch/goal.ts";
import { observeLed } from "../sketch/observe.ts";
import { parseSketch, type Program } from "../sketch/parse.ts";
import { RUNTIME } from "../sketch/run.ts";

// Run records (TRD addendum 6.3, issue #212): at each press of Run, a record of the board, the sketch and the result.
// A record does not change after it is made, and its result comes from its own board and sketch. Thus a change of the
// board while the LED animation runs does not change the result of the run (F3-AC4). The browser keeps the latest
// three records of each level. They do not go to the database, because they contain the sketch.

/** The most records that the browser keeps for one level (F3-R2). */
export const MAX_RUNS = 3;

const observedSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("off") }),
  z.object({ kind: z.literal("on") }),
  z.object({ kind: z.literal("blink"), onMs: z.number(), offMs: z.number() }),
]);

const resultSchema = z.discriminatedUnion("status", [
  /** The sketch ran. `observed`: what the LED of the goal did. `goalPassed`, `message`, `line`: the goal check. */
  z.object({ status: z.literal("ok"), observed: observedSchema, goalPassed: z.boolean(), message: z.string(), line: z.number().optional() }),
  /** A mistake in the code, or a sketch that stopped: no LED behavior. */
  z.object({ status: z.literal("error"), error: z.object({ line: z.number(), code: z.string(), message: z.string(), reason: z.string() }) }),
]);

export const runRecordSchema = z.object({
  runId: z.string().min(1),
  /** The lesson file of the level and its version, or null when the level has no lesson file. */
  lesson: z.object({ id: z.string(), version: z.number() }).nullable(),
  runtime: z.string(),
  /** The time of the press of Run (ISO). */
  at: z.string(),
  parts: z.array(partSchema),
  code: z.string(),
  result: resultSchema,
});
export type RunRecord = z.infer<typeof runRecordSchema>;
export type RunResult = RunRecord["result"];

export type RunInput = {
  bench: Bench;
  parts: readonly Part[];
  code: string;
  goal: Goal;
  lesson: { id: string; version: number } | null;
  runId: string;
  at: string;
};

/**
 * The record of one press of Run, with its result. The result uses the parts and the code of the record only.
 * `program`: the sketch for the live run, or null when the code has a mistake.
 */
export function captureRun({ bench, parts, code, goal, lesson, runId, at }: RunInput): { record: RunRecord; program: Program | null } {
  // A copy: a later change of the board cannot change the record.
  const own = parts.map((p) => ({ ...p })) as Part[];
  const base = { runId, lesson, runtime: RUNTIME, at, parts: own as RunRecord["parts"], code };
  const parsed = parseSketch(code);
  if (!parsed.ok) return { record: { ...base, result: { status: "error", error: parsed.error } }, program: null };

  const circuit = sketchCircuit(bench, own);
  const observed = observeLed(parsed.program, circuit, goal.led);
  if (observed.kind === "error") return { record: { ...base, result: { status: "error", error: observed.error } }, program: parsed.program };
  const check = checkGoal(parsed.program, circuit, goal);
  const result: RunResult = { status: "ok", observed, goalPassed: check.passed, message: check.message, ...(!check.passed && check.line !== undefined && { line: check.line }) };
  return { record: { ...base, result }, program: parsed.program };
}

/** The records with `record` as the newest, and not more than `max`. Oldest first. */
export const keepLatest = (records: readonly RunRecord[], record: RunRecord, max = MAX_RUNS): RunRecord[] => [...records, record].slice(-max);

/** A part without its color: the color of a wire does not change the circuit. */
const shape = (p: Part) => ("at" in p ? `${p.id}|${p.type}|${p.at}` : `${p.id}|${p.type}|${p.a}|${p.b}`);
const boardKey = (parts: readonly Part[]) => parts.map(shape).sort().join("\n");

/** True when the board has the parts of the record, in the same holes. The order and the wire colors do not count. */
export const sameBoard = (record: RunRecord, parts: readonly Part[]) => boardKey(record.parts as Part[]) === boardKey(parts);

/** True when the board or the sketch is different from the record: the result is not the result of what is on the bench now. */
export const isStale = (record: RunRecord, parts: readonly Part[], code: string) => record.code !== code || !sameBoard(record, parts);

// The browser save ---------------------------------------------------------------

/** The key of the run records of a level: the key of its saved board (`saveKey`) with ":runs". */
export const runsKey = (levelSaveKey: string) => `${levelSaveKey}:runs`;

/** The board and the sketch from before "Restore this run" (issue #214): the one backup, for "Undo the restore". */
export const backupSchema = z.object({ parts: z.array(partSchema), code: z.string().nullable(), codePassed: z.boolean(), helpedCode: z.string().nullable() });
export type StoredBackup = z.infer<typeof backupSchema>;

const storedSchema = z.object({ runs: z.array(runRecordSchema), backup: backupSchema.nullable().optional() });

function readStored(storage: Pick<Storage, "getItem">, key: string) {
  try {
    const parsed = storedSchema.safeParse(JSON.parse(storage.getItem(key) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The saved records of a level, oldest first. No save, a blocked storage or data that is not records: an empty list. */
export const readRuns = (storage: Pick<Storage, "getItem">, key: string): RunRecord[] => readStored(storage, key)?.runs.slice(-MAX_RUNS) ?? [];

/** The saved backup of a level, or null. */
export const readBackup = (storage: Pick<Storage, "getItem">, key: string): StoredBackup | null => readStored(storage, key)?.backup ?? null;

/**
 * Saves the records, and the backup of a restore if there is one. False when the browser cannot save (private mode,
 * or a full storage): the run still works.
 */
export function writeRuns(storage: Pick<Storage, "setItem">, key: string, runs: readonly RunRecord[], backup: StoredBackup | null = null): boolean {
  try {
    storage.setItem(key, JSON.stringify({ runs, ...(backup && { backup }) }));
    return true;
  } catch {
    return false;
  }
}
