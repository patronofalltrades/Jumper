closes #102

## User story
As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. (PLAN.md row 5a)

## What changed
- `lib/game/engine.ts`: new `reversedLed()`. The wire tasks of the level tell where each LED leg goes: "r1.2 to led1.anode" means that the short leg (−) must not touch the resistor (either leg, because the resistor side is not fixed yet), and "led1.cathode to GND" means that the long leg (+) must not touch ground. `step` gives the `reversed_led` Mistake at once when the change adds a reversed LED, with the message of the level's `reversed_led` forbid rule (no text in code). `taskState` does not mark a reversed LED as done, so the task list does not tick it. `swaps`, the early-part rule (#72) and `taskSpot` do not change.
- `content/projects/perch.json` (level 2) and `content/projects/arduino-foundations.json` (levels 2 and 4): new forbid rule `led_shorted` (`led1.anode` to `led1.cathode`): "Oops! This wire joins the two legs of the light (LED), so no power goes through it. Undo the wire." Later levels get it through `joinRules`. The `reversed_led` text now says what each leg must touch, because "Its long leg (+) is on ground" is not true for the new case.
- `content/projects/perch.json`: level 2 task 7 has the tip from Arduino Foundations level 2 task 4: "The other leg of the resistor must touch the long leg (+) of the light. Put them in the same line of 5, or connect them with a wire."
- `content/ui/dashboard.json`: label "LED legs joined by a wire" for the mistakes chart.
- `components/scene/parts.tsx`: a small `Badge` component. The LED keeps its red + badge at the long leg and gets a blue − badge at the short leg.
- `tests/led-direction.test.ts` (new): 14 tests. The red commit (`830117a`) came before the fix (`18f6741`).
- `PLAN.md`: row 37 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/led-direction-check.md`, `prompts/led-direction-check-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

## How it was tested
Plain English: the tests play Perch level 2 and Arduino Foundations levels 2 and 4 in the task engine. They put the resistor, then the LED. With the short leg in the line of a resistor leg (the 5 steps of the issue), or the long leg on ground, the learner must get the `reversed_led` Mistake at once, with the text of the level. The LED the right way round must snap in. A wire that joins the two LED legs must give `led_shorted`. Perch level 2 task 7 must have the "same line of 5" tip, and each level that puts an LED must have the `led_shorted` rule.

- Red (`830117a`): `vitest run tests/led-direction.test.ts`: 10 failed, 4 passed. The failures: the reversed LED snapped in with no Mistake (Perch level 2, Arduino levels 2 and 4), no `led_shorted` rule, no tip in task 7. The 4 that passed: the long leg on ground (the old forbid rule already caught it) and the LED the right way round.
- Green: `vitest run`: 502 passed in 37 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- A real change that makes the test fail: remove the `reversedLed` check in `step`, and the reversed LED gives `wrong_place` in place of `reversed_led`, so 4 tests fail.
- Browser, local only: a temporary route (removed before the commit) showed the finished Perch level 2 board in the cloud Chromium (software GL, 1280 x 800). The red + badge is at the long leg, and the blue − badge is at the short leg. No Supabase project was used.

## Not checked
- The Mistake pop-up for a reversed LED in a browser (the engine tests cover it), a real phone, the live Vercel app.
- The content is in the database: the seed script must run after the merge, or the live levels keep the old rules and texts.
- Merge with the sibling PRs: #101 changes `taskSpot` in `lib/game/engine.ts` (this diff does not touch it, but the file is the same), and #100 to #104 all add rows to `PLAN.md` and `ledger/LEDGER.md`, so conflicts there are likely. `content/ui/build.json` is not changed here.
- Assignment rule 3 red and green screenshots: the red and green output is above as text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
