import { lessonSchema, type Lesson } from "./schema";

// A lesson of the learning journey, from content/lessons/<id>.json (TRD addendum 6.1). Null when the lesson does not exist.
export async function loadLesson(id: string): Promise<Lesson | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const file = await import(`../../content/lessons/${id}.json`).catch(() => null);
  return file ? lessonSchema.parse(file.default) : null;
}
