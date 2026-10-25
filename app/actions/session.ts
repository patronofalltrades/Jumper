"use server";

import { z } from "zod";
import { replayStart } from "@/lib/game/check-flow";
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

/** `closed`: the session is not in progress (it is completed), so the app must start a new one (issue #62). */
export type SessionResult = { id?: string; closed?: boolean; error?: string };

/**
 * Adds a session row with the status in_progress, and gives its id. A replay can give the time when the learner opened
 * the level (`openedAt`), so that the time on Level complete is the time of the replay (issue #62).
 */
export async function startSession(level: number, openedAt?: string): Promise<SessionResult> {
  const parsed = levelId.safeParse(level);
  if (!parsed.success) return { error: "This level does not exist." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").insert({ level_id: parsed.data, started_at: replayStart(openedAt, Date.now()) }).select("id").single();
  if (error) return { error: "We could not save your progress. Your board is still saved on this device." };
  return { id: data.id };
}

/** Saves the counters of a session that is in progress: tasks done, mistakes and XP. Gives `closed` when it is not in progress. */
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
  if (error) return { error: "We could not save your progress. Your board is still saved on this device." };
  // No row in progress with this id: the session is closed, for example after a pass. Row-level security hides the rows of other users.
  if (!data) return { closed: true };
  return { id: data.id };
}
