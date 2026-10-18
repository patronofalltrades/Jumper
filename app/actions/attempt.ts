"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Each press of Check is one attempt (TRD 8.1 and 9). The browser does the level check; the SQL function
// record_attempt saves the result. On a pass, the same transaction completes the session and adds the XP.

const attempt = z
  .object({
    session: z.uuid(),
    passed: z.boolean(),
    mistakeType: z.string().min(1).max(40).nullable(),
    tasksDone: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative(),
    xp: z.number().int().nonnegative(),
  })
  .refine((a) => a.passed === (a.mistakeType === null));

export type AttemptResult = { completed?: boolean; fails?: number; error?: string };

/** Saves one Check. Gives the failed Checks of the session so far, and whether the session is completed. */
export async function recordAttempt(input: z.infer<typeof attempt>): Promise<AttemptResult> {
  const parsed = attempt.safeParse(input);
  if (!parsed.success) return { error: "The check data is not correct." };
  const { session, passed, mistakeType, tasksDone, mistakes, xp } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_attempt", {
    p_session: session,
    p_passed: passed,
    p_mistake_type: mistakeType,
    p_tasks_done: tasksDone,
    p_mistakes: mistakes,
    p_task_xp: xp,
  });
  if (error) return { error: "We could not save your Check. Try again." };
  return data as { completed: boolean; fails: number };
}
