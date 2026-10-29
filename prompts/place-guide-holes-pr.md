closes #101
## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)
## What changed
- `lib/game/engine.ts`: `taskSpot` takes a new last argument `finish` (the finished board of the level). A resistor or LED place task on a breadboard now gets two glowing holes and two taps (first leg, then second leg), and the pop-up points at the first tap. New helper `legTaps`: it uses the holes of the part on the finished board when the part fits there now (free holes, the right span, lines with no board pin and no other part). Else it uses the nearest free holes that fit. The first tap of an LED is its long leg (+), in the line of a resistor leg that has no other part. `Plan` gets an optional `finish` field. `step` and `taskState` did not change.
- `app/p/[project]/[level]/page.tsx`: passes `boards.levels[position]` to `BuildView` as `finish`.
- `components/build/build-view.tsx`: puts `finish` in the plan.
- `components/build/popups.tsx`: `useTaskSpot` passes `plan.finish` to `taskSpot`.
- `components/walkthrough/clip-player.tsx`: the clip cue gets `finish: clip.order`, so the clip glows the holes where the clip puts the part. `lib/game/walkthrough.ts` did not change.
- `tests/place-guide.test.ts` (new): the tests below. The red commit (`0c89fde`) came before the fix (`9cc32be`).
- `PLAN.md`: row 36 added at the end of "Plan vs. Reality". No other line changed.
- `prompts/place-guide-holes.md`, `prompts/place-guide-holes-pr.md`, `ledger/LEDGER.md`: prompt log, this text, and the ledger entry.

Perch level 2 now shows the resistor at A-a2 and A-a4, and the LED at A-b4 (long leg) and A-b3, the same holes as the level clip. Before, the pop-up pointed at A-f15, a line with pin GPIO37.
## How it was tested
The test in plain English: a learner who taps only the arrow holes, task after task, must finish each level of each project with no mistake and pass Check. For each resistor or LED task, no glowing hole and no tap may be in a line with a pin of the main board. Four smaller tests check the Perch level 2 holes, that the pop-up does not point at A-f15, the fallback when a hole is taken, and the LED long leg in the line of the free resistor leg.

- Red (`0c89fde`): `npx vitest run tests/place-guide.test.ts`: 7 failed, 6 passed (13). Fails: Perch level 2, Arduino Foundations levels 2 and 4 (`expected [] to have a length of 2`: no taps), and the 4 small tests.
- Green (`9cc32be`): `tests/place-guide.test.ts` 13 passed. Full suite `npx vitest run`: 501 passed in 37 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- Browser, local only: a temporary route (removed before the commit) with placeholder Supabase values showed Perch level 2 at the resistor task in Chromium at 1280 x 800. The pop-up pointed at A-a2 with the tap ring. No Supabase project was used.

A real change that makes the test fail: put back `if (board) return { holes: [], at: boardCenter(board), taps: [], area: null };` for resistor and LED tasks, and the tap-only learner has no hole to tap on Perch level 2.
## Not checked
- The LED task, the clip cue and a phone size in a browser. Only the resistor task was seen in Chromium.
- The fallback in real play. When a learner follows the arrows, the holes of the finished board are probably free in every level, so the fallback is checked only by the two unit tests.
- Red and green screenshots (Assignment rule 3), if this counts as a required test. The red and green output is above.
- The live Vercel app.
- Merge with the sibling PRs: #102 changes `step` and `taskState` in `lib/game/engine.ts` (other lines), and all the PRs of this batch add rows to `PLAN.md` and `ledger/LEDGER.md`. Small conflicts are possible there.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
