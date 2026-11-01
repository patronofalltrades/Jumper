import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Term } from "@/lib/stats/terms";
import { loadProjects, issueText } from "./load";
import { termsFileSchema } from "./schema";

// Reads and validates every content/terms/*.json file (PLAN.md feature 10). Each term must name a level that exists in
// its project, so a term never points at nothing.
export function loadTerms(): Term[] {
  const projects = loadProjects();
  return readdirSync(join(process.cwd(), "content", "terms"))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const parsed = termsFileSchema.safeParse(JSON.parse(readFileSync(join(process.cwd(), "content", "terms", f), "utf8")));
      if (!parsed.success) throw new Error(`${f}: ${issueText(parsed.error)}`);
      const { project, terms } = parsed.data;
      const levels = projects.find((p) => p.slug === project)?.levels ?? [];
      for (const t of terms) {
        if (!levels.some((l) => l.position === t.level)) throw new Error(`${f}: ${t.term} needs level ${t.level}, which does not exist`);
      }
      return terms.map((t) => ({ project, ...t }));
    });
}
