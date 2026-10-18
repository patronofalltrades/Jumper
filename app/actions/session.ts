"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Build mode saves one session row for each sitting on a level (TRD 8.1 and 9). Row-level security keeps each row to
// its owner: user_id defaults to auth.uid(), and an update can only reach the user's own rows.

const levelId = z.number().int().positive();
const counters = z.object({
  id: z.uuid(),
  tasksDone: z.number().int().nonnegative(),
  mistakes: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
});

export type SessionResult = { id?: string; error?: string };

/** Adds a session row with the status in_progress, and gives its id. */
export async function startSession(level: number): Promise<SessionResult> {
  const parsed = levelId.safeParse(level);
  if (!parsed.success) return { error: "This level does not exist." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").insert({ level_id: parsed.data }).select("id").single();
  if (error) return { error: "We could not save your progress. Your board is still saved on this device." };
  return { id: data.id };
}

/** Saves the counters of a session that is in progress: tasks done, mistakes and XP. */
export async function updateSession(input: z.infer<typeof counters>): Promise<SessionResult> {
  const parsed = counters.safeParse(input);
  if (!parsed.success) return { error: "The progress data is not correct." };
  const { id, tasksDone, mistakes, xp } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .update({ tasks_done: tasksDone, mistakes, xp_earned: xp })
    .eq("id", id)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "We could not save your progress. Your board is still saved on this device." };
  return { id: data.id };
}
