# Prompt log: Pilot records (issue #195, PR #193)

1. Hanif's decision D4, in the scoping session of November 21 (his words): "Let's do two supabase rows" (two Supabase tables for the pilot records; run records stay in the browser).

2. Hanif's prompt (his words): "Let's create PR 192 and 193 to tackle user stories that relate to the post interview result"

3. Claude asked which two work packages of `docs/PLAN-learning-journey.md` to build. Hanif's choice (from the multiple-choice form): "1 + 2 (Recommended)". PR #192 is package 1 (the lesson file). This PR is package 2 (the pilot records).

4. What Claude built:
   - `supabase/migrations/20261121000000_learning_records.sql`: the tables `learning_attempts` and `learning_events`, with the columns of TRD addendum section 7, owner-only row-level security, one first attempt for each item and lesson version, one completion event for each attempt or run, and the functions `log_learning_events` (adds a batch, ignores duplicates) and `owns_learning_attempt` (the policy check for a retry, with no recursion).
   - `supabase/tests/learning_isolation.sql`: user B cannot read, change or extend the records of user A; a visitor reads nothing; a duplicate event adds nothing; a second first attempt fails; a retry is a new row; a deleted account deletes its records. A red run with a broken events policy failed ("B sees 1 events of A").
   - `lib/journey/records.ts` and `tests/journey-records.test.ts`: the Zod schemas. An event `data` allows only numbers, booleans and short IDs, so no code and no reflection fits.
   - `app/actions/journey.ts`: `saveAttempt`, `completeAttempt` and `logEvents`. No screen uses them yet.
   - `schema.md`, the TRD addendum (as-built facts) and row 73 of "Plan vs. Reality".
