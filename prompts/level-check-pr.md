# PR text for issue #25 (Hanif opens the PR)

**Title:** Level check: Check button, reasons, hearts and attempts

**Body:**

closes #25

As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt.

## What changed

- **Check** shows when all tasks of a level are done. The browser checks the board with the require and forbid rules of the level (`lib/circuit/check.ts`). It compares connections, not holes, and accepts a resistor or a button either way round.
- **Fail:** the card tells the reason in plain words. A forbid rule gives its own text from the content (short circuit, reversed LED, …). A missing connection gives "missing ground" or "wrong pin", with the pin names. The two ends flash red, and the learner loses 1 heart. 3 hearts per level. At 0 hearts the learner is not locked out: the next fail gives 3 new hearts. "Fix the board" closes the card, and a Check button stays on the board.
- **Pass:** one SQL function, `record_attempt` (new migration), saves the attempt, sets the session to completed, and adds the XP: task XP + level XP, + 10 XP with no mistakes and no failed Check. Then the Level complete pop-up opens with the real session, and the next level opens on the map.
- **Each Check is an attempt.** A failed Check saves its mistake type (the rule code, `missing_ground` or `wrong_pin`).
- Hearts in the build-mode header. Snapshots now save `passed` when their session passed.
- Text in `content/ui/build.json`. schema.md: the function, and hearts come from failed attempts (no new column).
- No new packages.

## Decisions (Hanif)

- Red/green test: a reversed LED fails the check.
- At 0 hearts, the next fail gives 3 new hearts.
- The +10 XP bonus needs no task mistakes and no failed Check.
- Hearts = failed attempts of the session; no new column.

## Before you merge: database

Run `supabase/migrations/20261018100000_level_check.sql` in the Supabase **SQL Editor**. Without it, Check shows "We could not save your Check."

## The test

`tests/check.test.ts` checks that **an LED turned around fails the level check, with the reversed LED reason**. It takes the finished Level 2 board, turns the LED around (long leg on ground), and checks that the result is "failed" with the code `reversed_led`. An LED that is backwards stays dark, so the learner must learn that reason, not a general "wrong pin".

- A change that makes it fail: if `checkLevel()` reports a missing connection before a forbid rule, the reversed LED shows as "wrong pin", and the test fails.
- Red: the commit "Red: report missing connections first" makes that change. The CI check on this PR fails.
- Green: the next commit puts the forbid rules first again. The CI check passes.

Red (CI fails):

_(screenshot)_

Green (CI passes):

_(screenshot)_

## Checks

- `npm test`: 140 tests pass (12 new).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- `record_attempt` on a throwaway local Postgres: fail, pass, bonus, second pass (no more XP), tasks not done, too much XP, another user's session and a logged-out user all give the correct result.
- Not checked yet: the Check card in a browser with the real Supabase project. On the live preview or your Mac: finish Level 1, press Check (pass → Level complete, Level 2 opens). On Level 2, turn the LED around, press Check (reason + 1 heart lost).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01MXE8ksRTg8uyXh3fdqDfkt
