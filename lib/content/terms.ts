import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import type { Term } from "@/lib/stats/terms";
import { loadProjects, issueText } from "./load";
import { codeTermsSchema, termsFileSchema } from "./schema";

// Reads and validates every content/terms/*.json file (PLAN.md feature 10). Each term must name a level that exists in
// its project, so a term never points at nothing.
// The code words of content/code-terms/ (issue #143) are terms too: the word, then its explanation and its example.
export function loadTerms(): Term[] {
  const projects = loadProjects();
  const read = (dir: string, toTerms: (json: unknown, f: string) => Term[]) =>
    readdirSync(join(process.cwd(), "content", dir))
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => {
        const terms = toTerms(JSON.parse(readFileSync(join(process.cwd(), "content", dir, f), "utf8")), f);
        for (const t of terms) {
          const levels = projects.find((p) => p.slug === t.project)?.levels ?? [];
          if (!levels.some((l) => l.position === t.level)) throw new Error(`${f}: ${t.term} needs level ${t.level}, which does not exist`);
        }
        return terms;
      });
  const parse = <T,>(schema: z.ZodType<T>, json: unknown, f: string): T => {
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new Error(`${f}: ${issueText(parsed.error)}`);
    return parsed.data;
  };
  return [
    ...read("terms", (json, f) => {
      const { project, terms } = parse(termsFileSchema, json, f);
      return terms.map((t) => ({ project, ...t }));
    }),
    ...read("code-terms", (json, f) => {
      const { project, words } = parse(codeTermsSchema, json, f);
      return words.map((w) => ({ project, level: w.level, term: w.word, definition: `${w.text} Example: ${w.example} ${w.does}` }));
    }),
  ];
}
