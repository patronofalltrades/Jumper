-- SQL test of snapshots.shared and get_shared_snapshot (issue #87). It stops with an error at the first wrong result.
--
-- Run it on a throwaway local Postgres 16, never on the live project (same steps as delete_my_account.sql):
--   1. Start a private server and make a database.
--   2. psql -v ON_ERROR_STOP=1 -f supabase/tests/local-setup.sql      (stub roles and auth schema)
--   3. psql -v ON_ERROR_STOP=1 -f each file in supabase/migrations/, in order
--   4. psql -v ON_ERROR_STOP=1 -f supabase/tests/get_shared_snapshot.sql
--
-- User A has two snapshots: one shared and one not. A visitor with no log-in (role anon) asks for them.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a-secret@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values ('t', 'T', 't', 'b', 'available', 1);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 3, 'Level three', 'g', '{"require":[],"forbid":[]}', 50 from public.projects where slug = 't';
update public.profiles set display_name = 'Ada' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.snapshots (id, user_id, level_id, title, notes, wiring, passed, mistake_count, shared)
  select '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', id, 'Open one', 'note', '{"version":1,"parts":[]}', true, 2, true
  from public.levels;
insert into public.snapshots (id, user_id, level_id, title, wiring)
  select '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', id, 'Private one', '{"version":1,"parts":[]}'
  from public.levels;

do $$
declare
  shared_id uuid := '10000000-0000-0000-0000-000000000001';
  private_id uuid := '10000000-0000-0000-0000-000000000002';
  r record;
  n int;
  cols text;
begin
  -- The column is off by default.
  assert (select shared from public.snapshots where id = private_id) = false, 'shared is not false by default';

  set local role anon;

  -- A shared snapshot gives one row, with the level title, the project slug and the display name of the owner.
  select * into r from public.get_shared_snapshot(shared_id);
  assert found, 'no row for a shared snapshot';
  assert r.title = 'Open one' and r.notes = 'note' and r.passed and r.mistake_count = 2, 'wrong snapshot fields';
  assert r.level_position = 3 and r.level_title = 'Level three' and r.project_slug = 't', 'wrong level or project';
  assert r.owner_name = 'Ada', format('owner name: %s', r.owner_name);

  -- A snapshot that is not shared gives no row.
  select count(*) into n from public.get_shared_snapshot(private_id);
  assert n = 0, format('rows for a private snapshot: %s', n);

  -- An unknown id gives no row.
  select count(*) into n from public.get_shared_snapshot('99999999-9999-9999-9999-999999999999');
  assert n = 0, format('rows for an unknown id: %s', n);

  -- The result has no email and no user id.
  select string_agg(column_name, ',') into cols
    from (select unnest(proargnames) as column_name from pg_proc where proname = 'get_shared_snapshot') c;
  assert cols !~* 'email' and cols !~* 'user_id', format('private column in the result: %s', cols);

  -- The tables stay closed: a visitor reads no snapshot directly.
  select count(*) into n from public.snapshots;
  assert n = 0, format('anon reads %s snapshots directly', n);
  reset role;

  -- The owner turns the switch off: the same id gives no row.
  update public.snapshots set shared = false where id = shared_id;
  set local role anon;
  select count(*) into n from public.get_shared_snapshot(shared_id);
  assert n = 0, format('rows after the switch went off: %s', n);
  reset role;

  -- A deleted snapshot gives no row.
  update public.snapshots set shared = true where id = shared_id;
  delete from public.snapshots where id = shared_id;
  set local role anon;
  select count(*) into n from public.get_shared_snapshot(shared_id);
  assert n = 0, format('rows after the delete: %s', n);
  reset role;

  -- The function sets its search_path, and anon and authenticated can run it.
  assert (select proconfig::text from pg_proc where proname = 'get_shared_snapshot') like '%search_path%', 'no search_path';
  assert has_function_privilege('anon', 'public.get_shared_snapshot(uuid)', 'execute'), 'anon has no execute';
  assert has_function_privilege('authenticated', 'public.get_shared_snapshot(uuid)', 'execute'), 'authenticated has no execute';
end $$;

rollback;
