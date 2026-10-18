import type { createClient } from "@/lib/supabase/server";
import { continueTarget, type LatestSession } from "./continue";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ProjectRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  board: string;
  status: "available" | "coming_soon";
  levels: { count: number }[];
};

export type Featured = {
  project: ProjectRow;
  level: number;
  levelTitle: string | null;
  started: boolean;
  href: string;
};

/** The catalog in position order, and the first available project with the level that Continue opens. */
export async function loadCatalog(supabase: Supabase): Promise<{ catalog: ProjectRow[]; featured: Featured | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, title, tagline, board, status, levels(count)")
    .order("position");
  if (error) throw error;

  const catalog = (data ?? []) as ProjectRow[];
  const project = catalog.find((p) => p.status === "available");
  if (!project) return { catalog, featured: null };

  const target = continueTarget(await latestSession(supabase, project.id), project.levels[0]?.count ?? 1);
  const { data: level } = await supabase
    .from("levels")
    .select("title")
    .eq("project_id", project.id)
    .eq("position", target.level)
    .maybeSingle();

  return {
    catalog,
    featured: { project, ...target, levelTitle: level?.title ?? null, href: `/p/${project.slug}/${target.level}` },
  };
}

// The most recent session of this user in one project, with the position of its level.
async function latestSession(supabase: Supabase, projectId: number): Promise<LatestSession | null> {
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
export function shortName(title: string) {
  return title.split(":")[0];
}

/** The positions of the levels of one project that passed: the user has a completed session on them. */
export async function passedLevels(supabase: Supabase, projectId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("levels!inner(position, project_id)")
    .eq("status", "completed")
    .eq("levels.project_id", projectId);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => (row.levels as unknown as { position: number }).position))];
}
