-- Issue #78: a learner deletes their own account.
-- The function runs as its owner, because users cannot write to auth.users. It deletes only the row of the user who
-- calls it (auth.uid()). The cascade then removes the profile, sessions, attempts, snapshots and stars. A call with
-- no user in the token deletes nothing.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
