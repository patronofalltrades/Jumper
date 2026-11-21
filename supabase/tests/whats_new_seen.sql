-- SQL test of mark_news_seen (issue #196). It stops with an error at the first wrong result.
-- Run it on a throwaway local Postgres 16 with scripts/sql-tests.sh, never on the live project.
--
-- Two users. A marks spotlights as seen. B does not change. A still cannot write the other profile columns.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local');

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000a1';
  b uuid := '00000000-0000-0000-0000-0000000000b2';
  seen text[];
  failed boolean;
  i int;
begin
  -- A new profile has an empty list.
  select seen_news into seen from public.profiles where id = a;
  assert seen = '{}', format('start list of A: %s', seen);

  -- A marks two items, and one of them two times. Each id is in the list one time.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.mark_news_seen('datasheet-cards');
  perform public.mark_news_seen('share-login');
  perform public.mark_news_seen('datasheet-cards');
  reset role;
  select seen_news into seen from public.profiles where id = a;
  assert seen = array['share-login', 'datasheet-cards'], format('list of A: %s', seen);

  -- B does not change.
  select seen_news into seen from public.profiles where id = b;
  assert seen = '{}', format('list of B: %s', seen);

  -- A bad id is refused.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', a::text, true);
  begin
    perform public.mark_news_seen('Bad ID; drop table x');
    failed := false;
  exception when invalid_parameter_value then failed := true;
  end;
  assert failed, 'a bad id was accepted';

  -- A call with no user changes nothing and fails.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.mark_news_seen('board-hero');
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'a call with no user was accepted';

  -- A cannot write seen_news or xp directly.
  perform set_config('request.jwt.claim.sub', a::text, true);
  begin
    update public.profiles set seen_news = array['x'] where id = a;
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'A wrote seen_news directly';
  begin
    update public.profiles set xp = 9999 where id = a;
    failed := false;
  exception when insufficient_privilege then failed := true;
  end;
  assert failed, 'A wrote xp directly';

  -- The list keeps not more than 100 ids: the newest.
  for i in 1..105 loop
    perform public.mark_news_seen('item-' || i);
  end loop;
  reset role;
  select seen_news into seen from public.profiles where id = a;
  assert cardinality(seen) = 100, format('list length: %s', cardinality(seen));
  assert seen[100] = 'item-105' and not ('share-login' = any(seen)), 'the list did not keep the newest ids';

  -- The grants: only authenticated can run it.
  assert not has_function_privilege('anon', 'public.mark_news_seen(text)', 'execute'), 'anon has execute';
  assert has_function_privilege('authenticated', 'public.mark_news_seen(text)', 'execute'), 'authenticated has no execute';

  raise notice 'whats_new_seen test: all checks pass';
end $$;

rollback;
