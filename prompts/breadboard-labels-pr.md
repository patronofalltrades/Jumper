closes #100

## User story
As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words. (PLAN.md row 18)

## What changed
- `components/scene/textures.ts`: `drawBreadboard(x0, letter)` draws the letter of the breadboard (A, B), large and dark gray, over the center gap at the end near the learner (beside the row letters e and f).
- `components/scene/build-scene.tsx`: gives each breadboard its letter from the bench (`breadboards[].id`). Every bench shows its letters, also the one-breadboard Arduino Foundations bench (Hanif's answer 1).
- `components/build/guide.tsx`: `holeLines` (the hole card) is exported for the test. A hole in the middle of a breadboard now has the title "Breadboard A · row f, column 15", on Perch and on Arduino Foundations.
- `content/ui/build.json`: `hole.main` is now "Breadboard {board} · row {row}, column {column}".
- `content/projects/perch.json` (ASD-STE100):
  - The first task of each level that names a breadboard says where it is: "breadboard A (the one on the left)" or "breadboard B (the one on the right)" (level 1 tasks 1 and 2, level 2 task 1, level 3 task 1, level 4 task 1, level 5 task 1).
  - Each task that says "the blue − line" or "the red + line" now says which one: "on the left side of breadboard A" or "on the right side of breadboard B" (Hanif's answer 2 for the red + line). These are the open rails in `content/benches/perch.json` (`open_rails`: A `L+`/`L-`, B `R+`/`R-`), and the lines that level 1 joins to 3V3 and GND. Each task names the line on the breadboard of its part (button, LED and amp on A; mic and screen on B).
- `content/projects/arduino-foundations.json` (ASD-STE100): the tasks say "breadboard A" where the learner must find the breadboard ("This is breadboard A", "Put the LED on breadboard A", "the middle of breadboard A"), and each red + and blue − line task says "on the left side of breadboard A" (`open_rails` A: `L+`, `L-`). The ground task lost "next to the red + line": the side now tells where the line is.
- `tests/hole-card.test.ts` (new): 3 tests. The hole card names breadboard A and B on Perch, and breadboard A on Arduino Foundations.
- `tests/content.test.ts`: 1 new test. Each "red + line" or "blue − line" in a task of an available project must say its side and breadboard, and the side must agree with `open_rails` of the bench.
- `PLAN.md`: row 35 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/breadboard-labels.md`, `prompts/breadboard-labels-pr.md`, `ledger/LEDGER.md`: prompt log, this text and the ledger entry.

Not changed, from Hanif's answers: the hole card of a rail hole still says "Blue − line (ground)" or "Red + line (power)" (answer 3), and the letter stays 1.5 holes high (answer 4).

## How it was tested
- Plain English: the hole card test points at a middle hole on each breadboard and reads the first line of the hole card. On Perch breadboard A it must be "Breadboard A · row f, column 15", on breadboard B "Breadboard B · row c, column 22", and on the Arduino Foundations breadboard "Breadboard A · row f, column 15". The content test reads each task of Perch and Arduino Foundations: each red + or blue − line must say "on the left side" or "on the right side" of a breadboard, as the bench gives it.
- Red 1: `vitest run tests/hole-card.test.ts` on `336d8c6`: 3 failed (`holeLines is not a function`). Fix: `04b0e86`.
- Red 2 (after Hanif's answers): `vitest run tests/content.test.ts tests/hole-card.test.ts` on `48b2b7b`: 2 failed (the Arduino hole card said "Row f, column 15"; the content test stopped at "Connect the 3V3 pin to the red + line of breadboard A."). Fix: `7744032`.
- Green: `vitest run`: 492 passed in 37 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- A real change that makes the test fail: if `hole.main` in `content/ui/build.json` loses `Breadboard {board} ·`, the hole card tests fail; if a task says only "the red + line", or "the right side of breadboard A", the content test fails.
- Browser, local only (before Hanif's answers): a temporary public route (removed before the commit) showed the empty Perch bench in Chromium (software GL), at 1280 × 800 and 390 × 844. Seen: "A" and "B" over the center gaps at the near end, readable at 1280 px and small but readable at 390 px. No Supabase project was used.

## Not checked
- The "A" on the Arduino Foundations breadboard in a browser. It uses the same drawing code as Perch, and the Uno is far to the left of it.
- The hole card in a browser (the test reads its text; the card itself was not hovered).
- The letter in dark mode (the breadboard texture has fixed colors, as before), and on a real phone or a GPU.
- The error messages (for example "connect 5V to the red + line") still say only "the red + line" or "the blue − line". They come after the task text, which names the line.
- The level clips and walkthrough videos still show the old task text (issue #103 changes the clips).
- Merge with the sibling PRs (#101 to #104). They can also change `PLAN.md`, `ledger/LEDGER.md`, `content/ui/build.json`, `tests/content.test.ts` and the task text in `content/projects/perch.json` and `content/projects/arduino-foundations.json`, so conflicts are possible.
- Assignment rule 3 red and green screenshots: the red and green outputs are above as text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
