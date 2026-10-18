"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentialsSchema } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  email?: string;
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  notice?: string;
};

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

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
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
