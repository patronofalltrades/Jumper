# Prompt log: the board name in build mode (issue #134)

1. Hanif's prompt (his words): "build 3, 5 and 6, write the issue text. Open Issues for each stories"

   Claude notes: Claude wrote the issue text for pilot feedback items 3, 5 and 6 (`prompts/pilot-feedback-issues.md` on `feature/first-visit-tour`, "Issue A" is this item). Hanif opens each issue. This branch covers Issue A only.

2. Hanif's prompt (his words): "branches are created, start the agents"

   Claude notes: Hanif created the branch `Features/Board-name`. Claude worked on that branch only. Claude did not create a branch, an issue or a pull request.

3. Claude's steps

   - Red: `tests/build-header.test.ts` imports `buildEyebrow` from `lib/game/build-header.ts`, which did not exist. Vitest failed on the import. Commit `c07c1f3`.
   - Green: `content/ui/build.json` has a new `header.eyebrow` text ("{project} · {board} · Level {n}"). `lib/game/build-header.ts` fills it. `app/p/[project]/[level]/page.tsx` reads the board from `content/projects/<slug>.json` and passes the line to `BuildView`. The level intro pop-up reads the same `eyebrow` prop, so it shows the same line with no code change. Commit `27516a4`.
   - Checks: `npm run typecheck`, `npm run lint` and `npm test` pass.

4. Decisions made by Claude (minimal choices)

   - The board comes from the content file, not from Supabase. The `projects` table row does not have a `board` column in the page query.
   - If a project slug has no content file, the page shows "not found". Every available project has a content file, so this should not happen.
   - The project name is still the part of the title before the colon ("Perch: a home for your AI agent" shows "Perch").
   - The header line keeps the `truncate` class. It does not wrap on a phone. A long line ends with "…" instead.
