"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wiringSchema } from "@/lib/snapshots/wiring";

// Snapshots are the lab notebook (PLAN.md feature 6, TRD 9). Row-level security keeps each row to its owner:
// user_id defaults to auth.uid(), and a read, an edit or a delete can only reach the user's own rows.

const text = {
  title: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(2000),
};
const newSnapshot = z.object({
  levelId: z.number().int().positive(),
  sessionId: z.uuid().nullable(),
  ...text,
  wiring: wiringSchema,
  mistakes: z.number().int().nonnegative(),
});
const edit = z.object({ id: z.uuid(), ...text });

export type SnapshotResult = { id?: string; error?: string };

/** Saves the board as a new snapshot, and gives its id. */
export async function createSnapshot(input: z.infer<typeof newSnapshot>): Promise<SnapshotResult> {
  const parsed = newSnapshot.safeParse(input);
  if (!parsed.success) return { error: "Write a title (1 to 80 characters)." };
  const { levelId, sessionId, title, notes, wiring, mistakes } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("snapshots")
    // passed stays false until the level Check exists (Hanif, issue #23).
    .insert({ level_id: levelId, session_id: sessionId, title, notes, wiring, mistake_count: mistakes })
    .select("id")
    .single();
  if (error) return { error: "We could not save the snapshot. Try again." };
  return { id: data.id };
}

/** Changes the title and the notes of a snapshot. */
export async function updateSnapshot(input: z.infer<typeof edit>): Promise<SnapshotResult> {
  const parsed = edit.safeParse(input);
  if (!parsed.success) return { error: "Write a title (1 to 80 characters)." };
  const { id, title, notes } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("snapshots").update({ title, notes }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "We could not save the changes. Try again." };
  return { id: data.id };
}

/** Deletes a snapshot (the database also deletes its stars), then opens the list. */
export async function deleteSnapshot(id: string): Promise<SnapshotResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { error: "This snapshot does not exist." };
  const supabase = await createClient();
  const { error } = await supabase.from("snapshots").delete().eq("id", parsed.data);
  if (error) return { error: "We could not delete the snapshot. Try again." };
  redirect("/snapshots");
}
