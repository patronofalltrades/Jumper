-- Issue #87: share a build with a public read-only link.
-- The owner turns the switch on or off with the existing "Owner only" policy: it lets the owner change their own rows.
-- A visitor with no log-in cannot read the table. Row-level security stays as it is. The visitor calls one function,
-- which runs as its owner and gives one row only when `shared` is true. The row has the display name of the owner,
-- and never the email or the user id.
alter table public.snapshots add column shared boolean not null default false;

create function public.get_shared_snapshot(p_id uuid)
returns table (
  id uuid,
  title text,
  notes text,
  wiring jsonb,
  passed boolean,
  mistake_count int,
  created_at timestamptz,
  level_position int,
  level_title text,
  project_slug text,
  owner_name text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.notes, s.wiring, s.passed, s.mistake_count, s.created_at,
         l.position, l.title, p.slug, pr.display_name
  from public.snapshots s
  join public.levels l on l.id = s.level_id
  join public.projects p on p.id = l.project_id
  left join public.profiles pr on pr.id = s.user_id
  where s.id = p_id and s.shared;
$$;

revoke execute on function public.get_shared_snapshot(uuid) from public;
grant execute on function public.get_shared_snapshot(uuid) to anon, authenticated;
