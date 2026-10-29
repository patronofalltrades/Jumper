closes #113

## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)

## What changed
- `lib/game/hologram.ts` (new): the pure logic, "which ghost for which row". `hologramGhost()` gives the ghost of a task (its part or wire in the holes that `taskSpot` taps, with the finished board of the level clip) or of a connection (a ghost wire between free holes of its two ends, with the free-hole choice of a wire task). A part that is on the board already shows where it is. An end whose part is not on the board yet uses its hole on the finished board. A "Got it" task has no ghost. `connectionHologram()` gives a ghost only for a connection that must be made, not for a forbid or stray row.
- `lib/game/board-store.ts`: new field `hologram` (the row under the pointer) and `setHologram()`. A different level clears it. It changes nothing else.
- `components/build/hologram-row.tsx` (new): a list row that sets the hologram on pointer enter and keyboard focus, clears it on leave, blur and when the row goes, and on a phone shows it for 3 seconds after a tap.
- `components/build/task-list.tsx`, `components/build/connection-list.tsx`: the rows use `HologramRow`. Only the rows changed, not the headers or the open state (#112 changes those).
- `components/scene/build-scene.tsx`: a `Hologram` group draws the ghost parts see-through (45 %, with the `Fade` wrapper of #103, which gets an `opacity` prop) and the dashed ghost wire of a connection. It computes the ghost inside `FinishContext`, so `build-view.tsx` did not change.
- `components/scene/problem-marks.tsx`: an optional `color` (default red). The connection ghost uses the guide color.
- `tests/hologram.test.ts` (new): 18 tests. The red commit (`37f0b0d`) came before the fix (`9c7bf7e`).
- `PLAN.md`: row 42 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/hover-hologram.md`, `prompts/hover-hologram-pr.md`, `ledger/LEDGER.md`: prompt log, PR text and ledger entry.

No text in `content/` changed: the hologram has no words.

## How it was tested
- Plain English: the main test plays every level of Perch and Arduino Foundations as a learner who puts each part and wire exactly where its hologram shows it. Each ghost must be in the holes of the guide arrow, each task must pass with no mistake, and the level Check must pass. Other tests check the ghost of a resistor (A-a2 and A-a4 in Perch level 2, as the clip), a part that is already placed, a missing button wire, the connection ghost in free holes of the right lines, no ghost for "must not touch" rows, and that the store never changes the parts, the progress or the history.
- Red: `npx vitest run tests/hologram.test.ts` on `37f0b0d` (a stub `hologram.ts` with the types only): 16 failed, 1 passed (17 tests). For example "perch level 2: the ghost is in the guide holes ..." failed (`expected null not to be null`), and the store tests failed with `setHologram is not a function`.
- Green: `tests/hologram.test.ts` 18 passed. `npx vitest run`: 574 passed in 41 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- One real change that makes the test fail: in `hologramGhost`, use the holes of the finished board for a resistor or LED in place of the `taskSpot` taps; then the ghost and the guide arrow do not agree when a finished hole is taken, and "a learner who copies the hologram" fails.
- Browser, local only: a temporary public route (removed before the commit) with placeholder Supabase values showed Perch level 2 in Chromium. At 1280 x 800: the see-through button, LED and wire ghosts on the task rows, and a dashed ghost wire with two rings for the wrong row "GPIO 1 → Button side 1". At 390 x 844 with touch: a tap set the hologram, and it went away after about 3 seconds. Keyboard focus showed it, and closing the task list cleared it. No Supabase project was used.

## Not checked
- Dark mode, a real phone, and the live Vercel app.
- The look of the ghost next to the guide pop-up of the same task on a small screen.
- Merge with the sibling PRs: #112 changes the headers and open state of the same two list files (this PR changes only the rows), and #111 to #115 all add rows to PLAN.md and LEDGER.md, so conflicts there are likely. `content/ui/build.json` is not changed here.
- Assignment rule 3 red and green screenshots: only the command output above. It applies only if this test counts as a required test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
