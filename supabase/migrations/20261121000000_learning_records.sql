-- Pilot records for the circuit learning journey (docs/TRD-learning-journey.md section 7, decision D4).
-- Two tables that each user owns, behind row-level security, as the other user tables:
-- - learning_attempts: one row for each answer to a question or a challenge. A retry is a new row; the first stays.
-- - learning_events: the events of TRD addendum section 8. They carry IDs and scores only, never code or reflections.
-- A deleted account deletes its rows (cascade from profiles), so delete_my_account needs no change.

create table public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,40}$'),
  lesson_version int not null check (lesson_version > 0),
  -- The ID of the question or the challenge in content/lessons/<lesson>.json.
  item_id text not null check (item_id ~ '^[a-z0-9-]{1,60}$'),
  kind text not null check (kind in ('first', 'retry', 'variation')),
  first_attempt_id uuid references public.learning_attempts (id) on delete cascade,
  -- False when the learner skipped the prediction (F2-R2).
  scored boolean not null default true,
  status text not null default 'open' check (status in ('open', 'error', 'complete')),
  -- A challenge: the predicted behavior and its grade. A question: the first answer and its grade.
  prediction text check (length(prediction) <= 500),
  behavior_correct boolean,
  -- A challenge: the explanation choice and its grade. A question: the final answer and its grade (F1-R6).
  explanation text check (length(explanation) <= 500),
  explanation_correct boolean,
  hints_used int not null default 0 check (hints_used >= 0),
  -- The optional written reflection, for review only. It never goes into learning_events.
  reflection text check (length(reflection) <= 2000),
  run_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- A retry points to its first attempt. A first attempt and a variation do not.
  check ((kind = 'retry') = (first_attempt_id is not null)),
  check ((status = 'complete') = (completed_at is not null))
);

-- One first attempt for each item and lesson version (TRD addendum section 7).
create unique index learning_attempts_one_first on public.learning_attempts (user_id, lesson_id, lesson_version, item_id)
  where kind = 'first';
create index on public.learning_attempts (user_id, lesson_id, lesson_version);
create index on public.learning_attempts (first_attempt_id);

create table public.learning_events (
  -- The browser makes the ID. A second send of the same event adds no row.
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (name in (
    'comparison_opened', 'connection_selected', 'prediction_submitted', 'run_completed', 'explanation_submitted',
    'hint_used', 'snapshot_compared', 'snapshot_restored', 'transfer_completed'
  )),
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,40}$'),
  lesson_version int not null check (lesson_version > 0),
  attempt_id uuid,
  run_id uuid,
  -- IDs and scores only. The server action checks the values (lib/journey/records.ts).
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);

create index on public.learning_events (user_id, lesson_id, lesson_version, created_at);

-- The completion events occur one time only for each record (TRD addendum section 8).
create unique index learning_events_once_per_attempt on public.learning_events (user_id, name, attempt_id)
  where name in ('prediction_submitted', 'explanation_submitted', 'transfer_completed');
create unique index learning_events_once_per_run on public.learning_events (user_id, name, run_id)
  where name = 'run_completed';

-- Row-level security -----------------------------------------------------------

alter table public.learning_attempts enable row level security;
alter table public.learning_events enable row level security;

-- True when the attempt belongs to the user who calls. It runs as its owner (security definer), because a policy on
-- learning_attempts cannot read learning_attempts again (infinite recursion).
create function public.owns_learning_attempt(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.learning_attempts where id = p_id and user_id = auth.uid());
$$;
revoke execute on function public.owns_learning_attempt(uuid) from public, anon;
grant execute on function public.owns_learning_attempt(uuid) to authenticated;

-- Owner only, as the other user tables. A foreign key check ignores row-level security, so also make sure that the
-- first attempt of a retry is the user's own (as the policy of stars does).
create policy "Owner only" on public.learning_attempts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (first_attempt_id is null or public.owns_learning_attempt(first_attempt_id))
  );
create policy "Owner only" on public.learning_events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A visitor who is not logged in gets nothing.
revoke all on public.learning_attempts, public.learning_events from anon;

-- An attempt keeps what it was when it started: the user can change only the answer fields, not the lesson, the item,
-- the kind or the first attempt. A record for the researcher is not deleted from the app.
revoke update, delete on public.learning_attempts from authenticated;
grant update (status, prediction, behavior_correct, explanation, explanation_correct, hints_used, reflection, run_id, completed_at)
  on public.learning_attempts to authenticated;

-- An event cannot change after it is saved.
revoke update, delete on public.learning_events from authenticated;

-- Saves a batch of events for the user who calls it. It runs as the caller (security invoker), so row-level security
-- applies. A duplicate (the same ID, or a second completion event for the same record) adds nothing and gives no error.
-- It gives the number of new rows.
create function public.log_learning_events(p_events jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  added int;
begin
  insert into public.learning_events (id, name, lesson_id, lesson_version, attempt_id, run_id, data)
  select e.id, e.name, e.lesson_id, e.lesson_version, e.attempt_id, e.run_id, coalesce(e.data, '{}')
  from jsonb_to_recordset(p_events) as e(id uuid, name text, lesson_id text, lesson_version int, attempt_id uuid, run_id uuid, data jsonb)
  on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end $$;

revoke execute on function public.log_learning_events(jsonb) from public, anon;
grant execute on function public.log_learning_events(jsonb) to authenticated;
