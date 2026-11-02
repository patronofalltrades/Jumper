import type { Term, TermGroup } from "@/lib/stats/terms";

/**
 * The terms as a dictionary (PLAN.md feature 10): a letter heading for each group, and one entry for each term. An entry
 * is a closed details element, so the learner opens the meaning of one term at a time. The project shows beside the term,
 * because two projects can teach the same term. Native details: no script.
 */
export function TermsDictionary({ groups, source, where }: { groups: TermGroup[]; source: (t: Term) => string; where: (t: Term) => string }) {
  return groups.map((g) => (
    <div key={g.letter} className="flex flex-col gap-2">
      <h3 className="border-b border-border pb-1 text-2xl leading-none font-extrabold text-muted-foreground">{g.letter}</h3>
      {g.terms.map((t) => (
        <details key={`${t.project} ${t.term}`} className="group rounded-xl bg-muted px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
            <span>
              {t.term} <span className="text-xs font-normal text-muted-foreground">{source(t)}</span>
            </span>
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <p className="mt-2 text-sm">{t.definition}</p>
          <p className="mt-1 text-xs text-muted-foreground">{where(t)}</p>
        </details>
      ))}
    </div>
  ));
}
