import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Backdrop } from "@/components/backdrop";
import { InvitePanel, type Person } from "@/components/collaborate/invite-panel";
import { LevelPath, type PathLevel } from "@/components/build/level-path";
import { Dock } from "@/components/dock";
import text from "@/content/ui/build.json";
import { loadLevelClips } from "@/lib/content/clips";
import { passedLevels, shortName } from "@/lib/game/featured";
import { mapProgressKey } from "@/lib/game/map-progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Levels · Jumper" };

// The level map of a project: its levels on a path, as in Duolingo. A level opens when the level before it passes.
export default function MapPage({ params }: PageProps<"/p/[project]">) {
  return (
    <>
      <Backdrop />
      <main className="flex flex-1 justify-center px-4 py-6 sm:py-10">
        <Suspense fallback={<p className="font-semibold text-white">Loading the levels…</p>}>{params.then(({ project }) => <LevelMap slug={project} />)}</Suspense>
      </main>
      <Dock active="build" />
    </>
  );
}

async function LevelMap({ slug }: { slug: string }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, slug, title, tagline, board, levels(position, title, goal, tasks(count))")
    .eq("slug", slug)
    .eq("status", "available")
    .order("position", { referencedTable: "levels" })
    .maybeSingle();
  if (error) throw error;
  if (!project) notFound();

  // The invites of this owner for this project, with the name of each collaborator who joined.
  const { data: invites, error: invitesError } = await supabase
    .from("collaborators")
    .select("id, invitee_email, status, profiles!collaborator_id(display_name, avatar)")
    .eq("owner_id", auth.claims.sub)
    .eq("project_id", project.id)
    .order("created_at");
  if (invitesError) throw invitesError;
  const people: Person[] = (invites ?? []).map((row) => {
    const profile = row.profiles as unknown as { display_name: string | null; avatar: string | null } | null;
    return { id: row.id, email: row.invitee_email, status: row.status as Person["status"], name: profile?.display_name ?? null, avatar: profile?.avatar ?? null };
  });

  // The passed levels and the XP total of this learner: the end state that the map shows (issue #125 animates to it).
  const [passed, { data: profile, error: profileError }] = await Promise.all([
    passedLevels(supabase, project.id),
    supabase.from("profiles").select("xp").eq("id", auth.claims.sub).maybeSingle(),
  ]);
  if (profileError) throw profileError;

  const clips = await loadLevelClips(project.slug);
  const levels: PathLevel[] = project.levels.map((level) => ({
    position: level.position,
    title: level.title,
    tasks: (level.tasks as unknown as { count: number }[])[0]?.count ?? 0,
    href: `/p/${project.slug}/${level.position}`,
    clip: clips.get(level.position),
  }));

  return (
    <section className="flex w-full max-w-lg flex-col gap-6 self-start rounded-[28px] bg-card p-5 shadow-panel sm:p-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/lobby"
          className="inline-flex min-h-11 w-fit items-center rounded-xl border border-b-4 border-border bg-card px-3 text-sm font-semibold active:translate-y-0.5 active:border-b-2"
        >
          ← {text.map.back}
        </Link>
        <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {project.board} · {text.map.levels}
        </p>
        <h1 className="text-4xl leading-[0.95] font-extrabold tracking-tight">{shortName(project.title)}</h1>
        <p className="text-muted-foreground">{project.tagline}</p>
      </header>

      <LevelPath storageKey={mapProgressKey(auth.claims.sub, project.slug)} levels={levels} server={{ passed, xp: profile?.xp ?? 0 }} />

      <InvitePanel projectId={project.id} ownEmail={auth.claims.email ?? ""} people={people} />
    </section>
  );
}
