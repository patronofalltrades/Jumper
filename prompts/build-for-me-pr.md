closes #115
## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)
## What changed
- `lib/game/build-demo.ts` (new): `demoFrames` makes the pictures of the demo from the steps of the walkthrough clip (`levelClip` steps, `clipFrame`): for each task, first the cue (where the part goes glows), then the part in place, with the caption of the task and a short pause. With reduced motion, one still picture for each step. `demoBoard` puts the parts of the level on the learner's own start board (a start part with the same id as a part of the level gets a new id in the demo). `showFrame` shows a picture in a separate, read-only board store. `clearForDemo` takes the learner's board back to `base` as one step through the engine (one Undo step; the tasks go back; XP, tasks done, mistakes and fails stay).
- `components/build/build-for-me.tsx` (new): `BuildForMe`, the button and its ask dialog (shadcn Dialog). `BuildDemo`, the demo layer over the board: its own store, a cover that takes the clicks on the board and on the rest of the page, a capture key handler (Esc stops, Ctrl+Z and the tool keys do nothing), the caption card with "Step n of total" and Stop. At the end or on Stop, the layer goes and the board is the start board of the level.
- `components/build/build-view.tsx`: 3 lines. The import, `<BuildForMe clip={clip} />` right after the Check button, and `<BuildDemo clip={clip} position={position} />` in the board area.
- `components/walkthrough/clip-player.tsx`: `useReducedMotion` is exported (no other change).
- `content/ui/build.json`: new `buildForMe` text, in ASD-STE100.
- `tests/build-demo.test.ts` (new): see below.
- `PLAN.md`: row 44 added at the end of "Plan vs. Reality". No other line changed.
- `prompts/build-for-me.md`, `prompts/build-for-me-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

Why a separate store: the engine and the autosave (`useLevel`) only read `boardStore`. The demo never writes to it, so it cannot give XP, tick a task, add a mistake, write an attempt row or save a demo board. The level is not passed, because only Check passes it.

Merge with #114 (Clear): the button is in its own file. When #114 adds the button row beside Check, the merge is one line: move `<BuildForMe clip={clip} />` into the row. `clearForDemo` can then call the Clear action of the store. The board store is not changed here.
## How it was tested
- What the tests check, in plain words: for each Perch level, the demo shows the tasks in task order, with the instruction of each task as the caption; it starts on the start board and adds the parts of the level one at a time, in order; each task first shows where its part goes, then the part in place; it ends on the full build with the end caption; with reduced motion, it shows one still picture for each step. The demo builds on the learner's own start board, and no two parts have the same id. For levels 1 to 3, on a finished board: the clear leaves only the start board, keeps XP, tasks done, mistakes, fails and the highest task, and is one Undo step; then the full demo plays in its own store, and the learner's board store gets zero changes (so the autosave writes nothing), and the demo store has 0 XP. A board that has only its start parts does not change.
- Red (`7f90a9d`): `vitest run tests/build-demo.test.ts`: 1 file failed, "Failed to resolve import "@/lib/game/build-demo"" (the module did not exist).
- Green (`90542c4`): `vitest run tests/build-demo.test.ts`: 30 passed. `vitest run`: 586 passed in 41 files.
- A real change that makes the test fail: if `BuildDemo` played the demo in `boardStore` (the learner's store) and not in its own store, the "zero changes" test fails, and the autosave would save the demo board.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint`): exit 0.
- Browser check: a temporary public route (removed before the commit) with placeholder Supabase values and a saved finished Perch level 2 board, in Chromium at 1280 x 800 and at 390 x 844 with reduced motion. Seen: the button beside Check, the ask dialog, the cue and the parts of level 2 coming in on the board with "Step n of 8" and the task text, Ctrl+Z blocked during the demo, Stop. After Stop, and after the demo ended by itself: the saved board had the 4 start parts, 80 XP and 8 tasks done. No page errors. Screenshots were looked at, not committed.
## Not checked
- Until #114 merges, the button shows only where the Check button shows (all tasks done, Check card closed). After #114, it shows in the row while the learner builds.
- On a phone, the pop-up sheet under the board stays in view during the demo (it does not take taps).
- A learner's own start board that is very different from the ready-made board: the parts of the level can then sit on top of the learner's parts in the demo (it is only a picture).
- Arduino Foundations levels were not seen in a browser (the unit tests use Perch).
- The live app and a real log-in (the live Supabase project was not used).
- Likely merge conflicts with the sibling PRs (#111 to #114) in `PLAN.md`, `ledger/LEDGER.md`, `content/ui/build.json` and the Check area of `components/build/build-view.tsx`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
