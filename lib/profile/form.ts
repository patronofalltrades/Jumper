import { z } from "zod";
import avatars from "../../content/ui/avatars.json";
import text from "../../content/ui/profile.json";

// The profile form (PLAN.md feature 17). The ids are the characters in content/ui/avatars.json; the database
// refuses any other id (supabase/migrations/20261019000000_profile.sql).

const ids = avatars.avatars.map((a) => a.id) as [string, ...string[]];
export const DEFAULT_AVATAR = ids[0];

/** The image of a character. An unknown id gives the default character. */
export function avatarSrc(id: string | null | undefined): string {
  return `/avatars/${id && ids.includes(id) ? id : DEFAULT_AVATAR}.svg`;
}

const errors = text.errors;

export const profileSchema = z.object({
  display_name: z.string({ error: errors.name_empty }).trim().min(1, errors.name_empty).max(40, errors.name_long),
  avatar: z.enum(ids, { error: errors.avatar }),
});
