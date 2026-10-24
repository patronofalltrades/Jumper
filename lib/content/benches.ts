import type { BenchSpec } from "@/lib/circuit/bench";
import perch from "@/content/benches/perch.json";
import { benchSchema } from "./schema";

// The bench of each project, from content/benches/<project>.json. A project without the file uses the Perch bench.
export async function loadBenchSpec(slug: string): Promise<BenchSpec> {
  const file = /^[a-z0-9-]+$/.test(slug) ? await import(`../../content/benches/${slug}.json`).catch(() => null) : null;
  return benchSchema.parse(file?.default ?? perch);
}
