closes #104

## User story
As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. (PLAN.md row 5a)

## What changed
- `lib/circuit/check.ts`: new pure `strayPins()`. It finds each board pin that a part or a wire touches (same net), but that no `require` or `forbid` rule names. The rules are the joined rules of the level page, so the pins of the earlier levels count as used. For each pin it names the part end in the line of the pin, else the first part (before a wire) on that net. `checkLevel` fails with the new code `stray_pin` when every rule is right but a stray pin is there, so the old reasons come first and do not change. `connectionStates` adds each stray pin as a wrong "must not connect" row, so the list is all right exactly when Check passes.
- `content/ui/build.json`: the text `play.check.stray_pin`: "Oops! The {part} touches pin {pin} of the board. This level does not use that pin. Move the part to a line with no board pin."
- `components/build/popups.tsx`: the fail card fills that text with the part end and the pin (3 lines).
- Red ring (#90) and "Show me": no change. `problemOf` makes `stray_pin` a forbidden connection, so the ring goes on the part end and the pin, and it clears when the part leaves the line.
- `tests/check.test.ts`: the board of the issue fails with `stray_pin` and names `r1.1` and `esp.GPIO37`; the connection list shows the 3 stray pins (GPIO37, GPIO35, GPIO0); the finished board of every level of every project in `content/boards/` passes, with the rules that the level page joins (Perch 1 to 5, Arduino Foundations 1 to 4). One old test changed: "passes the finished board of level N" gave each level only its own rules, on a board with the parts of the earlier levels. Now it joins the start levels, as the page does (else the 3V3 pin of level 1 is a stray pin on level 3).
- `PLAN.md`: row 39 at the end of "Plan vs. Reality". No other line changed.
- `prompts/stray-pin-check.md`, `prompts/stray-pin-check-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

## How it was tested
Plain English: the test builds the Perch level 2 board from the issue (resistor in A-f15 and A-f17, LED in A-g17 and A-g18, pin 2 wired to line 15, line 18 wired to the blue − line) and presses Check in code. Before the fix the Check said "passed". Now it must fail with `stray_pin` and name GPIO37. A second test makes sure the real finished boards of all levels still pass.
- Red (`994282f`): `vitest run tests/check.test.ts`: 2 failed, 47 passed. `expected { passed: true } to match object { passed: false, code: "stray_pin", … }`, and the connection list had no stray rows.
- Green (`fc8e7c6`): `vitest run`: 36 files, 499 tests passed.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- Browser, local only: a temporary public route (removed before the commit) with placeholder Supabase values showed the board of the issue in Chromium at 1280 x 800 (light) and 390 x 844 (dark). The connection list read "13 of 16 right", with "Resistor side 1 → GPIO 37", "Resistor side 2 → GPIO 35" and "LED − leg → GPIO 0" wrong. The red ring and the dashed line went from the resistor to pin 37. No Supabase project was used.
- A real change that makes the test fail: remove the `strayPins` call from `checkLevel`, and the board of the issue passes again.

## Not checked
- The fail card text in a browser. A real Check needs a log-in and the live Supabase project.
- The live Vercel app, and touch on a real phone.
- Levels of projects that have no `content/boards/` file yet (they have no finished board to test).
- Merge with the sibling PRs (#100 to #103): `PLAN.md`, `ledger/LEDGER.md` and `content/ui/build.json` will likely conflict (rows and keys added at the same places). #102 (LED direction check) also changes `lib/circuit/check.ts` or its tests, and `tests/check.test.ts` may conflict.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
