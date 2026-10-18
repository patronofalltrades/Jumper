import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuildView } from "@/components/build/build-view";
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
  const { data, error } = await supabase
    .from("levels")
    .select("position, title, projects!inner(slug, title, status)")
    .eq("projects.slug", slug)
    .eq("projects.status", "available")
    .eq("position", Number(position))
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const project = data.projects as unknown as { title: string };

  return <BuildView level={`${slug}/${data.position}`} eyebrow={`${project.title.split(":")[0]} · Level ${data.position}`} title={data.title} />;
}
