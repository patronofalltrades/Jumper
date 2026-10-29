import { z } from "zod";
import text from "../../content/ui/collaborate.json";

// The Invite form and the Note form (issue #88). The browser and the server action use the same schemas, so the
// learner sees the same message before and after the request. The messages are content, in ASD-STE100.

const errors = text.invite.errors;

/** The email of a friend, in small letters and with no spaces. It must not be the email of the learner. */
export function inviteSchema(ownEmail: string) {
  const own = ownEmail.trim().toLowerCase();
  return z.object({
    email: z
      .string({ error: errors.empty })
      .trim()
      .min(1, errors.empty)
      .pipe(z.email(errors.invalid))
      .transform((email) => email.toLowerCase())
      .refine((email) => email !== own, errors.own),
  });
}

export const noteSchema = z.object({
  body: z.string({ error: text.notes.errors.empty }).trim().min(1, text.notes.errors.empty).max(1000, text.notes.errors.long),
});

export type Field = "email" | "body";
export type FieldErrors = Partial<Record<Field, string>>;

/** The first message for each field that is missing or not correct. Empty when the form is correct. */
export function fieldErrors(schema: z.ZodType, input: unknown): FieldErrors {
  const parsed = schema.safeParse(input);
  if (parsed.success) return {};
  const found: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as Field;
    found[field] ??= issue.message;
  }
  return found;
}
