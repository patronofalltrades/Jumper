closes #102

## User story
As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. (PLAN.md row 5a)

## What changed
- `lib/game/engine.ts`: new `reversedLed()`. The wire tasks of the level tell where each LED leg goes: "r1.2 to led1.anode" means that the short leg (−) must not touch the resistor (either leg, because the resistor side is not fixed yet), and "led1.cathode to GND" means that the long leg (+) must not touch ground. `step` gives the `reversed_led` Mistake at once when the change adds a reversed LED, with the message of the level's `reversed_led` forbid rule (no text in code). `taskState` does not mark a reversed LED as done, so the task list does not tick it. `swaps`, the early-part rule (#72) and `taskSpot` do not change.
- `content/projects/perch.json` (level 2) and `content/projects/arduino-foundations.json` (levels 2 and 4): new forbid rule `led_shorted` (`led1.anode` to `led1.cathode`): "Oops! This wire joins the two legs of the light (LED), so no power goes through it. Undo the wire." Later levels get it through `joinRules`. The plain `reversed_led` text explains what the short leg is (the shorter leg, the blue − mark, the flat side of a real LED) and where it goes (`32461bc`, Hanif's answer 4).
- `content/projects/perch.json`: level 2 task 7 has the tip from Arduino Foundations level 2 task 4: "The other leg of the resistor must touch the long leg (+) of the light. Put them in the same line of 5, or connect them with a wire."
- `lib/circuit/led-spot.ts` (new, pure): `ledSpot(bench, parts, resistorId, ledId)` finds the holes for the LED on the board as it is now. The long leg (+) goes in the line of 5 of a free leg of the resistor (leg 2 first; a free line has no pin of the main board and no other part). The short leg (−) goes in the same row, in the next column (then the column on the other side), in a line with nothing in it. The LED that the learner must move does not count. Null when there is no such place.
- `lib/game/engine.ts`: `reversedText()` fills the new `place_message` of the `reversed_led` rule with the holes from `ledSpot` ({board}, {resistor_row}, {resistor_column}, {long_row}, {long_column}, {short_row}, {short_column}). The resistor is the one of the "r1.2 to led1.anode" task. When the level has no `place_message` or no place is found, the plain `message` shows. The level Check (`lib/circuit/check.ts`) still uses the plain `message`.
- `lib/content/schema.ts`: a forbid rule can have an optional `place_message`.
- `content/projects/perch.json` (level 2) and `content/projects/arduino-foundations.json` (levels 2 and 4): a `place_message` for `reversed_led`, for example in Perch: "... Turn the light around. Put the long leg (+) in row b, column 15 of breadboard A. This is the same column as the free leg of the resistor (row a, column 15). Put the short leg (−) in row b, column 16. Then connect column 16 to the blue − line." It keeps the short-leg explanation of `32461bc`. The LED task text now says: "Put its long leg (+) in the same column as the free leg of the resistor. Put its short leg (−) in the next column, in the same row."
- `content/ui/build.json`: the LED guide bar says the same: "a hole for the long leg of the light (+). Use the same column as the free leg of the resistor." and "a hole in the next column, in the same row, for the short leg (−). Then connect that column to the blue − line."
- `content/ui/dashboard.json`: label "LED legs joined by a wire" for the mistakes chart.
- `components/scene/parts.tsx`: a small `Badge` component. The LED keeps its red + badge at the long leg and gets a blue − badge at the short leg.
- `tests/led-direction.test.ts` (new): 17 tests. `tests/led-spot.test.ts` (new): 8 tests. The red commits (`830117a`, `7cfc01e`) came before the fixes (`18f6741`, and the commit for the exact holes).
- `PLAN.md`: row 37 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/led-direction-check.md`, `prompts/led-direction-check-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

## How it was tested
Plain English: the tests play Perch level 2 and Arduino Foundations levels 2 and 4 in the task engine. They put the resistor, then the LED. With the short leg in the line of a resistor leg (the 5 steps of the issue), or the long leg on ground, the learner must get the `reversed_led` Mistake at once, with the text of the level. The LED the right way round must snap in. A wire that joins the two LED legs must give `led_shorted`. Perch level 2 task 7 must have the "same line of 5" tip, and each level that puts an LED must have the `led_shorted` rule. For Hanif's answer 4: the `reversed_led` text must name the exact holes (Perch: row b, column 15 for the long leg, next to the resistor leg in row a, column 15, and row b, column 16 for the short leg), the LED task and the guide must say where each leg goes, and `ledSpot` must find the right holes, skip a busy column or a busy resistor leg, skip lines with a pin of the main board, and give null when there is no place.

- Red (`830117a`): `vitest run tests/led-direction.test.ts`: 10 failed, 4 passed. The failures: the reversed LED snapped in with no Mistake (Perch level 2, Arduino levels 2 and 4), no `led_shorted` rule, no tip in task 7. The 4 that passed: the long leg on ground (the old forbid rule already caught it) and the LED the right way round.
- Red for the exact holes (`7cfc01e`): `vitest run tests/led-spot.test.ts tests/led-direction.test.ts`: `tests/led-spot.test.ts` could not load (no `lib/circuit/led-spot.ts`), and 4 tests in `tests/led-direction.test.ts` failed (no hole names in the text, no place text in the tasks and the guide).
- Green: `vitest run`: 513 passed in 38 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- A real change that makes the test fail: remove the `reversedLed` check in `step`, and the reversed LED gives `wrong_place` in place of `reversed_led`, so 4 tests fail.
- Browser, local only: a temporary route (removed before the commit) showed the finished Perch level 2 board in the cloud Chromium (software GL, 1280 x 800). The red + badge is at the long leg, and the blue − badge is at the short leg. No Supabase project was used.

## Not checked
- The Mistake pop-up for a reversed LED in a browser, with the long text (the engine tests cover the text), a real phone, the live Vercel app.
- The content is in the database: the seed script must run after the merge, or the live levels keep the old rules and texts.
- Merge with the sibling PRs: #101 changes `taskSpot` in `lib/game/engine.ts` (this diff does not touch it, but the file is the same), and #100 to #104 all add rows to `PLAN.md` and `ledger/LEDGER.md`, so conflicts there are likely. `content/ui/build.json` changes here too (`guide.led`), and #101 works on the guide holes for the resistor and the LED, so a conflict there is possible. `taskSpot` is not changed.
- Assignment rule 3 red and green screenshots: the red and green output is above as text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
