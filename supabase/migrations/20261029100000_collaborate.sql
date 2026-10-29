-- Issue #88: Collaborate. A learner invites a friend by email to one project. After the friend accepts, the friend can
-- look at the snapshots of that project (view only) and write notes on them. The friend cannot change them.
-- Hanif applies this file to the live project himself. It is tested on a throwaway local Postgres:
-- supabase/tests/collaborate.sql.

-- Tables ----------------------------------------------------------------------

-- One row for each invite. The invite names an email, not a user, so the app never tells the owner whether the email
-- has an account. collaborator_id stays empty until the invitee presses Accept.
create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id int not null references public.projects (id),
  invitee_email text not null check (invitee_email = lower(trim(invitee_email)) and invitee_email like '_%@_%'),
  collaborator_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  created_at timestamptz not null default now(),
  unique (owner_id, project_id, invitee_email),
  check ((status = 'joined') = (collaborator_id is not null))
);

create table public.snapshot_notes (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index on public.collaborators (invitee_email);
create index on public.collaborators (collaborator_id);
create index on public.collaborators (project_id);
create index on public.snapshot_notes (snapshot_id, created_at);

alter table public.collaborators enable row level security;
alter table public.snapshot_notes enable row level security;

-- Collaborators ---------------------------------------------------------------

-- The email of the signed-in user, from the token. An invite matches this email.
-- The owner and the invitee read an invite. A joined collaborator reads their own row.
create policy "Owner and invitee read" on public.collaborators for select to authenticated
  using (
    owner_id = (select auth.uid())
    or collaborator_id = (select auth.uid())
    or invitee_email = lower((select auth.jwt() ->> 'email'))
  );

-- The owner invites. A new row is always "invited", has no collaborator yet, and is not for the email of the owner.
create policy "Owner invites" on public.collaborators for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'invited'
    and collaborator_id is null
    and invitee_email <> lower((select auth.jwt() ->> 'email'))
  );

-- The invitee accepts an invite for their own email, and puts their own id on it.
create policy "Invitee accepts" on public.collaborators for update to authenticated
  using (collaborator_id is null and status = 'invited' and invitee_email = lower((select auth.jwt() ->> 'email')))
  with check (
    collaborator_id = (select auth.uid())
    and status = 'joined'
    and invitee_email = lower((select auth.jwt() ->> 'email'))
  );

-- The owner removes a collaborator or an invite. A collaborator leaves. An invitee declines.
create policy "Owner, collaborator or invitee deletes" on public.collaborators for delete to authenticated
  using (
    owner_id = (select auth.uid())
    or collaborator_id = (select auth.uid())
    or (collaborator_id is null and invitee_email = lower((select auth.jwt() ->> 'email')))
  );

-- Only these columns can be written. The owner sets the project and the email; the invitee sets the two Accept columns.
revoke insert, update, delete on public.collaborators from authenticated;
grant insert (project_id, invitee_email) on public.collaborators to authenticated;
grant update (collaborator_id, status) on public.collaborators to authenticated;
grant delete on public.collaborators to authenticated;

-- Snapshots: a joined collaborator reads, and nothing more --------------------

-- Select only. "Owner only" is the only policy for update and delete, so a collaborator cannot change, delete or star
-- (the stars policy needs an own snapshot) a snapshot of the owner. A removed collaborator has no row here, so the
-- access ends at once.
create policy "Joined collaborator reads" on public.snapshots for select to authenticated
  using (
    exists (
      select 1
      from public.collaborators c
      join public.levels l on l.project_id = c.project_id
      where c.collaborator_id = (select auth.uid())
        and c.status = 'joined'
        and c.owner_id = snapshots.user_id
        and l.id = snapshots.level_id
    )
  );

-- Notes -----------------------------------------------------------------------

-- The subquery on snapshots follows the policies of snapshots: the owner and the joined collaborators of that project
-- see the snapshot, so they read the notes and write a note. Nobody else does.
create policy "Readers of the snapshot read notes" on public.snapshot_notes for select to authenticated
  using (exists (select 1 from public.snapshots s where s.id = snapshot_notes.snapshot_id));

create policy "Readers of the snapshot write own notes" on public.snapshot_notes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.snapshots s where s.id = snapshot_notes.snapshot_id)
  );

create policy "Own notes only" on public.snapshot_notes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke update on public.snapshot_notes from authenticated;

-- Names ------------------------------------------------------------------------

-- A person sees the name and the character of the people in the same collaboration: the owner of an invite or of a
-- project they joined, their own collaborators, and the other collaborators of a project they joined. It runs as its
-- owner so that the check does not read the collaborators table through its own policies.
create function public.can_see_profile(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.collaborators c
    where (c.owner_id = p and (c.collaborator_id = (select auth.uid()) or c.invitee_email = lower((select auth.jwt() ->> 'email'))))
       or (c.collaborator_id = p and c.owner_id = (select auth.uid()))
       or (
         c.collaborator_id = p
         and exists (
           select 1 from public.collaborators mine
           where mine.owner_id = c.owner_id
             and mine.project_id = c.project_id
             and mine.collaborator_id = (select auth.uid())
         )
       )
  );
$$;

revoke execute on function public.can_see_profile(uuid) from public, anon;
grant execute on function public.can_see_profile(uuid) to authenticated;

create policy "Collaborators read names" on public.profiles for select to authenticated
  using (public.can_see_profile(id));
