"use server";

import { z } from "zod";
import { newsIdSchema } from "@/lib/game/news";
import { createClient } from "@/lib/supabase/server";

// The "What's new" spotlights of a logged-in learner (issue #198). The seen ids are on the account (profiles.seen_news,
// issue #196). Only the function mark_news_seen writes them, for the user of the session.

/** The ids of the spotlights that the learner closed. An empty list when the read fails or no user is logged in. */
export async function loadSeenNews(): Promise<string[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("profiles").select("seen_news").eq("id", auth.user.id).maybeSingle();
  const parsed = z.array(z.string()).safeParse(data?.seen_news);
  return parsed.success ? parsed.data : [];
}

/** "Got it" on a spotlight: saves its id on the account. */
export async function markNewsSeen(id: string): Promise<{ error?: string }> {
  const parsed = newsIdSchema.safeParse(id);
  if (!parsed.success) return { error: "bad id" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_news_seen", { p_id: parsed.data });
  return error ? { error: error.message } : {};
}
