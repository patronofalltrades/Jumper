-- SQL test of record_attempt on a completed session (issue #62). It stops with an error at the first wrong result.
--
-- Run it on a throwaway local Postgres 16, never on the live project:
--   1. Start a private server and make a database.
--   2. psql -v ON_ERROR_STOP=1 -f supabase/tests/local-setup.sql      (stub roles and auth schema)
--   3. psql -v ON_ERROR_STOP=1 -f each file in supabase/migrations/, in order
--   4. psql -v ON_ERROR_STOP=1 -f supabase/tests/record_attempt_replay.sql
--
-- The test makes a small level (2 tasks of 10 XP, level XP 50), so the numbers do not depend on the Perch content.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values ('t', 'T', 't', 'b', 'available', 1);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 1, 'L', 'g', '{"require":[],"forbid":[]}', 50 from public.projects where slug = 't';
insert into public.tasks (level_id, position, kind, instruction, popup_why, target, source_url, xp)
  select id, p, 'wire', 'i', 'w', '{}', 'u', 10 from public.levels, generate_series(1, 2) p;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b2';
  lvl int := (select id from public.levels limit 1);
  s1 uuid; s2 uuid; r jsonb; state text; n int;

  profile_xp int;
begin
  -- Everything below runs as a logged-in user (row-level security applies).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', a::text, true);

  -- First sitting: fail, fail, pass.
  insert into public.sessions (level_id) values (lvl) returning id into s1;
  r := public.record_attempt(s1, false, 'wrong_pin', 2, 0, 20);
  assert r = '{"completed": false, "fails": 1}', format('fail 1: %s', r);
  r := public.record_attempt(s1, false, 'wrong_pin', 2, 0, 20);
  assert r = '{"completed": false, "fails": 2}', format('fail 2: %s', r);
  r := public.record_attempt(s1, true, null, 2, 0, 20);
  assert r = '{"completed": true, "fails": 2}', format('pass: %s', r);
  select xp into profile_xp from public.profiles where id = a;
  assert profile_xp = 70, format('first pass XP (20 task + 50 level, no bonus after fails): %s', profile_xp);
  select count(*) into n from public.attempts where session_id = s1;
  assert n = 3, format('attempts after first sitting: %s', n);

  -- A Check on the completed session is refused with its own code. It adds no attempt and no XP.
  begin
    r := public.record_attempt(s1, false, 'wrong_pin', 2, 0, 20);
    assert false, format('a failed Check on a completed session gave %s', r);
  exception when sqlstate 'JS001' then
    get stacked diagnostics state = message_text;
    assert state = 'session closed', format('message: %s', state);
  end;
  begin
    r := public.record_attempt(s1, true, null, 2, 0, 20);
    assert false, format('a passed Check on a completed session gave %s', r);
  exception when sqlstate 'JS001' then null;
  end;
  select count(*) into n from public.attempts where session_id = s1;
  assert n = 3, format('attempts after refused Checks: %s', n);
  select xp into profile_xp from public.profiles where id = a;
  assert profile_xp = 70, format('XP after refused Checks: %s', profile_xp);

  -- Replay: a new session. A fail is saved, and the session stays open.
  insert into public.sessions (level_id) values (lvl) returning id into s2;
  r := public.record_attempt(s2, false, 'missing_ground', 2, 0, 20);
  assert r = '{"completed": false, "fails": 1}', format('replay fail: %s', r);
  select status into state from public.sessions where id = s2;
  assert state = 'in_progress', format('replay session after a fail: %s', state);
  select count(*) into n from public.attempts where session_id = s2;
  assert n = 1, format('replay attempts: %s', n);

  -- Replay pass: the session completes, but it gives no XP (only the first pass of a level does).
  r := public.record_attempt(s2, true, null, 2, 0, 20);
  assert r = '{"completed": true, "fails": 1}', format('replay pass: %s', r);
  select status || '/' || xp_earned into state from public.sessions where id = s2;
  assert state = 'completed/0', format('replay session: %s', state);
  select xp into profile_xp from public.profiles where id = a;
  assert profile_xp = 70, format('XP after replay pass: %s', profile_xp);
  select count(*) into n from public.attempts where user_id = a and level_id = lvl;
  assert n = 5, format('attempts in total: %s', n);

  -- A session that is not in progress (abandoned) is closed too.
  insert into public.sessions (level_id, status) values (lvl, 'abandoned') returning id into s2;
  begin
    r := public.record_attempt(s2, false, 'wrong_pin', 0, 0, 0);
    assert false, format('an abandoned session gave %s', r);
  exception when sqlstate 'JS001' then null;
  end;

  -- Another user cannot reach the session of user A.
  perform set_config('request.jwt.claim.sub', b::text, true);
  begin
    r := public.record_attempt(s1, false, 'wrong_pin', 2, 0, 20);
    assert false, format('user B reached the session of A: %s', r);
  exception when sqlstate 'P0002' then null;
  end;

  -- A first pass of user B on the same level still gets XP (the check is for each user).
  insert into public.sessions (level_id) values (lvl) returning id into s2;
  r := public.record_attempt(s2, true, null, 2, 0, 20);
  select xp into profile_xp from public.profiles where id = b;
  assert profile_xp = 80, format('user B first pass XP (20 + 50 + 10 bonus): %s', profile_xp);

  reset role;
  assert not has_function_privilege('anon', 'public.record_attempt(uuid,boolean,text,int,int,int)', 'execute'), 'anon can call record_attempt';
  assert has_function_privilege('authenticated', 'public.record_attempt(uuid,boolean,text,int,int,int)', 'execute'), 'authenticated cannot call record_attempt';
  raise notice 'record_attempt replay test: all checks pass';
end $$;

rollback;
