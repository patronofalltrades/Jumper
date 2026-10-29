"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import text from "@/content/ui/snapshots.json";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, snapshotEditSchema, snapshotFormSchema, type FieldErrors } from "@/lib/snapshots/form";
import { wiringSchema } from "@/lib/snapshots/wiring";

// Snapshots are the lab notebook (PLAN.md feature 6, TRD 9). Row-level security keeps each row to its owner:
// user_id defaults to auth.uid(), and a read, an edit or a delete can only reach the user's own rows.

// The title, notes and level use the same schemas as the forms (lib/snapshots/form.ts), so a wrong field gives the
// same message under that field.
const newSnapshot = snapshotFormSchema.extend({
  sessionId: z.uuid().nullable(),
  wiring: wiringSchema,
  mistakes: z.number().int().nonnegative(),
});
const edit = snapshotEditSchema.extend({ id: z.uuid() });

export type SnapshotResult = { id?: string; error?: string; fieldErrors?: FieldErrors };

/** The result for input that the schema refuses: the message of each form field, or one general message. */
function refused(schema: z.ZodType, input: unknown, general: string): SnapshotResult {
  const errors = fieldErrors(schema, input);
  const { levelId, title, notes } = errors;
  return levelId || title || notes ? { fieldErrors: { levelId, title, notes } } : { error: general };
}

/** Saves the board as a new snapshot, and gives its id. */
export async function createSnapshot(input: z.input<typeof newSnapshot>): Promise<SnapshotResult> {
  const parsed = newSnapshot.safeParse(input);
  if (!parsed.success) return refused(newSnapshot, input, "We could not read this board. Open the level again, then save.");
  const { levelId, sessionId, title, notes, wiring, mistakes } = parsed.data;
  const supabase = await createClient();
  // The snapshot passed when its session passed the level Check (issue #25).
  const { data: session } = sessionId ? await supabase.from("sessions").select("status").eq("id", sessionId).maybeSingle() : { data: null };
  const { data, error } = await supabase
    .from("snapshots")
    .insert({ level_id: levelId, session_id: sessionId, title, notes, wiring, passed: session?.status === "completed", mistake_count: mistakes })
    .select("id")
    .single();
  if (error) return { error: "We could not save the snapshot. Try again." };
  return { id: data.id };
}

/** Changes the title and the notes of a snapshot. */
export async function updateSnapshot(input: z.infer<typeof edit>): Promise<SnapshotResult> {
  const parsed = edit.safeParse(input);
  if (!parsed.success) return refused(edit, input, "This snapshot does not exist.");
  const { id, title, notes } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("snapshots").update({ title, notes }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "We could not save the changes. Try again." };
  return { id: data.id };
}

/** Turns the public link of a snapshot on or off (issue #87). Row-level security lets only the owner change the row. */
export async function setShared(input: { id: string; shared: boolean }): Promise<SnapshotResult> {
  const parsed = z.object({ id: z.uuid(), shared: z.boolean() }).safeParse(input);
  if (!parsed.success) return { error: "This snapshot does not exist." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("snapshots").update({ shared: parsed.data.shared }).eq("id", parsed.data.id).select("id").maybeSingle();
  if (error || !data) return { error: text.share.failed };
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
