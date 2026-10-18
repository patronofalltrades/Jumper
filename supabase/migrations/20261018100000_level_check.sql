-- Feature 5a: level check (issue #25). The browser does the check; this function records the result (TRD 8.1).
-- A failed Check adds an attempt with its mistake type. A passed Check, in the same transaction, adds the attempt,
-- sets the session to completed, and adds XP: the task XP, the level XP, and 10 XP more with no mistakes and no
-- failed Check. Then the total goes into the profile.
-- security invoker: row-level security applies, so a user reaches only their own session, attempts and profile.

create function public.record_attempt(
  p_session uuid,
  p_passed boolean,
  p_mistake_type text,
  p_tasks_done int,
  p_mistakes int,
  p_task_xp int
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
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
  -- A passed session stays as it is: a second Check does not add XP again.
  if s.status = 'completed' then
    return jsonb_build_object('completed', true, 'fails', 0);
  end if;
  if s.status <> 'in_progress' then
    raise exception 'Session is not in progress';
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
  select l.xp into level_xp from public.levels l where l.id = s.level_id;
  total := least(greatest(p_task_xp, 0), task_xp) + level_xp + case when p_mistakes = 0 and fails = 0 then 10 else 0 end;

  update public.sessions
  set status = 'completed', ended_at = now(), tasks_done = p_tasks_done, mistakes = greatest(p_mistakes, 0), xp_earned = total
  where id = s.id;
  update public.profiles set xp = xp + total where id = s.user_id;

  return jsonb_build_object('completed', true, 'fails', fails);
end $$;

revoke execute on function public.record_attempt(uuid, boolean, text, int, int, int) from public, anon;
grant execute on function public.record_attempt(uuid, boolean, text, int, int, int) to authenticated;
