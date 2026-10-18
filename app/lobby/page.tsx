import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import features from "@/content/features.json";
import { continueTarget, type LatestSession } from "@/lib/game/continue";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lobby · Jumper" };

type ProjectRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  board: string;
  status: "available" | "coming_soon";
  levels: { count: number }[];
};

export default function LobbyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <form action={logOut}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Loading your lobby…</p>}>
        <Lobby />
      </Suspense>
    </main>
  );
}

async function Lobby() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const [{ data: profile }, { data: projects, error }] = await Promise.all([
    supabase.from("profiles").select("display_name, xp").eq("id", auth.claims.sub).maybeSingle(),
    supabase.from("projects").select("id, slug, title, tagline, board, status, levels(count)").order("position"),
  ]);
  if (error) throw error;

  const catalog = (projects ?? []) as ProjectRow[];
  const name = profile?.display_name || auth.claims.email?.split("@")[0] || "there";
  const featured = catalog.find((p) => p.status === "available");
  const target = featured && continueTarget(await latestSession(supabase, featured.id), featured.levels[0]?.count ?? 1);
  const href = featured && target ? `/p/${featured.slug}/${target.level}` : null;

  return (
    <>
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Hi, {name}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-probe/15 px-3 py-1 font-mono text-sm font-semibold text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="var(--probe)" />
              </svg>
              {profile?.xp ?? 0} XP
            </span>
          </p>
        </div>
        {featured && target && href && (
          <Button asChild className="min-h-11 px-6 text-base">
            <Link href={href}>
              {target.started ? `Continue ${shortName(featured.title)} · Level ${target.level}` : `Start ${shortName(featured.title)}`}
            </Link>
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="projects">
        <h2 id="projects" className="text-xl font-bold tracking-tight">
          Projects
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} href={project === featured ? href : `/p/${project.slug}/1`} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="coming">
        <h2 id="coming" className="text-xl font-bold tracking-tight">
          Coming to Jumper
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex h-full flex-col gap-2 rounded-2xl border border-dashed border-border bg-muted p-5 text-muted-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-foreground">{feature.title}</h3>
                <Badge>Coming soon</Badge>
              </div>
              <p className="text-sm">{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ProjectCard({ project, href }: { project: ProjectRow; href: string | null }) {
  const available = project.status === "available" && href;
  return (
    <article
      className={
        available
          ? "flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-panel"
          : "flex h-full flex-col gap-3 rounded-2xl border border-border bg-muted p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">{project.board}</span>
        {!available && <Badge>Coming soon</Badge>}
      </div>
      <h3 className="text-lg leading-snug font-bold">{project.title}</h3>
      <p className="flex-1 text-sm text-muted-foreground">{project.tagline}</p>
      {available ? (
        <Button asChild className="min-h-11">
          <Link href={href}>Open</Link>
        </Button>
      ) : (
        <Button disabled variant="outline" className="min-h-11">
          Start
        </Button>
      )}
    </article>
  );
}

// The most recent session of this user in one project, with the position of its level.
async function latestSession(supabase: Awaited<ReturnType<typeof createClient>>, projectId: number): Promise<LatestSession | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("status, levels!inner(position, project_id)")
    .eq("levels.project_id", projectId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const level = data.levels as unknown as { position: number };
  return { level: level.position, status: data.status };
}

// "Perch: a home for your AI agent" → "Perch"
function shortName(title: string) {
  return title.split(":")[0];
}
