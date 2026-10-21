# Prompt log: Find (feature 9, issue #42)

1. "Issue 42, https://github.com/patronofalltrades/Jumper/pulls, read all the documentations before touching code. Implement"

   Claude read issue #42, CLAUDE.md, AGENTS.md, README.md, PLAN.md, the PRD, the TRD (`/snapshots` route, `listSnapshots`, TRD 8.2: one Postgres query with `ilike`), schema.md, the ledger, the Stars prompt log, the snapshot list page, `lib/snapshots/stars.ts` and the Next.js `Form` guide. Claude worked on `Feature/Find`, the branch that Hanif made. No migration: the search, the filters and the sort use the `snapshots` columns that are already there.

   Claude built:
   - `lib/snapshots/find.ts`: `readFind()` (the URL to a find), `findHref()` (a find to the URL), `isFiltered()`, `searchFilter()` (the `ilike` filter on the title and the notes) and `applyFind()` (adds the search, the filters and the sort to the snapshots query). Test first (red), then the code (green): `tests/find.test.ts`, 11 tests.
   - `components/snapshots/find-form.tsx`: the search box, the level filter, the result filter (all, passed, not checked) and the sort (newest first, most mistakes first). A change to a select applies at once. The search applies with Enter or the Search button. The form is a GET form, so it also works before the script loads.
   - `app/snapshots/page.tsx`: the form under the All and Starred tabs. The tabs keep the search, the filters and the sort. When no snapshot agrees, a message shows with a link that clears the search and the filters.
   - Text in `content/ui/snapshots.json` (the new `find` section).

   Checks: 197 tests, the type check, lint and the build pass. The search filter was tried on the real Supabase project, on the shared `levels` table only (no user data): upper and lower case agree, and `%`, `_`, `\`, quotes, commas and brackets are plain letters and give no error.
