"use server";

import { attemptCompleteSchema, attemptStartSchema, eventsSchema, toEventRows, type AttemptComplete, type AttemptStart, type LearningEvent } from "@/lib/journey/records";
import { createClient } from "@/lib/supabase/server";

// The pilot records of the circuit learning journey (docs/TRD-learning-journey.md section 7, decision D4).
// Row-level security keeps each row to its owner: user_id defaults to auth.uid(). The UI does not use these actions yet.

export type JourneyResult = { id?: string; added?: number; duplicate?: boolean; closed?: boolean; error?: string };

const SAVE_ERROR = "We could not save your answer. Your board and your answers are still on this device.";
/** Postgres: a unique index stops the insert. */
const UNIQUE = "23505";

/**
 * Adds an attempt. A second send of the same ID gives `duplicate` (the row is already saved). A second first attempt
 * for the same item and lesson version gives an error: the first attempt stays (F2-AC5).
 */
export async function saveAttempt(input: AttemptStart): Promise<JourneyResult> {
  const parsed = attemptStartSchema.safeParse(input);
  if (!parsed.success) return { error: "The answer data is not correct." };
  const a = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("learning_attempts").insert({
    id: a.id,
    lesson_id: a.lessonId,
    lesson_version: a.lessonVersion,
    item_id: a.itemId,
    kind: a.kind,
    first_attempt_id: a.firstAttemptId,
    scored: a.scored,
    prediction: a.prediction,
  });
  if (error?.code === UNIQUE && error.message.includes("learning_attempts_pkey")) return { id: a.id, duplicate: true };
  if (error?.code === UNIQUE) return { error: "This question already has a first attempt. Start a retry." };
  if (error) return { error: SAVE_ERROR };
  return { id: a.id };
}

/** Saves the end of an attempt. An attempt that is already complete does not change: it gives `closed`. */
export async function completeAttempt(input: AttemptComplete): Promise<JourneyResult> {
  const parsed = attemptCompleteSchema.safeParse(input);
  if (!parsed.success) return { error: "The answer data is not correct." };
  const a = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_attempts")
    .update({
      status: a.status,
      behavior_correct: a.behaviorCorrect,
      explanation: a.explanation,
      explanation_correct: a.explanationCorrect,
      hints_used: a.hintsUsed,
      reflection: a.reflection,
      run_id: a.runId,
      completed_at: a.status === "complete" ? new Date().toISOString() : null,
    })
    .eq("id", a.id)
    .neq("status", "complete")
    .select("id")
    .maybeSingle();
  if (error) return { error: SAVE_ERROR };
  // No open row with this ID: it is complete already, or it is not the user's own (row-level security hides it).
  if (!data) return { closed: true };
  return { id: data.id };
}

/** Saves a batch of events. A duplicate adds nothing and is not an error. Gives the number of new rows. */
export async function logEvents(input: LearningEvent[]): Promise<JourneyResult> {
  const parsed = eventsSchema.safeParse(input);
  if (!parsed.success) return { error: "The event data is not correct." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("log_learning_events", { p_events: toEventRows(parsed.data) });
  if (error) return { error: SAVE_ERROR };
  return { added: data as number };
}
