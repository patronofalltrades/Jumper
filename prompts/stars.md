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

   Checks: 186 tests, the type check, lint and the build pass. Not checked in a browser in this session.
