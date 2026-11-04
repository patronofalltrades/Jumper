-- SQL test of the code XP in record_attempt (issue #145). It stops with an error at the first wrong result.
-- Run it with scripts/sql-tests.sh record_attempt_code_xp, on a throwaway local Postgres 16, never on the live project.
--
-- The test makes a small level (2 tasks of 10 XP, level XP 50), as record_attempt_replay.sql does.
-- p_code_xp: 20 for a sketch that the learner wrote, 0 for a sketch from "Write it for me". The server gives it only on
-- the first pass of the level, and never more than 20.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values ('t', 'T', 't', 'b', 'available', 1);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 1, 'L', 'g', '{"require":[],"forbid":[]}', 50 from public.projects where slug = 't';
insert into public.tasks (level_id, position, kind, instruction, popup_why, target, source_url, xp)
  select id, p, 'wire', 'i', 'w', '{}', 'u', 10 from public.levels, generate_series(1, 2) p;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b2';
  c uuid := '00000000-0000-0000-0000-0000000000c3';
  d uuid := '00000000-0000-0000-0000-0000000000d4';
  lvl int := (select id from public.levels limit 1);
  s uuid; r jsonb; n int;
begin
  set local role authenticated;

  -- User A writes the sketch: 20 task + 20 code + 50 level + 10 bonus (no mistakes, no fails).
  perform set_config('request.jwt.claim.sub', a::text, true);
  insert into public.sessions (level_id) values (lvl) returning id into s;
  r := public.record_attempt(s, true, null, 2, 0, 20, 20);
  select xp into n from public.profiles where id = a;
  assert n = 100, format('first pass with a written sketch: %s', n);
  select xp_earned into n from public.sessions where id = s;
  assert n = 100, format('session XP with a written sketch: %s', n);

  -- A replay of user A gives no XP, also with the code XP.
  insert into public.sessions (level_id) values (lvl) returning id into s;
  r := public.record_attempt(s, true, null, 2, 0, 20, 20);
  select xp into n from public.profiles where id = a;
  assert n = 100, format('XP after a replay: %s', n);
  select xp_earned into n from public.sessions where id = s;
  assert n = 0, format('replay session XP: %s', n);

  -- User B used "Write it for me": 0 code XP. The wiring XP stays: 20 task + 50 level + 10 bonus.
  perform set_config('request.jwt.claim.sub', b::text, true);
  insert into public.sessions (level_id) values (lvl) returning id into s;
  r := public.record_attempt(s, true, null, 2, 0, 20, 0);
  select xp into n from public.profiles where id = b;
  assert n = 80, format('first pass with Write it for me: %s', n);

  -- User C sends too much code XP: the server gives 20 at most. A call with no code XP (the old app) gives 0.
  perform set_config('request.jwt.claim.sub', c::text, true);
  insert into public.sessions (level_id) values (lvl) returning id into s;
  r := public.record_attempt(s, true, null, 2, 0, 20, 500);
  select xp into n from public.profiles where id = c;
  assert n = 100, format('code XP more than 20: %s', n);
  perform set_config('request.jwt.claim.sub', d::text, true);
  insert into public.sessions (level_id) values (lvl) returning id into s;
  r := public.record_attempt(s, true, null, 2, 0, 20);
  select xp into n from public.profiles where id = d;
  assert n = 80, format('a call with no code XP: %s', n);

  reset role;
  assert not has_function_privilege('anon', 'public.record_attempt(uuid,boolean,text,int,int,int,int)', 'execute'), 'anon can call record_attempt';
  assert has_function_privilege('authenticated', 'public.record_attempt(uuid,boolean,text,int,int,int,int)', 'execute'), 'authenticated cannot call record_attempt';
  assert (select count(*) from pg_proc where proname = 'record_attempt') = 1, 'the old record_attempt with 6 values is still there';
  raise notice 'record_attempt code XP test: all checks pass';
end $$;

rollback;
