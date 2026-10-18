import { z } from "zod";
import text from "../../content/ui/snapshots.json";

// The Save snapshot and Edit snapshot forms (issue #27). The browser and the server action use the same schemas, so
// the learner sees the same message before and after the request. The messages are content, in ASD-STE100.

const errors = text.save.errors;

const title = z.string({ error: errors.title_empty }).trim().min(1, errors.title_empty).max(80, errors.title_long);
const notes = z.string().trim().max(2000, errors.notes_long);
const levelId = z.number({ error: errors.level }).int(errors.level).positive(errors.level);

export const snapshotFormSchema = z.object({ levelId, title, notes });
export const snapshotEditSchema = z.object({ title, notes });

export type SnapshotField = "levelId" | "title" | "notes";
export type FieldErrors = Partial<Record<SnapshotField, string>>;

/** The first message for each field that is missing or not correct. Empty when the form is correct. */
export function fieldErrors(schema: z.ZodType, input: unknown): FieldErrors {
  const parsed = schema.safeParse(input);
  if (parsed.success) return {};
  const found: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as SnapshotField;
    found[field] ??= issue.message;
  }
  return found;
}

/** The form fields as the schemas read them. An empty level select gives no level. */
export function readSnapshotForm(form: FormData) {
  const level = String(form.get("level") ?? "");
  return {
    levelId: level ? Number(level) : undefined,
    title: String(form.get("title") ?? ""),
    notes: String(form.get("notes") ?? ""),
  };
}
