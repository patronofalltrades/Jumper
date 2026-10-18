import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LevelComplete, type LevelSummary } from "@/components/build/level-complete";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Level complete · Jumper" };

// The Level complete screen for the user's latest completed session of this level.
// In development, ?preview shows sample numbers when there is no session yet .
export default function CompletePage({ params, searchParams }: PageProps<"/p/[project]/[level]/complete">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ project, level }, query]) => (
        <Complete slug={project} position={level} preview={process.env.NODE_ENV === "development" && "preview" in query} />
      ))}
    </Suspense>
  );
}

async function Complete({ slug, position, preview }: { slug: string; position: string; preview: boolean }) {
  if (!/^[1-9]\d*$/.test(position)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) notFound();
  const { data: level, error } = await supabase
    .from("levels")
    .select("id, position, xp, project_id, projects!inner(slug, status)")
    .eq("projects.slug", slug)
    .eq("projects.status", "available")
    .eq("position", Number(position))
    .maybeSingle();
  if (error) throw error;
  if (!level) notFound();

  const [{ data: levels, error: levelsError }, { data: session }] = await Promise.all([
    supabase.from("levels").select("id, position, title").eq("project_id", level.project_id).order("position"),
    supabase
      .from("sessions")
      .select("started_at, ended_at, tasks_done, mistakes, xp_earned")
      .eq("level_id", level.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (levelsError) throw levelsError;

  let summary: LevelSummary;
  if (session) {
    summary = {
      xp: session.xp_earned,
      tasksDone: session.tasks_done,
      mistakes: session.mistakes,
      durationMs: Date.parse(session.ended_at) - Date.parse(session.started_at),
    };
  } else if (preview) {
    summary = { xp: level.xp, tasksDone: 10, mistakes: 3, durationMs: 286_000 };
  } else {
    notFound();
  }

  const next = level.position < levels.length ? `/p/${slug}/${level.position + 1}` : "/lobby";
  const save = { levels, user: auth.claims.sub, project: slug, position: level.position };
  return <LevelComplete summary={summary} continueHref={next} save={save} preview={!session} />;
}
