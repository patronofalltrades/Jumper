# Prompt log: Replay of a passed level always passes the Check (issue #62)

1. "Open separate sessions to work on each issues (61-65) on their respective branches. Read documentation before touching any code."

   This session works on issue #62, on the branch `ReplayCheckFix` that Hanif made. Claude read CLAUDE.md, AGENTS.md, PLAN.md, the PRD, the TRD, `schema.md`, the ledger and issue #62 (no comments) before it changed any file. Then Claude read the Check, the autosave, the two server actions and the SQL function.

   The audit decisions (Oct 24) are in the ledger: a passed replay gives no XP; after the last task, a removal brings the step pop-ups back (another issue); the audit and the decisions go in the ledger of each fix branch.

   Claude built, test first (red, then green):
   - SQL: `supabase/migrations/20261024000000_replay.sql` and the SQL test `supabase/tests/record_attempt_replay.sql` (on a throwaway local Postgres).
   - `lib/game/check-flow.ts` and `tests/check-flow.test.ts`.
   - `app/actions/attempt.ts`, `app/actions/session.ts`, `components/build/autosave.ts`, `components/build/check.ts`.
   - `schema.md`.

   Claude did not run the app, the seed or a migration on the live Supabase project.
