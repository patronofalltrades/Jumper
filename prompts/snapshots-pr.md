# PR text for issue #23 (Hanif opens the PR)

**Title:** Snapshots: save, list, view in 3D, edit and delete

**Body:**

closes #23

As a learner, I want to save my board as a snapshot with a title, step and notes, list my snapshots, open one in a view-only 3D page, edit its notes, and delete it after confirming, so that I keep a lab notebook of my build.

## What changed

- **Save snapshot** in the build-mode header and on the Level complete pop-up (it was "coming soon"). A form asks for a title and notes.
- **Lab notebook** at `/snapshots`: the user's snapshots, newest first. The dock's Builds button opens it. The lobby "My builds" cards open their snapshot.
- **Snapshot page** at `/snapshots/[id]`: the board in 3D, view only (you can turn it and see the nets, but not change it). Edit the title and notes. Delete, after a confirm dialog.
- **Server actions** `createSnapshot`, `updateSnapshot`, `deleteSnapshot` (TRD 9), with Zod checks. Row-level security keeps each snapshot to its owner, so another user's snapshot shows "not found".
- **Pure logic** in `lib/snapshots/wiring.ts`, with Vitest tests.
- Text in `content/ui/snapshots.json`. README: the live URL. schema.md: the wiring format.
- No new packages.

## Decisions (Hanif)

- Save from build mode and from the Level complete pop-up.
- A `/snapshots` list page, and the lobby cards open each snapshot.
- `passed` is false until the level Check feature exists.
- The red/green test is one that is easy to explain (Claude chose the save-and-open test).

## The test

`tests/wiring.test.ts` checks that **a board that you save opens again the same**. It saves a small Perch board (2 wires, a resistor, an LED and the mic) as JSON, reads it back as the database would give it, and checks that every part and every wire, with its color, is still there. It also checks that the app refuses JSON that is not a board.

- A change that makes it fail: if `toWiring()` drops the wires (`parts.filter((p) => p.type !== "wire")`), a saved snapshot opens with no wires, and the test fails.
- Red: the commit "Red: drop wires on save" makes that change. The CI check on this PR fails.
- Green: the next commit puts the wires back. The CI check passes.

Red (CI fails):

_(screenshot)_

Green (CI passes):

_(screenshot)_

## Checks

- `npm test`: 128 tests pass (5 new).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Chromium, on a test page with the same components (server actions replaced by stubs): 390 × 844 dark and 1280 × 800 light. Empty title gives a message; Save sends the board; Edit saves the notes; Delete waits for "Yes, delete"; no console errors.
- Not checked yet: the real routes with a log-in and Supabase. On the live app or your Mac: open a level, press Save, open the Lab notebook, open the snapshot, edit the notes, delete it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0163HgEYr6xScMLH3Wx8xyLz
