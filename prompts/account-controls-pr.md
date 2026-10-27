# PR text for issue #78

**Title:** Profile: change my email and delete my account

**Body:**

closes #78

## User story

PLAN.md row 17 (Profile): As a learner, I want a profile page where I can see my email, my XP and the date I joined, change my display name, choose one of 5 robot characters as my profile picture, change my password and log out, so that my account is mine and I can control it. Added: I want to change my email and delete my account.

## Summary

- **Change email.** New "Change email" form on the profile page. The server action `changeEmail` checks the email with a Zod schema (`newEmailSchema`), then calls `supabase.auth.updateUser({ email }, { emailRedirectTo: <site>/auth/callback?next=/profile })`. The page says "Check your inbox. Your email changes after you click the link." An empty, wrong or same email gives a message under the field, and nothing is sent.
- **Delete account.** New "Delete my account" part at the bottom of the profile page (danger color), with a confirm dialog. The Delete button is off until the learner types `DELETE`. The server action `deleteAccount` calls `rpc("delete_my_account")` and signs out. Then the browser removes the `jumper:<user>:*` saves, empties the board in memory, and goes to `/?deleted=1`, where the landing page shows "Your account is deleted."
- **One migration**, `supabase/migrations/20261028000000_delete_account.sql`: the function `delete_my_account()` (`security definer`, empty `search_path`) that deletes only the row of `auth.uid()` in `auth.users`. The existing `on delete cascade` rules remove the profile, sessions, attempts, snapshots and stars. `revoke execute` from `public` and `anon`; `grant execute` to `authenticated`. The app never uses `SUPABASE_SECRET_KEY`.
- Small supporting changes: `callbackUrl()` moved to `lib/auth/callback-url.ts` (the password reset and `changeEmail` use it); a shadcn Dialog (`components/ui/dialog.tsx`, from the `radix-ui` package that is already installed); a `destructive` button variant; texts in `content/ui/profile.json` and `content/ui/landing.json`; `schema.md` lists the function; row 28 in the Plan vs. Reality table of `PLAN.md`; the ledger.

## Decisions (Hanif, from the issue)

1. Change email: Supabase sends a confirmation link; the email changes only after the click.
2. Delete account: a confirm dialog where the learner types `DELETE`.
3. Delete mechanism: one small SQL function `delete_my_account()`, `security definer`, that deletes only the row of `auth.uid()` in `auth.users`; the other rows go by the existing `on delete cascade`; the app never uses `SUPABASE_SECRET_KEY`; Hanif runs the migration in the Supabase SQL Editor before the merge.
4. Scope: Hanif answered "scope 2" (both features, with the migration) when Claude found that the issue title said "delete account shows Coming soon" and the issue body asked for the full delete. The title of #78 on GitHub still has the old words.

## Testing

Scenarios (Given / When / Then) are in `prompts/account-controls.md`.

| Scenario | Where | Result |
| --- | --- | --- |
| E1 good email (trim, lower case), E2 empty, E3 wrong, E4 same email | `tests/account.test.ts` | Red: suite did not load. Green: pass. |
| D1, D2 `DELETE` rule (`delete`, `DELET`, `DELETE x` are off) | `tests/account.test.ts` | Red, then green. |
| D7 the saves of this user are removed, other users' keys stay (also `u1` does not remove `u10`) | `tests/account.test.ts` | Red, then green. |
| D3 the rows of the caller go (6 tables), D4 another user's rows and XP stay, D5 `anon` is refused, D6 no user = 0 rows deleted, grants | `supabase/tests/delete_my_account.sql` on a local Postgres 16 | Red: `function public.delete_my_account() does not exist`. Green: `SQL TEST PASSED`. |
| E1 to E4, D1, D2, D8, D9 on screen | Browser check, stubbed actions, 390 × 844 and 1280 × 800, light and dark | Pass. Screenshots in `prompts/account-controls-screens/`. |
| E5 the email changes only after the click, E6 the link opens `/profile` logged in, D10 the same email can sign up again | Live Supabase project | **Not checked.** Hanif checks them after the migration (below). |

Totals: 29 test files, 408 tests pass (8 new). Type check, lint and build pass.

The red tests are in the first commit of this branch. The test of the email form uses the key `change_email` in `content/ui/profile.json`; the red commit used a wrong key (`email`, already the label of the email line), and the code commit fixes it.

**What change makes the new test fail?** Change `canDelete` so that it accepts `delete` in lower case, or remove `on delete cascade` from one user table: the unit test of the `DELETE` rule or the SQL test fails.

## Before you merge

Run this in the Supabase **SQL Editor** on the live project **before you merge** (the live app calls the function after the deploy):

```sql
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
```

Short check after it, in the SQL Editor:

```sql
select p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'execute') as anon_can,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can
from pg_proc p where p.proname = 'delete_my_account';
-- expected: prosecdef = true, anon_can = false, authenticated_can = true
```

Then on the live app, with a throwaway account (not your real one):
1. Sign up with a new email, build a little, and open the profile page.
2. Change email: type a second address you own. The page shows "Check your inbox…". The email on the page does not change yet. Click the link: `/profile` opens, logged in, and the email is the new one.
3. Delete my account: type `DELETE`. You land on `/` with "Your account is deleted." The browser has no `jumper:<user>:` keys (DevTools, Application, Local Storage).
4. In the SQL Editor: `select count(*) from auth.users where email = '<the address>'` gives 0, and `select count(*) from public.profiles` has one row fewer.
5. Sign up again with the same address. It works.

Also check Authentication, Email in Supabase: the code works with "Secure email change" on or off (with it on, Supabase sends a link to the old and the new address).

## No change to tables, levels or tasks

No table, column, level, task or saved-board format changes. The only migration is the function above (`create function`, `revoke`, `grant`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNYH62JPLtENjTLjTg
