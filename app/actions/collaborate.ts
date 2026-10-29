"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import text from "@/content/ui/collaborate.json";
import { fieldErrors, inviteSchema, noteSchema, type FieldErrors } from "@/lib/collaborate/invite";
import { createClient } from "@/lib/supabase/server";

// Collaborate (issue #88). Row-level security decides who can do what (supabase/migrations/20261029100000_collaborate.sql):
// the owner invites and removes, the invitee accepts or declines the invite for their own email, a collaborator leaves,
// and each person writes and deletes only their own notes. These actions never read auth.users, so the answer to an
// invite is the same for an email with an account and for an email with none.

export type CollaborateResult = { error?: string; fieldErrors?: FieldErrors };

const id = z.uuid();

/** The user of the request, from the token. */
async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, sub: data?.claims.sub, email: data?.claims.email };
}

/** The owner invites an email to a project. */
export async function inviteCollaborator(input: { projectId: number; email: string }): Promise<CollaborateResult> {
  const { supabase, email: own } = await me();
  const projectId = z.number().int().positive().safeParse(input.projectId);
  if (!own || !projectId.success) return { error: text.invite.failed };
  const parsed = inviteSchema(own).safeParse({ email: input.email });
  if (!parsed.success) return { fieldErrors: fieldErrors(inviteSchema(own), { email: input.email }) };
  const { error } = await supabase.from("collaborators").insert({ project_id: projectId.data, invitee_email: parsed.data.email });
  // 23505: the owner invited this email before.
  if (error) return error.code === "23505" ? { fieldErrors: { email: text.invite.duplicate } } : { error: text.invite.failed };
  revalidatePath("/p", "layout");
  return {};
}

/** The owner removes a collaborator or an invite. The access ends at once. */
export async function removeCollaborator(collaboratorId: string): Promise<CollaborateResult> {
  const parsed = id.safeParse(collaboratorId);
  if (!parsed.success) return { error: text.list.failed };
  const { supabase } = await me();
  const { error } = await supabase.from("collaborators").delete().eq("id", parsed.data);
  if (error) return { error: text.list.failed };
  revalidatePath("/", "layout");
  return {};
}

/** The invitee accepts (the row gets their id and "joined") or declines (the row goes away). */
export async function answerInvite(input: { id: string; accept: boolean }): Promise<CollaborateResult> {
  const parsed = id.safeParse(input.id);
  const { supabase, sub } = await me();
  if (!parsed.success || !sub) return { error: text.lobby.failed };
  const { data, error } = input.accept
    ? await supabase.from("collaborators").update({ collaborator_id: sub, status: "joined" }).eq("id", parsed.data).select("id")
    : await supabase.from("collaborators").delete().eq("id", parsed.data).select("id");
  if (error || !data?.length) return { error: text.lobby.failed };
  revalidatePath("/", "layout");
  return {};
}

/** A collaborator leaves a project, then the lobby opens. */
export async function leaveProject(collaboratorId: string): Promise<CollaborateResult> {
  const parsed = id.safeParse(collaboratorId);
  if (!parsed.success) return { error: text.list.failed };
  const { supabase } = await me();
  const { error } = await supabase.from("collaborators").delete().eq("id", parsed.data);
  if (error) return { error: text.list.failed };
  revalidatePath("/", "layout");
  redirect("/lobby?tab=builds");
}

/** Adds a note under a snapshot. The policy lets in the owner and the joined collaborators of the snapshot. */
export async function addNote(input: { snapshotId: string; body: string }): Promise<CollaborateResult> {
  const snapshotId = id.safeParse(input.snapshotId);
  const body = noteSchema.safeParse({ body: input.body });
  if (!snapshotId.success) return { error: text.notes.failed };
  if (!body.success) return { fieldErrors: fieldErrors(noteSchema, { body: input.body }) };
  const { supabase } = await me();
  const { error } = await supabase.from("snapshot_notes").insert({ snapshot_id: snapshotId.data, body: body.data.body });
  if (error) return { error: text.notes.failed };
  revalidatePath("/snapshots", "layout");
  return {};
}

/** Deletes a note. A delete reaches only the notes of the user. */
export async function deleteNote(noteId: string): Promise<CollaborateResult> {
  const parsed = id.safeParse(noteId);
  if (!parsed.success) return { error: text.notes.delete_failed };
  const { supabase } = await me();
  const { error } = await supabase.from("snapshot_notes").delete().eq("id", parsed.data);
  if (error) return { error: text.notes.delete_failed };
  revalidatePath("/snapshots", "layout");
  return {};
}
