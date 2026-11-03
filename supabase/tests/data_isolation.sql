-- Data isolation test (PLAN.md section 4, test 1; issue #137). It stops with an error at the first wrong result.
--
-- Given User A has saved a snapshot titled "Ears wired", when User B logs in and opens their snapshot list or
-- requests A's snapshot by its ID, then B's list is empty and the direct request returns "not found".
--
-- The queries are the queries of the snapshot pages, in SQL:
--   list:  app/snapshots/page.tsx       from("snapshots").select(...).eq("user_id", <user id from the log-in>)
--   by id: app/snapshots/[id]/page.tsx  from("snapshots").select(...).eq("id", id).maybeSingle(); no row -> notFound()
-- The app has no listSnapshots or getSnapshot function.
--
-- A joined collaborator of A can see A's snapshots of that project (issue #88). supabase/tests/collaborate.sql checks
-- that case and the users who are not joined collaborators. This file does not repeat those checks.
--
-- Run it on a throwaway local Postgres 16, never on the live project. CI runs it too (.github/workflows/ci.yml):
--   1. Start a private server and make a database.
--   2. psql -v ON_ERROR_STOP=1 -f supabase/tests/local-setup.sql      (stub roles, auth schema, auth.uid())
--   3. psql -v ON_ERROR_STOP=1 -f each file in supabase/migrations/, in order
--   4. psql -v ON_ERROR_STOP=1 -f supabase/tests/data_isolation.sql

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values ('perch-test', 'Perch', 't', 'b', 'available', 1);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 3, 'Ears', 'g', '{"require":[],"forbid":[]}', 50 from public.projects where slug = 'perch-test';

-- Acts as a logged-in user with this id. Call it while the role is the owner of the test (after reset role).
create function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
end $$;

-- The id of the snapshot of A. Only the test owner reads it, as an attacker who knows the id.
create temp table ids (name text primary key, id uuid);
grant select on ids to authenticated;

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
  snap uuid;
  n int;
begin
  -- User A saves the snapshot "Ears wired", as the Save snapshot action does (the user's own client, with RLS).
  perform pg_temp.login(a);
  insert into public.snapshots (user_id, level_id, title, notes, wiring)
    select a, l.id, 'Ears wired', 'Mic on GPIO 4.', '{}' from public.levels l
    join public.projects p on p.id = l.project_id where p.slug = 'perch-test'
    returning id into snap;
  reset role;
  insert into ids values ('ears', snap);

  -- The same queries give the snapshot to A, so the test data is correct.
  perform pg_temp.login(a);
  select count(*) into n from public.snapshots s left join public.levels l on l.id = s.level_id
    where s.user_id = a;
  assert n = 1, format('A sees %s snapshots in their list, not 1', n);
  assert exists (select 1 from public.snapshots where id = snap), 'A cannot open their own snapshot by its id';
  reset role;

  -- User B logs in and opens the snapshot list: it is empty.
  perform pg_temp.login(b);
  select count(*) into n from public.snapshots s left join public.levels l on l.id = s.level_id
    where s.user_id = b;
  assert n = 0, format('B sees %s snapshots in their list, not 0', n);

  -- User B requests the snapshot of A by its id: no row, so the page shows "not found".
  select count(*) into n from public.snapshots where id = (select id from ids where name = 'ears');
  assert n = 0, 'B can open the snapshot "Ears wired" of A by its id';

  -- B also cannot find it by its title, or change or delete it.
  select count(*) into n from public.snapshots where title = 'Ears wired';
  assert n = 0, 'B can find the snapshot "Ears wired" of A by its title';
  update public.snapshots set title = 'mine now' where id = (select id from ids where name = 'ears');
  get diagnostics n = row_count; assert n = 0, 'B changed the snapshot of A';
  delete from public.snapshots where id = (select id from ids where name = 'ears');
  get diagnostics n = row_count; assert n = 0, 'B deleted the snapshot of A';
  reset role;

  -- A visitor who is not logged in gets nothing either.
  set local role anon;
  select count(*) into n from public.snapshots;
  assert n = 0, format('a visitor who is not logged in sees %s snapshots', n);
  reset role;

  assert (select title from public.snapshots where id = snap) = 'Ears wired', 'the snapshot of A changed';
  raise notice 'data isolation test: all checks pass';
end $$;

rollback;
