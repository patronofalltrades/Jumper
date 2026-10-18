import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectSchema, type Project } from "./schema.ts";

export const PROJECTS_DIR = join(import.meta.dirname, "..", "..", "content", "projects");

// Reads and validates every content/projects/*.json file, in catalog order.
export function loadProjects(dir = PROJECTS_DIR): Project[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const parsed = projectSchema.safeParse(JSON.parse(readFileSync(join(dir, f), "utf8")));
      if (!parsed.success) throw new Error(`${f}: ${issueText(parsed.error)}`);
      return parsed.data;
    })
    .sort((a, b) => a.position - b.position);
}

function issueText(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
