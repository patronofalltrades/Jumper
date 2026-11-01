// The dictionary of the dashboard (PLAN.md feature 10): the terms of the levels that a learner passed. Pure: no React,
// no database. The terms come from content/terms/ (lib/content/terms.ts).

export type Term = { project: string; level: number; term: string; definition: string };
export type PassedLevel = { project: string; level: number };

/** The terms of the levels that the learner passed, in content order. A level of another project does not count. */
export function termsLearned(terms: Term[], passed: PassedLevel[]): Term[] {
  const done = new Set(passed.map((p) => `${p.project}/${p.level}`));
  return terms.filter((t) => done.has(`${t.project}/${t.level}`));
}

export type TermGroup = { letter: string; terms: Term[] };

/** The terms in alphabetical order, under the first letter of each term, as in a dictionary. Digits come before letters. */
export function termsByLetter(terms: Term[]): TermGroup[] {
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
  const groups: TermGroup[] = [];
  for (const t of sorted) {
    const letter = t.term.charAt(0).toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.terms.push(t);
    else groups.push({ letter, terms: [t] });
  }
  return groups;
}
