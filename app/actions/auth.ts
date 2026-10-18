"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentialsSchema, emailSchema, newPasswordSchema } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  email?: string;
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[]; confirm?: string[] };
  notice?: string;
};

// Email links come back through /auth/callback, which swaps the code for a session.
async function callbackUrl(next?: string) {
  const origin = (await headers()).get("origin");
  return `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}

function parse(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parse(formData);
  if (!parsed.success) return { email, fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: await callbackUrl() },
  });
  if (error) return { email, error: error.message };

  // With email confirmation on, Supabase returns no session until the user clicks the link.
  if (!data.session) {
    return { email, notice: `We sent a confirmation link to ${parsed.data.email}. Open it to finish sign-up.` };
  }
  redirect("/lobby");
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parse(formData);
  if (!parsed.success) return { email, fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { email, error: "The email or password is not correct." };
  redirect("/lobby");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) return { email, fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await callbackUrl("/reset-password"),
  });
  if (error) return { email, error: "We could not send the email. Try again in a minute." };
  // Supabase answers the same way when no account exists, so the form does not reveal who has an account.
  return {
    email,
    notice: `If ${parsed.data.email} has a Jumper account, we sent it a link to reset the password.`,
  };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/lobby");
}
