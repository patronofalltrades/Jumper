# Prompt log: Snapshots (feature 6, issue #23)

1. "1. https://jumper-inky-sigma.vercel.app/ 2. https://github.com/patronofalltrades/Jumper/tree/Feature/Snapshots"

   Hanif set up Vercel and Supabase, made issue #23 and the branch `Feature/Snapshots`. Claude read PLAN.md, the PRD, the TRD, schema.md, the migration and the build-mode code, and asked 4 questions. Hanif answered:
   - Red/green test: "I need something that is explainable for my reflections. So please pick a feature or a part of the code that is easy to understand and easy to reflect on." Claude chose the save-and-open test: a saved board opens with the same parts and wires.
   - Save from: build mode and the Level complete pop-up.
   - List: a `/snapshots` page, and the lobby "My builds" cards open `/snapshots/[id]`.
   - Passed: false until the level Check exists.

   Claude built:
   - `lib/snapshots/wiring.ts`: `toWiring()`, `readWiring()` (Zod), `countWiring()`. Test first (red), then the code (green): `tests/wiring.test.ts`, 4 tests.
   - `lib/game/board-store.ts`: a read-only board for the snapshot page (taps do nothing; the camera and the net glow work). 1 new test.
   - `app/actions/snapshot.ts`: `createSnapshot`, `updateSnapshot`, `deleteSnapshot` (TRD 9), with Zod checks. Row-level security keeps each row to its owner.
   - `components/snapshots/save-snapshot.tsx`: the Save snapshot form (title, notes). In the build-mode header, and on the Level complete pop-up (it reads the board that build mode saved in this browser).
   - `app/snapshots/page.tsx`: the lab notebook list. `app/snapshots/[id]/page.tsx`: the board in 3D (view only), edit the title and notes, Delete after a confirm dialog. Another user's snapshot shows "not found".
   - The dock's Builds button opens `/snapshots`; the lobby "My builds" cards open their snapshot.
   - Text in `content/ui/snapshots.json`. README: the live URL. schema.md: the wiring format.

   Checks: 128 tests, typecheck, lint and build pass. Chromium on Claude's scratchpad page (server actions replaced by stubs): 390 × 844 dark and 1280 × 800 light; empty title gives a message; save sends 11 parts with 8 wires and the mistake count; edit sends the new notes; Delete does nothing until "Yes, delete"; no console errors.
