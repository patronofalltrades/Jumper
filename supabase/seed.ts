// Loads content/projects/*.json into projects, levels and tasks.
// Run: npm run seed (reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local).
// Safe to run again: rows match on slug, (project, position) and (level, position), so they update in place.
import { createClient } from "@supabase/supabase-js";
import { loadProjects } from "../lib/content/load.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const db = createClient(url, secret, { auth: { persistSession: false } });

function check<T>({ data, error }: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (error || data == null) throw new Error(`${what}: ${error?.message ?? "no data"}`);
  return data;
}

for (const { levels, ...project } of loadProjects()) {
  const { id: projectId } = check(
    await db.from("projects").upsert(project, { onConflict: "slug" }).select("id").single(),
    `project ${project.slug}`,
  );

  for (const { tasks, ...level } of levels) {
    const { id: levelId } = check(
      await db
        .from("levels")
        .upsert({ ...level, project_id: projectId }, { onConflict: "project_id,position" })
        .select("id")
        .single(),
      `${project.slug} level ${level.position}`,
    );

    check(
      await db.from("tasks").upsert(
        tasks.map((t) => ({ ...t, level_id: levelId })),
        { onConflict: "level_id,position" },
      ).select("id"),
      `${project.slug} level ${level.position} tasks`,
    );
    // Remove tasks that the content no longer has.
    check(await db.from("tasks").delete().eq("level_id", levelId).gt("position", tasks.length).select("id"), "old tasks");
  }

  console.log(`${project.slug}: ${levels.length} levels, ${levels.reduce((n, l) => n + l.tasks.length, 0)} tasks`);
}
