import { sketchesSchema, type SketchStep } from "./schema";

// The code step of a level, from content/sketches/<project>.json (issue #58). A project or a level without one has no code step.
export async function loadSketchStep(slug: string, position: number): Promise<SketchStep | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = await import(`../../content/sketches/${slug}.json`).catch(() => null);
  return file ? (sketchesSchema.parse(file.default).levels[position] ?? null) : null;
}
