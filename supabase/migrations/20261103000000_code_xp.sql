-- Issue #145: the code step of a level gives XP. record_attempt gets one more value, p_code_xp: 20 for a sketch that
-- the learner wrote, 0 for a sketch from "Write it for me". The server adds at most 20, and only on the first pass of the
-- level (the same rule as the task XP, issue #62). The code step is not a row in tasks, so the task XP cap does not
-- include it. No table or column changes (Hanif's decision, Nov 3).
-- p_code_xp has the default 0, so a call with the 6 old values still works and gives no code XP. The function with 6
-- values goes, so there is only one record_attempt. It stays security definer, with the same grants.

drop function public.record_attempt(uuid, boolean, text, int, int, int);

create function public.record_attempt(
  p_session uuid,
  p_passed boolean,
  p_mistake_type text,
  p_tasks_done int,
  p_mistakes int,
  p_task_xp int,
  p_code_xp int default 0
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions%rowtype;
  task_count int;
  task_xp int;
  level_xp int;
  fails int;
  total int;
begin
  if p_passed = (p_mistake_type is not null) then
    raise exception 'A passed attempt has no mistake type. A failed attempt has one.';
  end if;

  select * into s from public.sessions where id = p_session and user_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if s.status <> 'in_progress' then
    raise exception 'session closed' using errcode = 'JS001';
  end if;

  insert into public.attempts (session_id, level_id, passed, mistake_type)
  values (s.id, s.level_id, p_passed, p_mistake_type);
  select count(*) into fails from public.attempts a where a.session_id = s.id and not a.passed;

  if not p_passed then
    return jsonb_build_object('completed', false, 'fails', fails);
  end if;

  -- A level passes only when all its tasks are done (TRD 7). The task XP cannot be more than the tasks give.
  select count(*), coalesce(sum(t.xp), 0) into task_count, task_xp from public.tasks t where t.level_id = s.level_id;
  if p_tasks_done < task_count then
    raise exception 'Not all tasks are done';
  end if;

  -- The profile row is the lock: two passes of one user on one level cannot both be the first.
  perform 1 from public.profiles where id = s.user_id for update;
  if exists (
    select 1 from public.sessions o
    where o.user_id = s.user_id and o.level_id = s.level_id and o.status = 'completed' and o.id <> s.id
  ) then
    total := 0;
  else
    select l.xp into level_xp from public.levels l where l.id = s.level_id;
    -- The code step (issue #145) is not a row in tasks, so its XP comes on its own: 20 at most.
    total := least(greatest(p_task_xp, 0), task_xp) + least(greatest(p_code_xp, 0), 20) + level_xp
      + case when p_mistakes = 0 and fails = 0 then 10 else 0 end;
  end if;

  update public.sessions
  set status = 'completed', ended_at = now(), tasks_done = p_tasks_done, mistakes = greatest(p_mistakes, 0), xp_earned = total
  where id = s.id;
  update public.profiles set xp = xp + total where id = s.user_id;

  return jsonb_build_object('completed', true, 'fails', fails);
end $$;

revoke execute on function public.record_attempt(uuid, boolean, text, int, int, int, int) from public, anon;
grant execute on function public.record_attempt(uuid, boolean, text, int, int, int, int) to authenticated;
