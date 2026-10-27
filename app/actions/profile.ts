"use server";

import { revalidatePath } from "next/cache";
import { callbackUrl } from "@/lib/auth/callback-url";
import { newPasswordSchema } from "@/lib/auth/rules";
import { newEmailSchema } from "@/lib/profile/account";
import { profileSchema } from "@/lib/profile/form";
import { createClient } from "@/lib/supabase/server";
import text from "@/content/ui/profile.json";

// The profile page (PLAN.md feature 17). Row-level security and the column grants let a learner change only their
// own display_name and avatar (supabase/migrations/20261019000000_profile.sql).

export type ProfileState = {
  error?: string;
  notice?: string;
  fieldErrors?: { display_name?: string[]; avatar?: string[]; password?: string[]; confirm?: string[]; email?: string[] };
};

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({ display_name: formData.get("display_name"), avatar: formData.get("avatar") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: text.account.failed };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", auth.claims.sub);
  if (error) return { error: text.account.failed };
  revalidatePath("/", "layout");
  return { notice: text.account.done };
}

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { notice: text.password.done };
}

// Supabase sends a link to the new email. The email changes only after the learner clicks it, and the link opens /profile.
export async function changeEmail(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: text.change_email.failed };

  const parsed = newEmailSchema(auth.claims.email ?? "").safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { error } = await supabase.auth.updateUser(parsed.data, { emailRedirectTo: await callbackUrl("/profile") });
  if (error) return { error: text.change_email.failed };
  return { notice: text.change_email.done };
}

// delete_my_account() deletes the row of this user in auth.users, and the cascade removes the rest
// (supabase/migrations/20261028000000_delete_account.sql). The browser then removes the saves and goes to the landing page.
export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: text.delete_account.failed };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: text.delete_account.failed };
  // The account is gone, so only the cookies need to go: "local" does not call the server for a user that does not exist.
  await supabase.auth.signOut({ scope: "local" });
  return {};
}
