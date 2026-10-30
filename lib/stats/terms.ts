// The dictionary of the dashboard (PLAN.md feature 10): the terms of the levels that a learner passed. Pure: no React,
// no database. The terms come from content/terms/ (lib/content/terms.ts).

export type Term = { project: string; level: number; term: string; definition: string };
export type PassedLevel = { project: string; level: number };

/** The terms of the levels that the learner passed, in content order. A level of another project does not count. */
export function termsLearned(terms: Term[], passed: PassedLevel[]): Term[] {
  const done = new Set(passed.map((p) => `${p.project}/${p.level}`));
  return terms.filter((t) => done.has(`${t.project}/${t.level}`));
}
