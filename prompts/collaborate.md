# Collaborate: invite a collaborator to see your project builds and leave notes (issue #88)

Branch: `Feature/Collaboration`. Issue: [#88](https://github.com/patronofalltrades/Jumper/issues/88).

## Key prompts

Hanif's words only. Claude notes are in `ledger/LEDGER.md`.

1. Task for issue #88 on `Feature/Collaboration` (text from Hanif, in the session task): implement the issue. Read the issue, `CLAUDE.md`, `PLAN.md`, `docs/TRD.md`, `schema.md`, the migrations and the SQL tests first. Work and push only on `Feature/Collaboration`; Hanif opens the PR. Test first: commit the Vitest test and the SQL RLS test red, then green in a separate commit. Pure logic in `lib/` with Vitest tests; the invite form uses Zod (a valid email, not your own email). All UI text in `content/ui/` as JSON. No new dependency. Docs in ASD-STE100. New migration `20261029100000_collaborate.sql` (the Share branch #87 uses `20261029000000`). Never run migrations or SQL tests against the live Supabase project; run the SQL test on a throwaway local Postgres. Hanif applies the migration to the live project himself. If not sure, stop and write the question down.

## Decisions by Hanif (from the task text)

1. Collaborate is "invite + shared view + notes", not live co-wiring. The collaborator can only read the builds of the owner.
2. The live board is only autosaved in the browser (PLAN.md section 3), so the shared view shows the owner's snapshots of that project, in the existing view-only 3D snapshot page.
3. Invite by email on the project page `/p/[project]`. A list shows each collaborator with avatar, name, status (invited / joined) and Remove.
4. The invitee sees the invite in the lobby with Accept and Decline. The invite matches the email of the signed-in user (`auth.jwt() ->> 'email'`), so the app never tells the inviter whether an email has an account.
5. Two tables: `collaborators` and `snapshot_notes` (columns in the issue).
6. RLS: the owner manages the invites. The invitee reads and accepts only the invites for their own email. A joined collaborator can select the snapshots of the owner for that project, and nothing else (no update, delete or star). Notes: read by the owner and the joined collaborators of the snapshot; insert and delete only one's own. A collaborator can leave. The owner can remove a collaborator at any time, and the access goes at once.

## Test scenarios (Given / When / Then)

Vitest, `tests/collaborate.test.ts`:

- Given my email is `hanif@example.com`, when I write `friend@example.com`, then the form is correct.
- When the field is empty or only spaces, then the message asks for an email.
- When the text is not an email, then the message asks for a correct email.
- When I write my own email (any capital letters, spaces around it), then the message says it is my own email.
- When a note is empty, then the message asks for a note; 1000 characters pass, 1001 do not.

SQL, `supabase/tests/collaborate.sql` (throwaway local Postgres):

- Given an owner O with snapshots in project A and project B, and a snapshot of another owner in project A:
  - A user with no invite sees none of the snapshots of O.
  - A user who is invited but has not joined sees none of the snapshots of O.
  - After Accept, the collaborator sees only the snapshot of O in project A.
  - The collaborator cannot update, delete or star the snapshot, and cannot save a snapshot in the name of O.
  - Notes: the owner and the joined collaborator read and add notes; each person deletes only their own; a user with no access reads and adds none.
  - After the owner removes the collaborator (or the collaborator leaves), the collaborator sees no snapshot and no note.
  - `delete_my_account()` still works for the owner and for the collaborator.
