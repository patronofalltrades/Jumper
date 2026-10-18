# Prompt log: Level check (feature 5a, issue #25)

1. "Jumper Issue #25 Branch: https://github.com/patronofalltrades/Jumper/tree/Feature/Levelcheck Work on this issue. Read claude.md, PLAN.md, readme.md, schema.md before touching anything"

   Claude read the docs, issue #25, TRD sections 6–9 and the build-mode code, and asked 4 questions. Hanif answered:
   - Red/green test: "Reversed LED fails". A level 2 board with the LED turned around must fail with the reversed LED reason.
   - 0 hearts: "Refill to 3". The learner is not locked out; at 0 hearts the next fail gives 3 new hearts.
   - +10 XP bonus: no task mistakes and no failed Check.
   - Hearts: from the failed attempts of the session, no new column.

   Claude built:
   - `lib/circuit/check.ts`: `checkLevel()`, pure. Test first (red), then the code (green): `tests/check.test.ts`, 10 tests (each finished level passes, reversed LED, short circuit, missing ground, wrong pin, resistor either way round).
   - `lib/game/hearts.ts`: `heartsLeft()` (3, 2, 1, 0, 3…), 2 tests.
   - `supabase/migrations/20261018100000_level_check.sql`: `record_attempt()`. Fail: one attempt. Pass: attempt, session completed, XP (tasks + level + 10 when clean) to the session and the profile, in one transaction.
   - `app/actions/attempt.ts`: `recordAttempt`, with Zod.
   - Build mode: the Check card (reason, hearts, "Fix the board"), a Check button on the board, hearts in the header. A pass opens Level complete with the real session.
   - Text in `content/ui/build.json`. schema.md: the function and the hearts row.

   Checks: 140 tests, typecheck, lint, build pass. SQL on a local throwaway Postgres.
