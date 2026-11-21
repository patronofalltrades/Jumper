-- "What's new" spotlights (issue #196): the spotlights that a logged-in learner closed with "Got it".
-- The ids are the items in content/news.json. A visitor who is not logged in keeps them in the browser.

alter table public.profiles add column seen_news text[] not null default '{}';

-- A learner cannot write profiles.seen_news directly (20261019000000_profile.sql gives update on display_name and
-- avatar only). This function adds one id for the user who calls it. It runs as its owner to write the column, and it
-- writes only the row of auth.uid(). The id format is checked, the list has each id one time, and it keeps not more
-- than 100 ids.
create function public.mark_news_seen(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ids text[];
begin
  if auth.uid() is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if p_id is null or p_id !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'bad news id' using errcode = '22023';
  end if;
  select array_append(array_remove(seen_news, p_id), p_id) into ids from public.profiles where id = auth.uid();
  -- Keep the 100 newest ids.
  update public.profiles set seen_news = ids[greatest(cardinality(ids) - 99, 1):] where id = auth.uid();
end $$;

revoke execute on function public.mark_news_seen(text) from public, anon;
grant execute on function public.mark_news_seen(text) to authenticated;
