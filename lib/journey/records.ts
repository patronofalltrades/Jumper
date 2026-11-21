import { z } from "zod";

// The pilot records of the circuit learning journey (docs/TRD-learning-journey.md sections 7 and 8, decision D4).
// Pure Zod schemas: app/actions/journey.ts checks each input with them before it writes to Supabase.
// An event carries IDs and scores only. Its `data` cannot hold code or a written reflection: a string value is a short
// ID with no spaces, and the other values are numbers and booleans.

/** The events of TRD addendum section 8. The UI says "run"; the names keep "snapshot" for the researcher. */
export const EVENT_NAMES = [
  "comparison_opened",
  "connection_selected",
  "prediction_submitted",
  "run_completed",
  "explanation_submitted",
  "hint_used",
  "snapshot_compared",
  "snapshot_restored",
  "transfer_completed",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** The most events in one batch. */
export const MAX_EVENTS = 50;

const lessonId = z.string().regex(/^[a-z0-9-]{1,40}$/);
const lessonVersion = z.number().int().positive();
const itemId = z.string().regex(/^[a-z0-9-]{1,60}$/);
/** A short ID: letters, digits and `-_.:`, no spaces. Thus no sentence and no line of code fits. */
const shortId = z.string().regex(/^[A-Za-z0-9_.:-]{1,64}$/);
/** An answer choice as the lesson file names it, for example "stays off". */
const choice = z.string().trim().min(1).max(500);

/** The `data` of an event: at most 12 fields; each value is a number, a boolean or a short ID. */
export const eventDataSchema = z
  .record(z.string().regex(/^[a-z_]{1,32}$/), z.union([z.number().finite(), z.boolean(), shortId]))
  .refine((d) => Object.keys(d).length <= 12, { message: "Too many fields." });

export const eventSchema = z.object({
  id: z.uuid(),
  name: z.enum(EVENT_NAMES),
  lessonId,
  lessonVersion,
  attemptId: z.uuid().nullable().default(null),
  runId: z.uuid().nullable().default(null),
  data: eventDataSchema.default({}),
});
export type LearningEvent = z.input<typeof eventSchema>;

export const eventsSchema = z.array(eventSchema).min(1).max(MAX_EVENTS);

/** A new attempt. The browser makes the ID, so a second send of the same attempt is not a second row. */
export const attemptStartSchema = z
  .object({
    id: z.uuid(),
    lessonId,
    lessonVersion,
    itemId,
    kind: z.enum(["first", "retry", "variation"]),
    /** The first attempt of a retry. Only a retry has it. */
    firstAttemptId: z.uuid().nullable().default(null),
    /** False when the learner skipped the prediction (F2-R2). */
    scored: z.boolean().default(true),
    /** A challenge: the predicted behavior. A question: the first answer. Saved before the result shows (F2-AC1). */
    prediction: choice.nullable().default(null),
  })
  .refine((a) => (a.kind === "retry") === (a.firstAttemptId !== null), { message: "Only a retry has a first attempt." });
export type AttemptStart = z.input<typeof attemptStartSchema>;

/** The end of an attempt: complete with its grades, or `error` with no score (F2-AC3). */
export const attemptCompleteSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["complete", "error"]),
    behaviorCorrect: z.boolean().nullable().default(null),
    /** A challenge: the explanation choice. A question: the final answer (F1-R6). */
    explanation: choice.nullable().default(null),
    explanationCorrect: z.boolean().nullable().default(null),
    hintsUsed: z.number().int().nonnegative().max(100),
    /** The optional written reflection, for review only. It never goes into an event. */
    reflection: z.string().trim().max(2000).nullable().default(null),
    runId: z.uuid().nullable().default(null),
  })
  .refine((a) => a.status === "complete" || (a.behaviorCorrect === null && a.explanationCorrect === null), {
    message: "An attempt with an error has no score.",
  });
export type AttemptComplete = z.input<typeof attemptCompleteSchema>;

/** The events as the rows that `log_learning_events` reads. */
export function toEventRows(events: z.output<typeof eventsSchema>) {
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    lesson_id: e.lessonId,
    lesson_version: e.lessonVersion,
    attempt_id: e.attemptId,
    run_id: e.runId,
    data: e.data,
  }));
}
