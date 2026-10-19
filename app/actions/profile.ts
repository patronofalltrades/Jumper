"use server";

import { revalidatePath } from "next/cache";
import { newPasswordSchema } from "@/lib/auth/rules";
import { profileSchema } from "@/lib/profile/form";
import { createClient } from "@/lib/supabase/server";
import text from "@/content/ui/profile.json";

// The profile page (PLAN.md feature 17). Row-level security and the column grants let a learner change only their
// own display_name and avatar (supabase/migrations/20261019000000_profile.sql).

export type ProfileState = {
  error?: string;
  notice?: string;
  fieldErrors?: { display_name?: string[]; avatar?: string[]; password?: string[]; confirm?: string[] };
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
