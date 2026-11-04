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
  /** The card body: the level map of the project. */
  mapHref: string;
  /** The round play button: the level itself. */
  href: string;
};

/** The two links of the lobby card: the body opens the map, the play button opens the level. */
export function featuredHrefs(slug: string, level: number) {
  return { mapHref: `/p/${slug}`, href: `/p/${slug}/${level}` };
}

/**
 * The project of the Continue card: the onboarding choice (issue #152) for a learner who has not started a level yet,
 * else the first available project. A Coming soon project is never featured.
 */
export function pickFeatured<T extends { slug: string; status: string }>(catalog: T[], preferred: string | null, started: boolean): T | undefined {
  const available = catalog.filter((p) => p.status === "available");
  return (!started && available.find((p) => p.slug === preferred)) || available[0];
}

/**
 * The catalog in position order, and the featured project with the level that Continue opens.
 * `preferred` is the start project from the onboarding cookie.
 */
export async function loadCatalog(supabase: Supabase, preferred: string | null = null): Promise<{ catalog: ProjectRow[]; featured: Featured | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, title, tagline, board, status, levels(count)")
    .order("position");
  if (error) throw error;

  const catalog = (data ?? []) as ProjectRow[];
  const started = preferred ? await hasSessions(supabase) : true;
  const project = pickFeatured(catalog, preferred, started);
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
    featured: { project, ...target, levelTitle: level?.title ?? null, ...featuredHrefs(project.slug, target.level) },
  };
}

// True when this user has started any level (row-level security gives only the user's own sessions).
async function hasSessions(supabase: Supabase): Promise<boolean> {
  const { count, error } = await supabase.from("sessions").select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
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
