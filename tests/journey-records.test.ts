import { describe, expect, it } from "vitest";
import { attemptCompleteSchema, attemptStartSchema, EVENT_NAMES, eventSchema, eventsSchema, MAX_EVENTS, reflectionSchema, saveOutcome, toEventRows } from "@/lib/journey/records";

const id = "6f1c2a8e-3b4d-4c5e-9f60-718293a4b5c6";
const other = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const event = { id, name: "run_completed", lessonId: "af-led", lessonVersion: 1, runId: other, data: { status: "ok", observed: "blink", on_ms: 500 } };

describe("learning events", () => {
  it("has the nine events of the TRD addendum", () => {
    expect(EVENT_NAMES).toEqual([
      "comparison_opened",
      "connection_selected",
      "prediction_submitted",
      "run_completed",
      "explanation_submitted",
      "hint_used",
      "snapshot_compared",
      "snapshot_restored",
      "transfer_completed",
    ]);
  });

  it("accepts an event with IDs, numbers and booleans", () => {
    const parsed = eventSchema.parse(event);
    expect(parsed.attemptId).toBeNull();
    expect(parsed.data).toEqual({ status: "ok", observed: "blink", on_ms: 500 });
    expect(eventSchema.parse({ ...event, data: undefined }).data).toEqual({});
  });

  it("rejects an unknown event name", () => {
    expect(eventSchema.safeParse({ ...event, name: "page_viewed" }).success).toBe(false);
  });

  it("rejects source code in data", () => {
    expect(eventSchema.safeParse({ ...event, data: { code: "digitalWrite(13, HIGH);" } }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, data: { line: "delay(500)" } }).success).toBe(false);
  });

  it("rejects a written reflection in data", () => {
    expect(eventSchema.safeParse({ ...event, data: { note: "I think the loop was open" } }).success).toBe(false);
  });

  it("rejects nested objects, long IDs and too many fields in data", () => {
    expect(eventSchema.safeParse({ ...event, data: { observed: { kind: "blink" } } }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, data: { id: "x".repeat(65) } }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`f_${String.fromCharCode(97 + i)}`, i]));
    expect(eventSchema.safeParse({ ...event, data: many }).success).toBe(false);
  });

  it("limits a batch", () => {
    expect(eventsSchema.safeParse([]).success).toBe(false);
    expect(eventsSchema.safeParse(Array.from({ length: MAX_EVENTS + 1 }, () => event)).success).toBe(false);
  });

  it("makes the rows of log_learning_events", () => {
    expect(toEventRows(eventsSchema.parse([event]))).toEqual([
      { id, name: "run_completed", lesson_id: "af-led", lesson_version: 1, attempt_id: null, run_id: other, data: event.data },
    ]);
  });
});

describe("learning attempts", () => {
  const first = { id, lessonId: "af-led", lessonVersion: 1, itemId: "move-gnd", kind: "first", prediction: "stays off" } as const;

  it("accepts a first attempt with its prediction", () => {
    const parsed = attemptStartSchema.parse(first);
    expect(parsed).toMatchObject({ scored: true, firstAttemptId: null, prediction: "stays off" });
  });

  it("accepts a skipped prediction as unscored", () => {
    expect(attemptStartSchema.parse({ ...first, prediction: null, scored: false }).scored).toBe(false);
  });

  it("needs a first attempt for a retry, and only for a retry", () => {
    expect(attemptStartSchema.safeParse({ ...first, kind: "retry" }).success).toBe(false);
    expect(attemptStartSchema.safeParse({ ...first, kind: "retry", firstAttemptId: other }).success).toBe(true);
    expect(attemptStartSchema.safeParse({ ...first, firstAttemptId: other }).success).toBe(false);
  });

  it("rejects a bad lesson or item ID", () => {
    expect(attemptStartSchema.safeParse({ ...first, lessonId: "AF LED" }).success).toBe(false);
    expect(attemptStartSchema.safeParse({ ...first, itemId: "" }).success).toBe(false);
    expect(attemptStartSchema.safeParse({ ...first, lessonVersion: 0 }).success).toBe(false);
  });

  it("completes with two separate grades", () => {
    const done = attemptCompleteSchema.parse({ id, status: "complete", behaviorCorrect: true, explanation: "The loop is open.", explanationCorrect: false, hintsUsed: 1 });
    expect(done).toMatchObject({ behaviorCorrect: true, explanationCorrect: false, reflection: null });
  });

  it("gives no score to an attempt with an error", () => {
    expect(attemptCompleteSchema.safeParse({ id, status: "error", hintsUsed: 0 }).success).toBe(true);
    expect(attemptCompleteSchema.safeParse({ id, status: "error", behaviorCorrect: true, hintsUsed: 0 }).success).toBe(false);
  });

  it("limits the reflection", () => {
    expect(attemptCompleteSchema.safeParse({ id, status: "complete", hintsUsed: 0, reflection: "x".repeat(2001) }).success).toBe(false);
  });

  it("takes a reflection after the feedback, with a limit", () => {
    expect(reflectionSchema.safeParse({ id, reflection: " Current needs a loop. " }).data).toEqual({ id, reflection: "Current needs a loop." });
    expect(reflectionSchema.safeParse({ id, reflection: "  " }).success).toBe(false);
    expect(reflectionSchema.safeParse({ id, reflection: "x".repeat(2001) }).success).toBe(false);
  });
});

// The live test of November 21 found "Your note is saved." on a save that failed. The note now waits for this result.
describe("saveOutcome", () => {
  it("is true only when the action saved the record", async () => {
    expect(await saveOutcome(Promise.resolve({ id: "a" }))).toBe(true);
    expect(await saveOutcome(Promise.resolve({ error: "We could not save your answer." }))).toBe(false);
    expect(await saveOutcome(Promise.reject(new Error("network")))).toBe(false);
  });
});
