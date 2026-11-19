-- Issue #183: a share link needs a log-in. Before this, a visitor with no log-in (role anon) could call
-- get_shared_snapshot (issue #87). Now only a logged-in user (role authenticated) can call it.
-- The function, the `shared` switch and row-level security do not change.
revoke execute on function public.get_shared_snapshot(uuid) from anon;
