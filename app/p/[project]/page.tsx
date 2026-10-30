import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Backdrop } from "@/components/backdrop";
import { Volt } from "@/components/art/volt";
import { InvitePanel, type Person } from "@/components/collaborate/invite-panel";
import { Dock } from "@/components/dock";
import { ScrollHere } from "@/components/map/scroll-here";
import { PlayIcon, WatchButton } from "@/components/walkthrough/watch-button";
import text from "@/content/ui/build.json";
import mascot from "@/content/ui/mascot.json";
import watch from "@/content/ui/walkthrough.json";
import { loadLevelClips } from "@/lib/content/clips";
import type { Clip } from "@/lib/game/walkthrough";
import { passedLevels, shortName } from "@/lib/game/featured";
import { levelStatuses, type LevelStatus } from "@/lib/game/map";
import { mascotLevel } from "@/lib/game/mascot";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Levels · Jumper" };

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

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

  const statuses = levelStatuses(project.levels.length, await passedLevels(supabase, project.id));
  const here = mascotLevel(statuses);
  const clips = await loadLevelClips(project.slug);

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

      <ol className="flex flex-col gap-2">
        {project.levels.map((level, i) => (
          <Node
            key={level.position}
            href={`/p/${project.slug}/${level.position}`}
            position={level.position}
            title={level.title}
            tasks={(level.tasks as unknown as { count: number }[])[0]?.count ?? 0}
            status={statuses[i]}
            // The path bends left and right, one step for each level.
            shift={[0, 1, 0, -1][i % 4]}
            last={i === project.levels.length - 1}
            here={i === here}
            clip={clips.get(level.position)}
          />
        ))}
      </ol>

      <InvitePanel projectId={project.id} ownEmail={auth.claims.email ?? ""} people={people} />
    </section>
  );
}

function Node({
  href,
  position,
  title,
  tasks,
  status,
  shift,
  last,
  here,
  clip,
}: {
  href: string;
  position: number;
  title: string;
  tasks: number;
  status: LevelStatus;
  shift: number;
  last: boolean;
  here: boolean;
  clip?: Clip;
}) {
  const circle = (
    <span
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center rounded-full border-b-[6px] text-2xl font-extrabold transition-transform",
        status === "locked" ? "border-border bg-muted text-muted-foreground" : "border-primary-deep bg-primary text-primary-foreground",
        status === "open" && "ring-4 ring-probe ring-offset-4 ring-offset-card",
        status !== "locked" && "group-active:translate-y-1 group-active:border-b-2",
        here && "motion-safe:animate-pulse",
      )}
    >
      {status === "done" ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 5 5 9-10" />
        </svg>
      ) : status === "locked" ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      ) : (
        position
      )}
    </span>
  );
  const label = (
    <span className="flex min-w-0 flex-col">
      <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {fill(text.map.level, { n: position })} · {text.map.status[status]}
      </span>
      <span className={cn("text-lg leading-tight font-bold", status === "locked" && "text-muted-foreground")}>{title}</span>
      <span className="text-sm text-muted-foreground">
        {status === "locked" ? fill(text.map.lockedHint, { n: position - 1 }) : fill(text.map.tasks, { n: tasks })}
      </span>
    </span>
  );
  // Volt stands on the level to play now, at the end of its row.
  const volt = here && (
    <span className="ml-auto shrink-0" title={mascot.map.here}>
      <Volt pose="idle" className="h-16 w-auto" />
      <span className="sr-only">{mascot.map.here}</span>
    </span>
  );
  const row = "group flex min-h-20 min-w-0 flex-1 items-center gap-4 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <li className="flex flex-col" style={{ paddingLeft: `${(shift + 1) * 2.25}rem` }}>
      {here && <ScrollHere />}
      <div className="flex items-center gap-1">
        {status === "locked" ? (
          <div className={row} aria-disabled="true">
            {circle}
            {label}
            {volt}
          </div>
        ) : (
          <Link href={href} className={cn(row, "hover:bg-muted")}>
            {circle}
            {label}
            {volt}
          </Link>
        )}
        {/* Each level has a Watch button, also a locked level, so the learner sees what comes next (issue #48). */}
        {clip && (
          <WatchButton
            clip={clip}
            title={fill(watch.levelTitle, { n: position, title })}
            label={fill(watch.watchLevelLabel, { n: position })}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-b-4 border-border bg-card px-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2"
          >
            <PlayIcon />
            <span className="max-sm:sr-only">{watch.watchLevel}</span>
          </WatchButton>
        )}
      </div>
      {!last && <span className="ml-10 h-4 w-1 rounded-full bg-border" aria-hidden="true" />}
    </li>
  );
}
