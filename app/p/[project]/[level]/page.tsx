import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BuildView, type LevelTask } from "@/components/build/build-view";
import { loadBoards, startBoard } from "@/lib/content/boards";
import { loadLevelClips } from "@/lib/content/clips";
import { rulesSchema, targetSchema } from "@/lib/content/schema";
import { passedLevels } from "@/lib/game/featured";
import { isUnlocked } from "@/lib/game/map";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Level · Jumper" };

// Build mode: the 3D bench for one level. The tool bar takes the bottom of the screen, so this page has no dock.
export default function LevelPage({ params }: PageProps<"/p/[project]/[level]">) {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading the level…</p>}>
      {params.then(({ project, level }) => (
        <Level slug={project} position={level} />
      ))}
    </Suspense>
  );
}

async function Level({ slug, position }: { slug: string; position: string }) {
  if (!/^[1-9]\d*$/.test(position)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const { data, error } = await supabase
    .from("levels")
    .select("id, position, title, goal, rules, tasks(position, kind, instruction, popup_why, concept, target, source_url, xp), projects!inner(id, slug, title, status)")
    .eq("projects.slug", slug)
    .eq("projects.status", "available")
    .eq("position", Number(position))
    .order("position", { referencedTable: "tasks" })
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const project = data.projects as unknown as { id: number; title: string };

  // A level opens when the level before it passed (issue #19).
  if (!isUnlocked(data.position, await passedLevels(supabase, project.id))) redirect(`/p/${slug}`);

  const { data: levels, error: levelsError } = await supabase.from("levels").select("id, position, title").eq("project_id", project.id).order("position");
  if (levelsError) throw levelsError;

  const tasks: LevelTask[] = data.tasks.map((t) => ({ ...t, target: targetSchema.parse(t.target) }));
  const rules = rulesSchema.parse(data.rules);

  return (
    <BuildView
      user={auth.claims.sub}
      project={slug}
      levelId={data.id}
      position={data.position}
      eyebrow={`${project.title.split(":")[0]} · Level ${data.position}`}
      title={data.title}
      goal={data.goal}
      tasks={tasks}
      rules={rules}
      start={startBoard(await loadBoards(slug), data.position)}
      levels={levels}
      clip={(await loadLevelClips(slug)).get(data.position) ?? null}
    />
  );
}
