-- SQL test of Collaborate (issue #88). It stops with an error at the first wrong result.
--
-- Run it on a throwaway local Postgres 16, never on the live project (same steps as delete_my_account.sql):
--   1. Start a private server and make a database.
--   2. psql -v ON_ERROR_STOP=1 -f supabase/tests/local-setup.sql      (stub roles, auth schema and auth.jwt())
--   3. psql -v ON_ERROR_STOP=1 -f each file in supabase/migrations/, in order
--   4. psql -v ON_ERROR_STOP=1 -f supabase/tests/collaborate.sql
--
-- Users: O (owner), C (collaborator), I (invited, has not joined), S (no invite), O2 (another owner).
-- Snapshots: s1 (O, project A), s2 (O, project B), s3 (O2, project A).

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'o@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'c@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'i@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 's@test.local'),
  ('00000000-0000-0000-0000-0000000000e5', 'o2@test.local');
insert into public.projects (slug, title, tagline, board, status, position) values
  ('pa', 'A', 't', 'b', 'available', 1), ('pb', 'B', 't', 'b', 'available', 2);
insert into public.levels (project_id, position, title, goal, rules, xp)
  select id, 1, 'L', 'g', '{"require":[],"forbid":[]}', 50 from public.projects;

-- Acts as a logged-in user with this id and email. Call it while the role is the owner of the test (after reset role).
create function pg_temp.login(u uuid, e text) returns void language plpgsql as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'email', e)::text, true);
end $$;

create temp table ids (name text primary key, id uuid);
insert into ids values ('s1', gen_random_uuid()), ('s2', gen_random_uuid()), ('s3', gen_random_uuid());
grant select on ids to anon, authenticated;
insert into public.snapshots (id, user_id, level_id, title, wiring)
  select (select id from ids where name = 's1'), '00000000-0000-0000-0000-0000000000a1',
         (select l.id from public.levels l join public.projects p on p.id = l.project_id where p.slug = 'pa'), 's1', '{}';
insert into public.snapshots (id, user_id, level_id, title, wiring)
  select (select id from ids where name = 's2'), '00000000-0000-0000-0000-0000000000a1',
         (select l.id from public.levels l join public.projects p on p.id = l.project_id where p.slug = 'pb'), 's2', '{}';
insert into public.snapshots (id, user_id, level_id, title, wiring)
  select (select id from ids where name = 's3'), '00000000-0000-0000-0000-0000000000e5',
         (select l.id from public.levels l join public.projects p on p.id = l.project_id where p.slug = 'pa'), 's3', '{}';

do $$
declare
  o uuid := '00000000-0000-0000-0000-0000000000a1';
  c uuid := '00000000-0000-0000-0000-0000000000b2';
  i uuid := '00000000-0000-0000-0000-0000000000c3';
  s uuid := '00000000-0000-0000-0000-0000000000d4';
  o2 uuid := '00000000-0000-0000-0000-0000000000e5';
  pa int := (select id from public.projects where slug = 'pa');
  s1 uuid := (select id from ids where name = 's1');
  s2 uuid := (select id from ids where name = 's2');
  s3 uuid := (select id from ids where name = 's3');
  inv_c uuid; inv_i uuid; note_c uuid; note_o uuid;
  n int; t text;
begin
  -- The owner invites two emails. An account is not necessary: the insert never reads auth.users.
  perform pg_temp.login(o, 'o@test.local');
  insert into public.collaborators (project_id, invitee_email) values (pa, 'c@test.local') returning id into inv_c;
  insert into public.collaborators (project_id, invitee_email) values (pa, 'i@test.local') returning id into inv_i;
  insert into public.collaborators (project_id, invitee_email) values (pa, 'nobody@test.local');
  reset role;

  -- The owner cannot invite their own email, make a joined row, or invite twice.
  perform pg_temp.login(o, 'o@test.local');
  begin
    insert into public.collaborators (project_id, invitee_email) values (pa, 'o@test.local');
    assert false, 'owner invited their own email';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.collaborators (project_id, invitee_email, status, collaborator_id) values (pa, 'x@test.local', 'joined', s);
    assert false, 'owner made a joined row';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.collaborators (project_id, invitee_email) values (pa, 'c@test.local');
    assert false, 'owner invited the same email twice';
  exception when unique_violation then null;
  end;
  begin
    insert into public.collaborators (owner_id, project_id, invitee_email) values (o2, pa, 'x@test.local');
    assert false, 'owner made an invite in the name of another owner';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- An invite is visible to its owner and to the invitee (by email), and to nobody else.
  perform pg_temp.login(o, 'o@test.local');
  select count(*) into n from public.collaborators; assert n = 3, format('owner sees %s invites', n);
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  select count(*) into n from public.collaborators; assert n = 1, format('C sees %s invites', n);
  reset role;
  perform pg_temp.login(i, 'I@Test.Local');
  select count(*) into n from public.collaborators; assert n = 1, format('I sees %s invites (email case)', n);
  reset role;
  perform pg_temp.login(s, 's@test.local');
  select count(*) into n from public.collaborators; assert n = 0, format('S sees %s invites', n);
  reset role;
  set local role anon;
  select count(*) into n from public.collaborators; assert n = 0, format('anon sees %s invites', n);
  reset role;

  -- Before Accept, nobody but the owner sees the snapshots of O.
  foreach t in array array['c', 'i', 's'] loop
    perform pg_temp.login((select id from auth.users where email = t || '@test.local'), t || '@test.local');
    select count(*) into n from public.snapshots where user_id = o;
    assert n = 0, format('%s sees %s snapshots of O before Accept', t, n);
    reset role;
  end loop;
  perform pg_temp.login(o, 'o@test.local');
  select count(*) into n from public.snapshots where user_id = o; assert n = 2, format('owner sees %s own snapshots', n);
  reset role;

  -- Accept: only the invitee, only for their own invite, only with their own id.
  perform pg_temp.login(i, 'i@test.local');
  update public.collaborators set collaborator_id = i, status = 'joined' where id = inv_c;
  get diagnostics n = row_count; assert n = 0, 'I accepted the invite of C';
  begin
    update public.collaborators set collaborator_id = s, status = 'joined' where id = inv_i;
    assert false, 'I joined with the id of another user';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.collaborators set owner_id = i where id = inv_i;
    assert false, 'I changed the owner of the invite';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  update public.collaborators set collaborator_id = c, status = 'joined' where id = inv_c;
  get diagnostics n = row_count; assert n = 1, 'C could not accept';
  reset role;
  perform pg_temp.login(s, 's@test.local');
  update public.collaborators set collaborator_id = s, status = 'joined' where id = inv_c;
  get diagnostics n = row_count; assert n = 0, 'S took the invite of C';
  reset role;

  -- A joined collaborator sees the snapshots of that project of that owner, and nothing else.
  perform pg_temp.login(c, 'c@test.local');
  select count(*) into n from public.snapshots; assert n = 1, format('C sees %s snapshots', n);
  assert exists (select 1 from public.snapshots where id = s1), 'C does not see s1';
  assert not exists (select 1 from public.snapshots where id in (s2, s3)), 'C sees s2 or s3';
  reset role;
  -- Invited but not joined, and no invite: nothing.
  foreach t in array array['i', 's'] loop
    perform pg_temp.login((select id from auth.users where email = t || '@test.local'), t || '@test.local');
    select count(*) into n from public.snapshots; assert n = 0, format('%s sees %s snapshots after C joined', t, n);
    reset role;
  end loop;

  -- A collaborator cannot change, delete or star the snapshot, and cannot save a snapshot in the name of the owner.
  perform pg_temp.login(c, 'c@test.local');
  update public.snapshots set title = 'hacked' where id = s1;
  get diagnostics n = row_count; assert n = 0, 'C changed s1';
  delete from public.snapshots where id = s1;
  get diagnostics n = row_count; assert n = 0, 'C deleted s1';
  begin
    insert into public.stars (snapshot_id) values (s1);
    assert false, 'C starred s1';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.snapshots (user_id, level_id, title, wiring) select o, level_id, 'x', '{}' from public.snapshots where id = s1;
    assert false, 'C saved a snapshot in the name of O';
  exception when insufficient_privilege then null;
  end;
  reset role;
  assert (select title from public.snapshots where id = s1) = 's1', 's1 changed';

  -- Notes: the owner and the joined collaborators read and add; each person deletes only their own.
  perform pg_temp.login(c, 'c@test.local');
  insert into public.snapshot_notes (snapshot_id, body) values (s1, 'Check the GND wire.') returning id into note_c;
  begin
    insert into public.snapshot_notes (snapshot_id, user_id, body) values (s1, o, 'In the name of O');
    assert false, 'C wrote a note in the name of O';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.snapshot_notes (snapshot_id, body) values (s2, 'Other project');
    assert false, 'C wrote a note on a snapshot of another project';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.snapshot_notes (snapshot_id, body) values (s1, '   ');
    assert false, 'C wrote an empty note';
  exception when check_violation then null;
  end;
  reset role;
  perform pg_temp.login(o, 'o@test.local');
  select count(*) into n from public.snapshot_notes where snapshot_id = s1; assert n = 1, format('O sees %s notes', n);
  insert into public.snapshot_notes (snapshot_id, body) values (s1, 'Thanks.') returning id into note_o;
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  select count(*) into n from public.snapshot_notes where snapshot_id = s1; assert n = 2, format('C sees %s notes', n);
  delete from public.snapshot_notes where id = note_o;
  get diagnostics n = row_count; assert n = 0, 'C deleted the note of O';
  reset role;
  perform pg_temp.login(o, 'o@test.local');
  delete from public.snapshot_notes where id = note_c;
  get diagnostics n = row_count; assert n = 0, 'O deleted the note of C';
  reset role;
  foreach t in array array['i', 's'] loop
    perform pg_temp.login((select id from auth.users where email = t || '@test.local'), t || '@test.local');
    select count(*) into n from public.snapshot_notes; assert n = 0, format('%s sees %s notes', t, n);
    begin
      insert into public.snapshot_notes (snapshot_id, body) values (s1, 'Let me in');
      assert false, 'a user with no access wrote a note';
    exception when insufficient_privilege then null;
    end;
    reset role;
  end loop;

  -- Names: the owner and a collaborator read each other's profile; an invitee reads the owner's; S reads neither.
  perform pg_temp.login(c, 'c@test.local');
  assert exists (select 1 from public.profiles where id = o), 'C does not see the profile of O';
  assert not exists (select 1 from public.profiles where id in (s, i, o2)), 'C sees the profile of a stranger';
  reset role;
  perform pg_temp.login(o, 'o@test.local');
  assert exists (select 1 from public.profiles where id = c), 'O does not see the profile of C';
  reset role;
  perform pg_temp.login(i, 'i@test.local');
  assert exists (select 1 from public.profiles where id = o), 'I does not see the profile of O';
  assert not exists (select 1 from public.profiles where id = c), 'I sees the profile of C';
  reset role;
  perform pg_temp.login(s, 's@test.local');
  select count(*) into n from public.profiles where id in (o, c); assert n = 0, format('S sees %s profiles', n);
  reset role;

  -- The owner removes C: the access goes at once. The note of C stays for the owner.
  perform pg_temp.login(o, 'o@test.local');
  delete from public.collaborators where id = inv_c;
  get diagnostics n = row_count; assert n = 1, 'O could not remove C';
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  select count(*) into n from public.snapshots; assert n = 0, format('C sees %s snapshots after removal', n);
  select count(*) into n from public.snapshot_notes; assert n = 0, format('C sees %s notes after removal', n);
  assert not exists (select 1 from public.profiles where id = o), 'C still sees the profile of O after removal';
  reset role;
  assert (select count(*) from public.snapshot_notes where id = note_c) = 1, 'the note of C went away';

  -- Leave: C is invited again, accepts, and leaves.
  perform pg_temp.login(o, 'o@test.local');
  insert into public.collaborators (project_id, invitee_email) values (pa, 'c@test.local') returning id into inv_c;
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  update public.collaborators set collaborator_id = c, status = 'joined' where id = inv_c;
  select count(*) into n from public.snapshots; assert n = 1, format('C sees %s snapshots after the new invite', n);
  delete from public.collaborators where id = inv_c;
  get diagnostics n = row_count; assert n = 1, 'C could not leave';
  select count(*) into n from public.snapshots; assert n = 0, format('C sees %s snapshots after Leave', n);
  reset role;

  -- Decline: the invitee deletes their invite. Another user cannot delete it.
  perform pg_temp.login(s, 's@test.local');
  delete from public.collaborators where id = inv_i;
  get diagnostics n = row_count; assert n = 0, 'S deleted the invite of I';
  reset role;
  perform pg_temp.login(i, 'i@test.local');
  delete from public.collaborators where id = inv_i;
  get diagnostics n = row_count; assert n = 1, 'I could not decline';
  reset role;

  -- delete_my_account still works with the new tables. C joins again, writes a note, then deletes the account.
  perform pg_temp.login(o, 'o@test.local');
  insert into public.collaborators (project_id, invitee_email) values (pa, 'c@test.local') returning id into inv_c;
  reset role;
  perform pg_temp.login(c, 'c@test.local');
  update public.collaborators set collaborator_id = c, status = 'joined' where id = inv_c;
  insert into public.snapshot_notes (snapshot_id, body) values (s1, 'Again');
  perform public.delete_my_account();
  reset role;
  assert (select count(*) from public.collaborators where collaborator_id = c) = 0, 'rows of C left in collaborators';
  assert (select count(*) from public.snapshot_notes where user_id = c) = 0, 'rows of C left in snapshot_notes';
  assert (select count(*) from public.snapshots where id = s1) = 1, 'the snapshot of O went away';

  -- The owner deletes the account: the invites and the notes go, and the cascade does not fail.
  perform pg_temp.login(o, 'o@test.local');
  perform public.delete_my_account();
  reset role;
  assert (select count(*) from public.collaborators where owner_id = o) = 0, 'invites of O left';
  assert (select count(*) from public.snapshot_notes where snapshot_id in (s1, s2)) = 0, 'notes on snapshots of O left';

  raise notice 'collaborate test: all checks pass';
end $$;

rollback;
