import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectSchema, type Project } from "./schema.ts";

// Reads and validates every content/projects/*.json file, in catalog order.
// The path starts at the repository root, where the seed script, Vitest and Next.js run. The Next.js build cannot
// use import.meta.dirname, and a fixed path lets it copy only this folder to the server.
export function loadProjects(): Project[] {
  return readdirSync(join(process.cwd(), "content", "projects"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const parsed = projectSchema.safeParse(JSON.parse(readFileSync(join(process.cwd(), "content", "projects", f), "utf8")));
      if (!parsed.success) throw new Error(`${f}: ${issueText(parsed.error)}`);
      return parsed.data;
    })
    .sort((a, b) => a.position - b.position);
}

function issueText(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
