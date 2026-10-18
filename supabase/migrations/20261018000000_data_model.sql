-- Feature 2: data model (issue #11). Tables from TRD section 7.
-- Content tables: projects, levels, tasks. All logged-in users read them. Only the seed script (secret key) writes them.
-- User tables: profiles, sessions, attempts, snapshots, stars. Each user reads and writes only their own rows.

-- Content -------------------------------------------------------------------

create table public.projects (
  id int generated always as identity primary key,
  slug text not null unique,
  title text not null,
  tagline text not null,
  board text not null,
  status text not null check (status in ('available', 'coming_soon')),
  position int not null
);

create table public.levels (
  id int generated always as identity primary key,
  project_id int not null references public.projects (id) on delete cascade,
  position int not null,
  title text not null,
  goal text not null,
  rules jsonb not null,
  xp int not null default 0,
  unique (project_id, position)
);

create table public.tasks (
  id int generated always as identity primary key,
  level_id int not null references public.levels (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('place', 'wire')),
  instruction text not null,
  popup_why text not null,
  concept text,
  target jsonb not null,
  source_url text not null,
  xp int not null default 0,
  unique (level_id, position)
);

-- User data -----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  xp int not null default 0,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level_id int not null references public.levels (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  tasks_done int not null default 0,
  mistakes int not null default 0,
  xp_earned int not null default 0
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  level_id int not null references public.levels (id),
  passed boolean not null,
  mistake_type text,
  created_at timestamptz not null default now()
);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level_id int not null references public.levels (id),
  session_id uuid references public.sessions (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  notes text not null default '',
  wiring jsonb not null,
  passed boolean not null default false,
  mistake_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stars (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  snapshot_id uuid not null references public.snapshots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, snapshot_id)
);

create index on public.sessions (user_id, started_at desc);
create index on public.attempts (user_id, created_at);
create index on public.attempts (session_id);
create index on public.snapshots (user_id, created_at desc);
create index on public.stars (snapshot_id);

-- snapshots.updated_at follows each edit.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger snapshots_set_updated_at before update on public.snapshots
for each row execute function public.set_updated_at();

-- Profiles ------------------------------------------------------------------

-- Each new account gets a profile row.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Accounts made before this migration (feature 1) get a profile row too.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- Row-level security ----------------------------------------------------------

alter table public.projects enable row level security;
alter table public.levels enable row level security;
alter table public.tasks enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.snapshots enable row level security;
alter table public.stars enable row level security;

-- Content: read only for logged-in users. No write policy, so the app cannot write.
create policy "Logged-in users read projects" on public.projects for select to authenticated using (true);
create policy "Logged-in users read levels" on public.levels for select to authenticated using (true);
create policy "Logged-in users read tasks" on public.tasks for select to authenticated using (true);

-- User data: owner only, for select, insert, update and delete.
create policy "Owner only" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Owner only" on public.sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner only" on public.attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner only" on public.snapshots for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- A foreign key check ignores row-level security, so also make sure that the starred snapshot is the user's own.
create policy "Owner only" on public.stars for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.snapshots s where s.id = snapshot_id and s.user_id = (select auth.uid()))
  );
