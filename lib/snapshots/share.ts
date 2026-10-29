import { z } from "zod";

// Share a snapshot (issue #87). A snapshot has a switch, `shared`. When it is on, anyone can open /s/<id> with no log-in.
// The page reads the snapshot through the SQL function get_shared_snapshot, which gives a row only when `shared` is true.

/** The path of the public page of a snapshot. */
export function sharePath(id: string): string {
  return `/s/${id}`;
}

/** The full link to copy, from the origin of the page (for example https://jumper.example). */
export function shareUrl(origin: string, id: string): string {
  return `${origin.replace(/\/+$/, "")}${sharePath(id)}`;
}

/** One row of get_shared_snapshot. It has the display name of the owner, and no email. */
const sharedSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  notes: z.string(),
  wiring: z.unknown(),
  passed: z.boolean(),
  mistake_count: z.number(),
  created_at: z.string(),
  level_position: z.number(),
  level_title: z.string(),
  project_slug: z.string(),
  owner_name: z.string().nullable(),
});
export type SharedSnapshot = z.infer<typeof sharedSchema>;

/** The shared snapshot from the rows that the function gives, or null when it gives no row. */
export function readShared(rows: unknown): SharedSnapshot | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const parsed = sharedSchema.safeParse(rows[0]);
  return parsed.success ? parsed.data : null;
}

