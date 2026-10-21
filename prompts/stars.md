# Prompt log: Stars (feature 8, issue #40)

1. "Issue 40, Feature/Star branch. Read files before implementing anything"

   Claude read issue #40, CLAUDE.md, PLAN.md (feature 8 and section 4), the TRD (`/snapshots` route, `toggleStar`), schema.md, the migration (the `stars` table and its policy), the snapshot pages, the snapshot actions and `content/ui/snapshots.json`. The `stars` table and its row-level security were already in the database, so no migration is needed. Claude asked 3 questions. Hanif answered:
   - Starred view: "All / Starred tabs". The Starred tab uses `/snapshots?view=starred`.
   - Star press: "Change at once". If the server refuses, the star goes back and a message shows.
   - Lobby cards: "No, leave the lobby".

   Claude built:
   - `lib/snapshots/stars.ts`: `readView()`, `isStarred()`, `visibleSnapshots()` and the `starInput` schema. Test first (red), then the code (green): `tests/stars.test.ts`, 6 tests.
   - `app/actions/star.ts`: `toggleStar({ id, starred })` (TRD 9). It sends the new state, not "flip", so two fast presses end in the state of the last press. A star that is already there is not an error.
   - `components/snapshots/star-button.tsx`: the star button, with `useOptimistic`.
   - `app/snapshots/page.tsx`: All and Starred tabs, a star on each card (outside the card link), and an empty message for the Starred view.
   - `app/snapshots/[id]/page.tsx`: the star next to the Lab notebook button.
   - Text in `content/ui/snapshots.json` (`list` and the new `stars` section).

   Checks: 186 tests, the type check, lint and the build pass.

2. "can you show me screenshots of the feature", then the answer "Temp test account"

   Claude ran the real routes with a throwaway test account (3 snapshots) and took screenshots in Chromium, on a phone (390 × 844, dark) and a laptop (1280 × 800, light): the empty Starred view, the list before and after 2 stars, the Starred tab, and the snapshot page. The 2 stars stayed after a reload. No console errors. The "All" tab was hard to read on the yellow backdrop, so the tab bar is darker now. The test account was deleted after the check.
