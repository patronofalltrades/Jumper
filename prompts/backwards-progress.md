# Prompt log: Backwards progress (issue #63)

Branch: `Feature/BackwardsProgress`. Issue: [#63](https://github.com/patronofalltrades/Jumper/issues/63).

## Hanif's key prompts

1. "can you write test plans and run end to end tests for all the available modules, features, and functions of the app?" (the QA audit)
2. "Create issues for the top 5 on Github." (issues #61 to #65)
3. "Open separate sessions to work on each issues (61-65) on their respective branches. Read documentation before touching any code."

## Decisions by Hanif (Oct 24)

1. A passed replay gives no XP.
2. After the last task, a removal brings the step pop-ups back (reverses what issue #52 kept out).
3. Add the audit and these decisions to the ledger on each fix branch.

## Work

- Red: the scenarios B1 to B5 of the audit as tests in `tests/board-store.test.ts` and `tests/engine.test.ts`.
- Green: `Progress.reached` in `lib/game/engine.ts`, so the engine reads the board as it is now.
