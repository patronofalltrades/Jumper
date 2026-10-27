import { z } from "zod";
import text from "../../content/ui/profile.json";
import { savePrefix } from "../game/level-key";

// The email and delete controls of the profile page (issue #78).

const errors = text.change_email.errors;

/** The form of a new email. It refuses an empty field, a wrong email and the email that the learner has now. */
export const newEmailSchema = (current: string) =>
  z.object({
    email: z
      .string({ error: errors.empty })
      .trim()
      .toLowerCase()
      .min(1, errors.empty)
      .email(errors.invalid)
      .refine((value) => value !== current.trim().toLowerCase(), errors.same),
  });

/** True when the learner has typed the word that turns on the Delete button. */
export const canDelete = (typed: string): boolean => typed.trim() === text.delete_account.word;

/** Removes the saved boards of a user from the browser. The keys of other users and other keys stay. */
export function clearUserSaves(storage: Pick<Storage, "length" | "key" | "removeItem">, user: string) {
  const prefix = savePrefix(user);
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
}
