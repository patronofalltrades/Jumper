closes #111
## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)
## What changed
- `lib/game/put-back.ts` (new): `putBackParts(bench, parts, start)` gives the ready-made parts of the earlier levels that are not on the board. `back`: the parts that can go back, in level order. `blocked`: the parts that cannot, because another part is in their holes or has their name. A part in the same holes with a different name counts as on the board.
- `lib/game/board-store.ts`: new action `putBack(start)`. It adds the `back` parts as one step (one Undo takes them away) and gives the result, for the note.
- `lib/game/engine.ts`: the "change" event gets an optional `restore` flag. A restore change goes the same way as Undo: no Mistake, no XP. Tasks below `reached` can be done again, and a level that was at Check goes back to Check.
- `components/build/build-view.tsx`: only the `ToolBar` and its props. A "Put back" button next to Undo. Its name and tooltip are "Put back the level {n} build". It shows when the level starts with earlier parts, and is off when no part is missing. After a press, a short note says that the parts are back, or how many parts did not go back. `BuildView` gets an optional `startLevel` prop and passes `start` and `startLevel` to the `ToolBar`.
- `app/p/[project]/[level]/page.tsx`: passes `startLevel` (the last start level, from `startLevels`).
- `content/ui/build.json`: `putBack` text, in ASD-STE100.
- `components/build/autosave.ts`: not changed. A level still opens with the learner's own earlier board when there is one.
- `tests/put-back.test.ts` (new): 10 tests. The red commit (`a9279e3`) came before the change.
- `PLAN.md`: row 40 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/restore-earlier-build.md`, `prompts/restore-earlier-build-pr.md`, `ledger/LEDGER.md`: prompt log, PR text and ledger entry.
## How it was tested
- Red: `vitest run tests/put-back.test.ts`: the file failed (`Failed to resolve import "@/lib/game/put-back"`), no test could run.
- Green: `tests/put-back.test.ts` 10 passed. Full suite: 566 passed in 41 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint`): exit 0.
- What the tests show, in plain English: the button puts back only the missing ready-made parts and keeps the learner's parts; a part whose holes or name are taken stays out; the engine gives no Mistake and no XP for the parts (the same change by hand gives a Mistake); a level that was at Check goes back to Check; one Undo takes all the parts away. A real change that makes a test fail: remove `|| event.restore` in `step`, and the two "no Mistake" tests fail (the engine and the store test).
- Browser, local only: a temporary route under `/s/` (removed before the commit) showed Perch level 3 in Chromium at 1280 x 800 and 390 x 844. The button was off at the start. After the removal of `w1` and `led1`, it was on; a press put both back with 0 mistakes and 0 XP and showed "The parts of level 2 are back."; Undo took both away. With a wire in the hole of `led1`, the note said "1 part did not go back. ...". No Supabase project was used.
## Not checked
- A real phone, and the live Vercel app.
- The visible label is "Put back" (the tool bar buttons are small). The full text is the name and tooltip. See the question comment.
- Merge with the sibling PRs: #114 and #115 add buttons near Check in `build-view.tsx`; #112 and #113 also change the build page. All of them add rows to PLAN.md and LEDGER.md, and some to `content/ui/build.json`, so conflicts there are likely.
- Assignment rule 3 screenshots (red and green). They apply only if this test counts as a required test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
