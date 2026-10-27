-- SQL test of delete_my_account (issue #78). It stops with an error at the first wrong result.
--
-- Run it on a throwaway local Postgres 16, never on the live project (same steps as record_attempt_replay.sql):
--   1. Start a private server and make a database.
--   2. psql -v ON_ERROR_STOP=1 -f supabase/tests/local-setup.sql      (stub roles and auth schema)
--   3. psql -v ON_ERROR_STOP=1 -f each file in supabase/migrations/, in order
--   4. psql -v ON_ERROR_STOP=1 -f supabase/tests/delete_my_account.sql
--
-- Two users each have a session, an attempt, a snapshot and a star. User A deletes their account.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values ('t', 'T', 't', 'b', 'available', 1);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 1, 'L', 'g', '{"require":[],"forbid":[]}', 50 from public.projects where slug = 't';

-- The rows of each user, made as that user.
do $$
declare
  u uuid;
  lvl int := (select id from public.levels limit 1);
  s uuid; snap uuid;
begin
  foreach u in array array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2']::uuid[] loop
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u::text, true);
    insert into public.sessions (level_id) values (lvl) returning id into s;
    insert into public.attempts (session_id, level_id, passed) values (s, lvl, false);
    insert into public.snapshots (level_id, session_id, title, wiring) values (lvl, s, 's', '{}') returning id into snap;
    insert into public.stars (snapshot_id) values (snap);
    reset role;
  end loop;
  update public.profiles set xp = 70 where id = '00000000-0000-0000-0000-0000000000b2';
end $$;

create temp table counts as
select 'auth.users' t, id, 1 n from auth.users
union all select 'profiles', id, 1 from public.profiles
union all select 'sessions', user_id, 1 from public.sessions
union all select 'attempts', user_id, 1 from public.attempts
union all select 'snapshots', user_id, 1 from public.snapshots
union all select 'stars', user_id, 1 from public.stars;
grant select on counts to anon, authenticated;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b2';
  n int; t text; b_xp int;
begin
  select count(*) into n from counts where id = a;
  assert n = 6, format('rows of A before: %s', n);
  select count(*) into n from counts where id = b;
  assert n = 6, format('rows of B before: %s', n);

  -- A visitor with no log-in cannot call the function.
  set local role anon;
  begin
    perform public.delete_my_account();
    assert false, 'anon could call delete_my_account';
  exception when insufficient_privilege then null;
  end;
  reset role;
  select count(*) into n from auth.users;
  assert n = 2, format('users after the anon call: %s', n);

  -- A logged-in user with no sub in the token deletes nothing.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.delete_my_account();
  reset role;
  select count(*) into n from auth.users;
  assert n = 2, format('users after a call with no user: %s', n);

  -- A deletes their own account.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.delete_my_account();
  reset role;

  foreach t in array array['auth.users', 'profiles', 'sessions', 'attempts', 'snapshots', 'stars'] loop
    execute format('select count(*) from %s where %s = $1', t,
      case t when 'auth.users' then 'id' when 'profiles' then 'id' else 'user_id' end) into n using a;
    assert n = 0, format('rows of A left in %s: %s', t, n);
  end loop;

  -- B does not change.
  foreach t in array array['auth.users', 'profiles', 'sessions', 'attempts', 'snapshots', 'stars'] loop
    execute format('select count(*) from %s where %s = $1', t,
      case t when 'auth.users' then 'id' when 'profiles' then 'id' else 'user_id' end) into n using b;
    assert n = 1, format('rows of B in %s: %s', t, n);
  end loop;
  select xp into b_xp from public.profiles where id = b;
  assert b_xp = 70, format('XP of B: %s', b_xp);

  -- The grants: only authenticated can run it.
  assert not has_function_privilege('anon', 'public.delete_my_account()', 'execute'), 'anon has execute';
  assert has_function_privilege('authenticated', 'public.delete_my_account()', 'execute'), 'authenticated has no execute';
end $$;

rollback;
