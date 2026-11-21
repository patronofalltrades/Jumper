# Pilot measures SQL (decision D5)

Branch: `feature/pilot-measures-sql`, from `feature/learning-journey-scope`. No issue and no pull request yet: Hanif decides after review.

## Key prompts

1. Session task (in Hanif's name, short form): Hanif approved decision D5 on November 21, 2026. A researcher reads the pilot records with saved SQL that Hanif runs in the Supabase dashboard SQL editor. No export script and no `SUPABASE_SECRET_KEY`. The tables `learning_attempts` and `learning_events` do not exist yet; their columns are in TRD addendum section 7. Work package 2 (`feature/learning-records`) writes their migration later.
   - Write `supabase/pilot/measures.sql`: one named, commented query for each measure in source section 7 (transfer success, prediction accuracy, explanation accuracy, debugging efficiency, help dependence, completion), and one query that lists each student's first attempts, retries, hints and transfer answers separately (release checklist item 6).
   - Use only the columns and event names of TRD addendum sections 7 and 8. Each query takes `lesson_id` and `lesson_version` as parameters at the top. Read-only SELECT statements only. Comments in ASD-STE100.
   - Where a measure needs data that the tables do not have, do not invent columns. Write the gap as a comment and list it.
   - Check the SQL on a throwaway local Postgres with fixture rows. Do not commit the fixture tables as a migration.
   - Commit and push the branch. Do not open an issue or a pull request. Never push to main.

## Decisions in this work

1. Parameters: each query starts with a `params` CTE (`lesson_id`, `lesson_version`). The SQL editor of the dashboard has no psql variables, thus a CTE is the parameter.
2. Each measure uses `kind = 'first'` rows only where the source definition says "first". Attempts with `status = 'error'` have no grade, and Query 2 shows them in their own column.
3. Debugging efficiency is a proxy (first failed run to the next run with status `ok`). The gaps are in the file.

## Gaps (also in the file as "GAP" comments)

1. Transfer success has three rubric parts. The tables keep one "correct" value for each answer.
2. The transfer item ID is not in the TRD. The queries use the `transfer_completed` event.
3. No event marks fault presentation.
4. `run_completed` does not tell if the observed behavior is the expected behavior.
5. "Unrelated edits" are not in the tables. `changes` is a count of differences in a compare, not of edits.
6. "Assisted" means hints only. Other help is not recorded.
7. No event marks "lesson started" or "transfer task opened".
8. The TRD does not tell which items are challenges and which are questions. A question row with a prediction goes into the prediction totals.

## Test

A throwaway local Postgres 16 (as `scripts/sql-tests.sh`): `local-setup.sql`, all migrations, then the two tables from TRD section 7 and fixture rows (3 students, two lesson versions) in the scratchpad only. All queries ran in a read-only session (`default_transaction_read_only=on`). The results agreed with the values expected from the fixture, and the rows of the other lesson version were not counted.
