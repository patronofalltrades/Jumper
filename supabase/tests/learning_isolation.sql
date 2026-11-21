-- Pilot records test (docs/TRD-learning-journey.md sections 7 and 10). It stops with an error at the first wrong result.
--
-- Given User A has a first attempt and an event of the LED lesson, when User B logs in, then B cannot read, change or
-- delete them, and a visitor who is not logged in reads nothing. It also checks the rules of the records:
-- one first attempt for each item and lesson version, a retry is a new row, a duplicate event adds nothing, and an
-- attempt cannot change its lesson or kind.
--
-- Run it on a throwaway local Postgres 16, never on the live project (see data_isolation.sql for the steps).
-- scripts/sql-tests.sh and CI run it.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

create function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
end $$;

create temp table ids (name text primary key, id uuid);
grant select on ids to authenticated;

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
  first_a uuid;
  ev uuid := '10000000-0000-0000-0000-000000000001';
  n int;
  failed boolean;
begin
  -- User A answers the first prediction of a challenge, and logs the event, as the server actions do.
  perform pg_temp.login(a);
  insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind, prediction)
    values ('af-led', 1, 'move-gnd', 'first', 'stays off') returning id into first_a;
  select public.log_learning_events(jsonb_build_array(jsonb_build_object(
    'id', ev, 'name', 'prediction_submitted', 'lesson_id', 'af-led', 'lesson_version', 1, 'attempt_id', first_a,
    'data', jsonb_build_object('option', 'stays-off', 'scored', true)))) into n;
  assert n = 1, format('the first event added %s rows, not 1', n);

  -- The same event again (a second send after a lost answer) adds nothing and gives no error.
  select public.log_learning_events(jsonb_build_array(jsonb_build_object(
    'id', ev, 'name', 'prediction_submitted', 'lesson_id', 'af-led', 'lesson_version', 1, 'attempt_id', first_a))) into n;
  assert n = 0, format('a duplicate event id added %s rows', n);
  -- A second prediction_submitted for the same attempt, with a new id, adds nothing too (one time only).
  select public.log_learning_events(jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(), 'name', 'prediction_submitted', 'lesson_id', 'af-led', 'lesson_version', 1, 'attempt_id', first_a))) into n;
  assert n = 0, format('a second completion event for one attempt added %s rows', n);
  select count(*) into n from public.learning_events;
  assert n = 1, format('A has %s events, not 1', n);

  -- A second first attempt for the same item and lesson version fails.
  failed := false;
  begin
    insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind) values ('af-led', 1, 'move-gnd', 'first');
  exception when unique_violation then failed := true;
  end;
  assert failed, 'a second first attempt for the same item was saved';

  -- A new lesson version can have its own first attempt.
  insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind) values ('af-led', 2, 'move-gnd', 'first');

  -- A retry is a new row that points to the first attempt. The first attempt does not change.
  insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind, first_attempt_id, prediction)
    values ('af-led', 1, 'move-gnd', 'retry', first_a, 'blinks');
  select count(*) into n from public.learning_attempts where lesson_version = 1 and item_id = 'move-gnd';
  assert n = 2, format('A has %s attempts for the item, not 2 (first and retry)', n);
  assert (select prediction from public.learning_attempts where id = first_a) = 'stays off', 'the retry changed the first attempt';

  -- A retry must name its first attempt.
  failed := false;
  begin
    insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind) values ('af-led', 1, 'move-gnd', 'retry');
  exception when check_violation then failed := true;
  end;
  assert failed, 'a retry with no first attempt was saved';

  -- A completes the first attempt: the answer fields change.
  update public.learning_attempts
    set status = 'complete', completed_at = now(), behavior_correct = true, explanation = 'open loop', explanation_correct = false, hints_used = 1
    where id = first_a;
  get diagnostics n = row_count; assert n = 1, 'A could not complete their own attempt';

  -- A cannot change the lesson or the kind of an attempt, and cannot delete it.
  failed := false;
  begin
    update public.learning_attempts set kind = 'retry' where id = first_a;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'A changed the kind of an attempt';
  failed := false;
  begin
    delete from public.learning_attempts where id = first_a;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'A deleted an attempt';

  -- An event cannot change after it is saved.
  failed := false;
  begin
    update public.learning_events set data = '{"option": "blinks"}' where id = ev;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'A changed an event';
  reset role;
  insert into ids values ('first_a', first_a), ('ev', ev);

  -- User B logs in: B sees no attempt and no event of A.
  perform pg_temp.login(b);
  select count(*) into n from public.learning_attempts;
  assert n = 0, format('B sees %s attempts of A', n);
  select count(*) into n from public.learning_events;
  assert n = 0, format('B sees %s events of A', n);
  select count(*) into n from public.learning_attempts where id = (select id from ids where name = 'first_a');
  assert n = 0, 'B can read the attempt of A by its id';

  -- B cannot change the attempt of A.
  update public.learning_attempts set prediction = 'blinks' where id = (select id from ids where name = 'first_a');
  get diagnostics n = row_count; assert n = 0, 'B changed the attempt of A';

  -- B cannot make a retry that points to the first attempt of A.
  failed := false;
  begin
    insert into public.learning_attempts (lesson_id, lesson_version, item_id, kind, first_attempt_id)
      values ('af-led', 1, 'move-gnd', 'retry', (select id from ids where name = 'first_a'));
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'B made a retry of the attempt of A';

  -- B cannot save a row as A.
  failed := false;
  begin
    insert into public.learning_events (id, user_id, name, lesson_id, lesson_version) values (gen_random_uuid(), a, 'hint_used', 'af-led', 1);
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'B saved an event as A';

  -- The same event id as A, sent by B, adds nothing and does not show the row of A.
  select public.log_learning_events(jsonb_build_array(jsonb_build_object(
    'id', (select id from ids where name = 'ev'), 'name', 'hint_used', 'lesson_id', 'af-led', 'lesson_version', 1))) into n;
  assert n = 0, 'B overwrote or duplicated the event of A';
  reset role;

  -- A visitor who is not logged in reads nothing and cannot log events.
  set local role anon;
  failed := false;
  begin
    select count(*) into n from public.learning_attempts;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed or n = 0, 'a visitor who is not logged in can read attempts';
  failed := false;
  begin
    select count(*) into n from public.learning_events;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed or n = 0, 'a visitor who is not logged in can read events';
  failed := false;
  begin
    perform public.log_learning_events('[]');
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'a visitor who is not logged in can log events';
  reset role;

  -- The rows of A are as A left them.
  assert (select prediction from public.learning_attempts where id = first_a) = 'stays off', 'the attempt of A changed';
  assert (select count(*) from public.learning_events where user_id = a) = 1, 'the events of A changed';

  -- A deletes the account: the cascade removes the records too.
  delete from auth.users where id = a;
  assert not exists (select 1 from public.learning_attempts where user_id = a), 'the attempts of a deleted account stay';
  assert not exists (select 1 from public.learning_events where user_id = a), 'the events of a deleted account stay';

  raise notice 'learning records test: all checks pass';
end $$;

rollback;
