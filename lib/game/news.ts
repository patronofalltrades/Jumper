import { z } from "zod";
import file from "../../content/news.json";

// The "What's new" spotlights (issues #196, #197 and #198). Pure rules: no React, no DOM, no database.
// A visitor keeps the seen items in the browser (one key per browser). A logged-in learner keeps them on the account
// (profiles.seen_news).

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const newsItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  title: z.string().min(1),
  text: z.string().min(1),
  released: day,
  until: day.optional(),
  audience: z.enum(["visitor", "learner"]),
  pr: z.number().int().positive(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Audience = NewsItem["audience"];

export const newsSchema = z.object({
  ui: z.object({ pill: z.string(), label: z.string(), gotIt: z.string() }),
  items: z.array(newsItemSchema),
});

export const news = newsSchema.parse(file);

/** The browser key of the seen items of a visitor. */
export const NEWS_KEY = "jumper:news-seen";

/** The day of a date, as YYYY-MM-DD in UTC. */
export const today = (now: Date = new Date()) => now.toISOString().slice(0, 10);

/** True when the item shows on the day `on`: from `released` to `until`, both days included. */
export const isLive = (item: NewsItem, on: string) => item.released <= on && (item.until === undefined || on <= item.until);

/** The items of `audience` that show on the day `on` and that are not in `seen`. */
export function unseen(items: readonly NewsItem[], seen: readonly string[], audience: Audience, on: string): NewsItem[] {
  const done = new Set(seen);
  return items.filter((item) => item.audience === audience && isLive(item, on) && !done.has(item.id));
}

/** The item with this id, or undefined. */
export const newsItem = (id: string, items: readonly NewsItem[] = news.items) => items.find((item) => item.id === id);

/** The part of localStorage that the seen list needs. */
export type NewsStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * The ids that this browser has seen. A browser that blocks storage (or has none) gives null: the caller shows no
 * spotlight, so a spotlight does not come back on each visit (as the tours, lib/game/tour.ts).
 */
export function readSeen(storage: NewsStorage | null): string[] | null {
  if (storage === null) return null;
  try {
    const parsed = z.array(z.string()).safeParse(JSON.parse(storage.getItem(NEWS_KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return null;
  }
}

/** Adds an id to the seen list of this browser. Each id is in the list one time. */
export function markSeen(storage: NewsStorage | null, id: string): void {
  if (storage === null) return;
  try {
    const seen = readSeen(storage) ?? [];
    if (!seen.includes(id)) storage.setItem(NEWS_KEY, JSON.stringify([...seen, id]));
  } catch {
    // Private mode or a full storage: the spotlight closes for this visit only.
  }
}
