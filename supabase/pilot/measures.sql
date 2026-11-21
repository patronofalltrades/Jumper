-- Pilot measures for the circuit learning journey (decision D5, approved November 21, 2026).
--
-- Who uses this file: Hanif runs these queries in the Supabase dashboard SQL editor.
-- A researcher reads the results. There is no export script and no use of SUPABASE_SECRET_KEY.
--
-- How to use:
--   1. Copy ONE query (from its "Query" heading to its semicolon) into the SQL editor.
--   2. Change the lesson_id and lesson_version in the "params" lines at the top of the query.
--   3. Run it. The SQL editor shows only the result of the last statement, thus run one query at a time.
--
-- Rules for this file:
--   - Each query is a read-only SELECT. No query changes data.
--   - The queries use only the columns of learning_attempts and learning_events in
--     docs/TRD-learning-journey.md section 7, and the event names of section 8.
--   - The SQL editor runs as the database owner. Row-level security does not apply there.
--     Thus each query reads the rows of all students. Do not share the results outside the pilot team.
--   - A student is a user_id. The queries do not read names or emails.
--   - The definitions of the measures come from docs/sources/2026-11-20-learning-journey-prd.md section 7.
--     Where the tables do not have the necessary data, a "GAP" comment tells what is missing.
--     These gaps are not repaired in this file: the file does not invent columns.
--
-- Terms:
--   - First attempt: a learning_attempts row with kind = 'first'. One for each student, item and lesson version.
--   - Scored: scored = true. A Skip makes an unscored attempt (TRD section 6.4).
--   - Item: item_id, a question ID or a challenge ID from the lesson file.


-- ============================================================================
-- Query 1a. Transfer success, for each student
-- ============================================================================
-- Source definition: the student identifies the relevant connection, chooses a valid
-- diagnostic check, and explains the concept on a new physical layout.
--
-- What this query gives: for each student, the transfer_completed event of the lesson version
-- (first answer correct, final answer correct, hints used), and a summary row for all students.
-- "Transfer success" here is first_correct = true: the first answer was correct.
--
-- GAP 1: The source definition has three rubric parts (connection, diagnostic check, concept explanation).
--        The TRD tables keep only one "correct" value for each answer (first_correct, final_correct).
--        No column keeps the result of each rubric part. Thus this query gives the connection part only,
--        or one combined grade if the lesson grades the three parts as one answer.
-- GAP 2: The transfer item ID is not in TRD section 7 or 8. The query finds the transfer answer from the
--        transfer_completed event, not from an item_id.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
transfer as (
  -- One event for each attempt (the event is "one time only"; distinct on removes a duplicate send).
  select distinct on (e.attempt_id)
    e.user_id,
    e.attempt_id,
    (e.data ->> 'first_correct')::boolean as first_correct,
    (e.data ->> 'final_correct')::boolean as final_correct,
    (e.data ->> 'hints_used')::int        as hints_used,
    e.created_at
  from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
  where e.name = 'transfer_completed'
  order by e.attempt_id, e.created_at
),
first_transfer as (
  -- The first transfer answer of each student (a later retry does not replace it).
  select distinct on (user_id) *
  from transfer
  order by user_id, created_at
)
select
  user_id::text                 as student,
  attempt_id,
  first_correct                 as transfer_success,
  final_correct,
  hints_used,
  created_at
from first_transfer
order by student;

-- Query 1b. Transfer success, summary for all students (the first transfer answer of each student).
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
transfer as (
  select distinct on (e.user_id)
    e.user_id,
    (e.data ->> 'first_correct')::boolean as first_correct,
    (e.data ->> 'final_correct')::boolean as final_correct,
    (e.data ->> 'hints_used')::int        as hints_used
  from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
  where e.name = 'transfer_completed'
  order by e.user_id, e.created_at
)
select
  count(*)                                              as students_with_transfer_answer,
  count(*) filter (where first_correct)                 as first_answer_correct,
  count(*) filter (where final_correct)                 as final_answer_correct,
  count(*) filter (where first_correct and hints_used = 0) as first_correct_without_hints,
  round(avg(first_correct::int), 3)                     as transfer_success_rate
from transfer;


-- ============================================================================
-- Query 2. Prediction accuracy
-- ============================================================================
-- Source definition: correct first predictions divided by scored first prediction attempts.
--
-- Numerator: first attempts, scored, with behavior_correct = true.
-- Denominator: first attempts, scored, with a prediction and a grade (behavior_correct is not null).
-- An attempt with status = 'error' has no grade (TRD section 6.4). The query does not count it in the
-- rate, but it shows the count in its own column, so that the researcher can see it.
-- Retries and variations are not in this measure.
--
-- GAP 8: TRD section 7 does not tell which items are challenges and which are questions (the fault
--        question, the transfer question). If a question row has a prediction, it is in this result too.
--        Read the rows for each item_id, and do not use the total row until the item list is agreed.
--        The same gap applies to Query 3.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
first_predictions as (
  select a.*
  from learning_attempts a
  join params p on p.lesson_id = a.lesson_id and p.lesson_version = a.lesson_version
  where a.kind = 'first' and a.scored and a.prediction is not null
)
select
  item_id,
  count(*) filter (where behavior_correct is not null)       as scored_first_predictions,
  count(*) filter (where behavior_correct)                   as correct_first_predictions,
  round(
    count(*) filter (where behavior_correct)::numeric
    / nullif(count(*) filter (where behavior_correct is not null), 0), 3
  )                                                          as prediction_accuracy,
  count(*) filter (where behavior_correct is null)           as not_graded_error_or_open
from first_predictions
group by rollup (item_id)
order by item_id nulls last;  -- the row with item_id = null is the total for all items


-- ============================================================================
-- Query 3. Explanation accuracy
-- ============================================================================
-- Source definition: correct first explanation choices divided by scored first explanation attempts.
--
-- Numerator: first attempts, scored, with explanation_correct = true.
-- Denominator: first attempts, scored, with explanation_correct not null (an explanation was submitted and graded).
-- The grade comes from the authored choices. The optional written reflection is not graded here.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
first_explanations as (
  select a.*
  from learning_attempts a
  join params p on p.lesson_id = a.lesson_id and p.lesson_version = a.lesson_version
  where a.kind = 'first' and a.scored and a.explanation_correct is not null
)
select
  item_id,
  count(*)                                     as scored_first_explanations,
  count(*) filter (where explanation_correct)  as correct_first_explanations,
  round(avg(explanation_correct::int), 3)      as explanation_accuracy,
  -- F2-AC4: a correct behavior with a wrong explanation.
  count(*) filter (where behavior_correct and not explanation_correct) as behavior_right_explanation_wrong
from first_explanations
group by rollup (item_id)
order by item_id nulls last;  -- the row with item_id = null is the total for all items


-- ============================================================================
-- Query 4. Debugging efficiency
-- ============================================================================
-- Source definition: time and unrelated edits between fault presentation and a verified correction.
-- TRD section 8: the time and the number of edits between the fault and a run that passes.
-- The edit count comes from the "changes" field (of snapshot_compared).
--
-- This query is a PROXY. Read the gaps before you use the result.
--   Fault start   = the first run_completed event of the student with status <> 'ok' (a failed run).
--   Correction    = the next run_completed event of the same student with status = 'ok'.
--   Time          = the time between the two events.
--   Compares      = the snapshot_compared events between the two runs, and the sum of their "changes".
--   Restores      = the snapshot_restored events between the two runs.
--   Runs between  = the number of runs between the two runs.
--
-- GAP 3: No event marks "fault presentation". There is no event when the challenge changes the board
--        or when the fault clip plays. The query uses the first failed run as the start.
-- GAP 4: run_completed has "status" and "observed", but no field tells if the observed behavior is the
--        expected behavior. Thus status = 'ok' means "the run gave a result", not "the correction is verified".
-- GAP 5: "Unrelated edits" are not in the tables. "changes" is the number of differences that the student
--        saw in Compare with last run. It is not a count of each edit, and it does not tell which edits are
--        unrelated to the fault. An edit without a compare is not counted. Run records (with the edits)
--        stay in the browser (decision D4), thus the database cannot count edits.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
events as (
  select e.*
  from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
),
runs as (
  select distinct on (run_id) user_id, run_id, data ->> 'status' as status, created_at
  from events
  where name = 'run_completed'
  order by run_id, created_at
),
fault as (
  select distinct on (user_id) user_id, run_id as fault_run_id, created_at as fault_at
  from runs
  where status is distinct from 'ok'
  order by user_id, created_at
),
correction as (
  select distinct on (f.user_id) f.user_id, r.run_id as correction_run_id, r.created_at as correction_at
  from fault f
  join runs r on r.user_id = f.user_id and r.created_at > f.fault_at and r.status = 'ok'
  order by f.user_id, r.created_at
)
select
  f.user_id                                         as student,
  f.fault_run_id,
  f.fault_at,
  c.correction_run_id,
  c.correction_at,
  c.correction_at - f.fault_at                      as time_to_correction,
  (select count(*) from runs r
     where r.user_id = f.user_id and r.created_at > f.fault_at
       and r.created_at < c.correction_at)          as runs_between,
  (select count(*) from events e
     where e.user_id = f.user_id and e.name = 'snapshot_compared'
       and e.created_at > f.fault_at and e.created_at <= c.correction_at) as compares,
  (select coalesce(sum((e.data ->> 'changes')::int), 0) from events e
     where e.user_id = f.user_id and e.name = 'snapshot_compared'
       and e.created_at > f.fault_at and e.created_at <= c.correction_at) as changes_seen_in_compares,
  (select count(*) from events e
     where e.user_id = f.user_id and e.name = 'snapshot_restored'
       and e.created_at > f.fault_at and e.created_at <= c.correction_at) as restores
from fault f
left join correction c on c.user_id = f.user_id  -- a student with no correction shows nulls
order by f.user_id;


-- ============================================================================
-- Query 5. Help dependence
-- ============================================================================
-- Source definition: hints used, and assisted versus independent task completion.
--
-- For each student:
--   - hint_events_level_1/2/3: the hint_used events, by hint level.
--   - hints_on_attempts: the sum of hints_used on all attempts (first, retry, variation).
--   - completed_independent: completed attempts with hints_used = 0.
--   - completed_assisted: completed attempts with hints_used > 0.
--
-- GAP 6: "Assisted" here means "used one or more hints". The tables do not record other help,
--        for example a lecturer who helps in the room, or the existing "build for me" action.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
attempts as (
  select a.*
  from learning_attempts a
  join params p on p.lesson_id = a.lesson_id and p.lesson_version = a.lesson_version
),
hints as (
  select e.user_id, (e.data ->> 'level')::int as level
  from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
  where e.name = 'hint_used'
),
students as (
  select user_id from attempts
  union
  select user_id from hints
)
select
  s.user_id                                                                  as student,
  (select count(*) from hints h where h.user_id = s.user_id and h.level = 1) as hint_events_level_1,
  (select count(*) from hints h where h.user_id = s.user_id and h.level = 2) as hint_events_level_2,
  (select count(*) from hints h where h.user_id = s.user_id and h.level = 3) as hint_events_level_3,
  (select coalesce(sum(a.hints_used), 0) from attempts a where a.user_id = s.user_id) as hints_on_attempts,
  (select count(*) from attempts a
     where a.user_id = s.user_id and a.status = 'complete' and a.hints_used = 0) as completed_independent,
  (select count(*) from attempts a
     where a.user_id = s.user_id and a.status = 'complete' and a.hints_used > 0) as completed_assisted
from students s
order by s.user_id;


-- ============================================================================
-- Query 6. Completion
-- ============================================================================
-- Source definition: students reaching the transfer task divided by students starting the lesson.
--
-- Started:  a student with one or more rows (attempt or event) for the lesson version.
-- Reached:  a student with a transfer_completed event for the lesson version.
--
-- GAP 7: No event marks "lesson started" or "transfer task opened". The query uses the first record
--        as the start, and the final transfer answer as "reached". A student who opens the transfer
--        task but does not give a final answer is counted as "not reached".
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
started as (
  select a.user_id from learning_attempts a
  join params p on p.lesson_id = a.lesson_id and p.lesson_version = a.lesson_version
  union
  select e.user_id from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
),
reached as (
  select distinct e.user_id from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
  where e.name = 'transfer_completed'
)
select
  (select count(*) from started)                                           as students_started,
  (select count(*) from reached r where r.user_id in (select user_id from started)) as students_reached_transfer,
  round(
    (select count(*) from reached)::numeric / nullif((select count(*) from started), 0), 3
  )                                                                        as completion_rate;


-- ============================================================================
-- Query 7. Pilot records for each student (release checklist item 6)
-- ============================================================================
-- Release checklist item 6: first attempts, retries, hints and transfer responses can be
-- distinguished in the pilot records.
--
-- This query gives one row for each record, with a record_type column:
--   'first attempt', 'retry', 'variation'  (from learning_attempts.kind)
--   'hint'                                (from hint_used events)
--   'transfer answer'                     (from transfer_completed events)
-- Rows are in time order for each student. A retry shows the ID of its first attempt (first_attempt_id).
-- The query does not show the written reflection. Add the column "reflection" to the first part
-- if the researcher needs it for the qualitative review.
with params as (
  select 'af-led'::text as lesson_id, 1::int as lesson_version
),
attempt_rows as (
  select
    a.user_id,
    case a.kind when 'first' then 'first attempt' when 'retry' then 'retry'
                when 'variation' then 'variation' else a.kind end as record_type,
    a.item_id,
    a.id                    as attempt_id,
    a.first_attempt_id,
    a.scored,
    a.status,
    a.prediction,
    a.behavior_correct,
    a.explanation,
    a.explanation_correct,
    a.hints_used,
    null::int               as hint_level,
    null::boolean           as transfer_first_correct,
    null::boolean           as transfer_final_correct,
    a.run_id,
    a.created_at,
    a.completed_at
  from learning_attempts a
  join params p on p.lesson_id = a.lesson_id and p.lesson_version = a.lesson_version
),
event_rows as (
  select
    e.user_id,
    case e.name when 'hint_used' then 'hint' else 'transfer answer' end as record_type,
    a.item_id,
    e.attempt_id,
    a.first_attempt_id,
    a.scored,
    null::text              as status,
    null::text              as prediction,
    null::boolean           as behavior_correct,
    null::text              as explanation,
    null::boolean           as explanation_correct,
    (e.data ->> 'hints_used')::int                                   as hints_used,
    (e.data ->> 'level')::int                                        as hint_level,
    (e.data ->> 'first_correct')::boolean                            as transfer_first_correct,
    (e.data ->> 'final_correct')::boolean                            as transfer_final_correct,
    e.run_id,
    e.created_at,
    null::timestamptz       as completed_at
  from learning_events e
  join params p on p.lesson_id = e.lesson_id and p.lesson_version = e.lesson_version
  left join learning_attempts a on a.id = e.attempt_id
  where e.name in ('hint_used', 'transfer_completed')
)
select * from attempt_rows
union all
select * from event_rows
order by user_id, created_at, record_type;
