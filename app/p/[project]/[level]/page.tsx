import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Level · Jumper" };

// A placeholder until build mode (feature 5) replaces it: it shows the level title and goal.
export default function LevelPage({ params }: PageProps<"/p/[project]/[level]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <Link href="/lobby" className="self-start text-sm font-semibold text-primary underline underline-offset-4">
        ← Back to the lobby
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Loading the level…</p>}>
        {params.then(({ project, level }) => (
          <Level slug={project} position={level} />
        ))}
      </Suspense>
    </main>
  );
}

async function Level({ slug, position }: { slug: string; position: string }) {
  if (!/^[1-9]\d*$/.test(position)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("position, title, goal, projects!inner(slug, title, status)")
    .eq("projects.slug", slug)
    .eq("projects.status", "available")
    .eq("position", Number(position))
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const project = data.projects as unknown as { title: string };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-6">
      <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {project.title} · Level {data.position}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight">{data.title}</h1>
      <p className="text-lg">{data.goal}</p>
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        The 3D board and the tasks for this level come with build mode.
      </p>
    </section>
  );
}
