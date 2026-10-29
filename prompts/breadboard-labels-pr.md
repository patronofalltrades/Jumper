closes #100

## User story
As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words. (PLAN.md row 18)

## What changed
- `components/scene/textures.ts`: `drawBreadboard(x0, letter)` draws the letter of the breadboard (A, B), large and dark gray, over the center gap at the end near the learner (beside the row letters e and f). `null` draws no letter.
- `components/scene/build-scene.tsx`: gives each breadboard its letter from the bench (`breadboards[].id`).
- `lib/circuit/bench.ts`: new `breadboardLetter(bench, board)`: the id on a bench with two or more breadboards, `null` on a bench with one. The 3D board and the hole card use it, so they always agree.
- `components/build/guide.tsx`: `holeLines` (the hole card) is exported for the test. A hole in the middle of a breadboard now has the title "Breadboard A · row f, column 15" on Perch. On Arduino Foundations it stays "Row f, column 15".
- `content/ui/build.json`: new text `hole.mainOn`: "Breadboard {board} · row {row}, column {column}".
- `content/projects/perch.json` (ASD-STE100):
  - The first task of each level that names a breadboard says where it is: "breadboard A (the one on the left)" or "breadboard B (the one on the right)" (level 1 tasks 1 and 2, level 2 task 1, level 3 task 1, level 4 task 1, level 5 task 1).
  - Each task that says "the blue − line" now says which one: "the blue − line on the left side of breadboard A" or "the blue − line on the right side of breadboard B". These are the open rails in `content/benches/perch.json` (`open_rails`: A `L-`, B `R-`), and the lines that level 1 joins to GND. Each task names the line on the breadboard of its part (button, LED and amp on A; mic and screen on B).
- `tests/hole-card.test.ts` (new): 4 tests. The red commit (`336d8c6`) came before the fix (`04b0e86`).
- `PLAN.md`: row 35 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/breadboard-labels.md`, `prompts/breadboard-labels-pr.md`, `ledger/LEDGER.md`: prompt log, this text and the ledger entry.

**One breadboard (Arduino Foundations): the letter is hidden.** The Arduino Foundations text never says "breadboard A"; it says "the breadboard". A lone "A" on the board, or "Breadboard A ·" on the hole card, would make a learner look for a breadboard B that is not there. The rule is in one place (`breadboardLetter`), so a future project with two or more breadboards gets the letters with no code change.

## How it was tested
- Plain English: the test points at a middle hole on each Perch breadboard and reads the first line of the hole card. On breadboard A it must be "Breadboard A · row f, column 15", and on breadboard B "Breadboard B · row c, column 22". On the Arduino Foundations bench (one breadboard) it must stay "Row f, column 15". A 4th test checks `breadboardLetter` on the two benches.
- Red: `vitest run tests/hole-card.test.ts` on `336d8c6`: 3 failed (`holeLines is not a function`).
- Green: `vitest run`: 492 passed in 37 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- A real change that makes the test fail: if `hole.mainOn` in `content/ui/build.json` loses `Breadboard {board} ·`, or if `breadboardLetter` returns `null` for Perch, the A and B tests fail.
- Browser, local only: a temporary public route (removed before the commit) showed the empty Perch bench and the empty Arduino bench in Chromium (software GL), at 1280 × 800 and 390 × 844. Seen: "A" and "B" over the center gaps at the near end, readable at 1280 px and small but readable at 390 px; no letter on the Arduino breadboard. No Supabase project was used.

## Not checked
- The hole card in a browser (the test reads its text; the card itself was not hovered).
- The letter in dark mode (the breadboard texture has fixed colors, as before), and on a real phone or a GPU.
- The hole card for a rail hole still says "Blue − line (ground)" with no breadboard. The issue asks only for the middle holes.
- The red + lines in the tasks still say "the red + line" (level 1 says "of breadboard A"). The issue asks only for the blue − line. See "Questions for Hanif".
- The level clips and walkthrough videos still show the old task text (issue #103 changes the clips).
- Merge with the sibling PRs (#101 to #104). They can also change `PLAN.md`, `ledger/LEDGER.md`, `content/ui/build.json` and the level 2 LED tasks in `content/projects/perch.json`, so conflicts are possible.
- Assignment rule 3 red and green screenshots: the red and green outputs are above as text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
