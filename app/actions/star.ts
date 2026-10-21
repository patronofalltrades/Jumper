"use server";

import { revalidatePath } from "next/cache";
import text from "@/content/ui/snapshots.json";
import { starInput } from "@/lib/snapshots/stars";
import { createClient } from "@/lib/supabase/server";

// Stars (PLAN.md feature 8, TRD 9). user_id defaults to auth.uid(). The policy on stars refuses a star on a snapshot of
// another user, and a delete reaches only the user's own stars.

/** Adds or removes the star of the user on a snapshot. */
export async function toggleStar(input: { id: string; starred: boolean }): Promise<{ error?: string }> {
  const parsed = starInput.safeParse(input);
  if (!parsed.success) return { error: text.stars.missing };
  const { id, starred } = parsed.data;
  const supabase = await createClient();
  const { error } = starred
    ? await supabase.from("stars").insert({ snapshot_id: id })
    : await supabase.from("stars").delete().eq("snapshot_id", id);
  // 23505: the star is already there (for example, from a second tab), so the state is already correct.
  if (error && error.code !== "23505") return { error: text.stars.failed };
  // The list and the snapshot page read the stars again, so the Starred view and the button agree.
  revalidatePath("/snapshots", "layout");
  return {};
}
