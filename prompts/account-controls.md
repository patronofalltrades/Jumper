# Prompt log: Profile, change my email and delete my account (issue #78)

1. Task for issue #78 on `Feature/DeleteEmail` (from the session start): "Profile: change my email and delete my account". Read the docs first. Write the test scenarios first. Commit the red tests, then the code. Browser check. PR text, no PR. Never apply the migration to the live Supabase project.

   Claude read issues #77 to #80 first. The title of #78 on GitHub was "Profile: change my email (delete account shows "Coming soon")", and its body still asked for both features. Claude stopped and asked.

2. "scope 2" (Hanif's answer): build both features, as the body of #78 says, with the migration.

## Test scenarios (Given / When / Then)

### Change email

| # | Given | When | Then |
| --- | --- | --- | --- |
| E1 | A learner is logged in with `a@test.local` | They send `New@Test.local ` (capitals, a space at the end) | The schema accepts it and gives `new@test.local`. The server action sends the link with `emailRedirectTo` = `<site>/auth/callback?next=/profile`. The page shows "Check your inbox. Your email changes after you click the link." |
| E2 | Same | They send an empty field or only spaces | A message under the field: "Enter your new email." Nothing is sent. |
| E3 | Same | They send `not-an-email` | A message under the field: "Enter a valid email address." Nothing is sent. |
| E4 | Same | They send `a@test.local`, or `A@Test.Local` | A message under the field: "That is already your email." Nothing is sent. |
| E5 | The link was sent | The page loads again, before the click | The email line still shows the old email (Supabase changes it only after the click). |
| E6 | The learner clicks the link | `/auth/callback?code=…&next=/profile` runs | The code becomes a session, and `/profile` opens with the learner logged in. (Existing route; checked on the live app by Hanif after the merge.) |

### Delete account

| # | Given | When | Then |
| --- | --- | --- | --- |
| D1 | The confirm dialog is open | The learner has typed nothing, `delete`, `DELET` or `DELETE x` | The Delete button is off. |
| D2 | Same | The learner types `DELETE` (spaces around it are fine) | The Delete button is on. |
| D3 | Users A and B have a profile, a session, an attempt, a snapshot and a star each | A (logged in) calls `delete_my_account()` | The rows of A are gone in `auth.users`, `profiles`, `sessions`, `attempts`, `snapshots` and `stars` (0 rows). |
| D4 | Same | Same | The rows of B do not change (same counts, same XP). |
| D5 | A visitor with no log-in (`anon`) | They call `delete_my_account()` | The database refuses the call (permission denied). No row changes. |
| D6 | A call with no user in the token (`authenticated` role, no `sub`) | The function runs | It deletes 0 rows. |
| D7 | The delete worked | The page code runs after it | The browser has no `localStorage` key that starts with `jumper:<user>:`. Keys of another user, and other keys, stay. |
| D8 | Same | The app goes on | The learner is logged out, and `/` shows "Your account is deleted." (the proxy sends only a logged-in user to the lobby). |
| D9 | The `delete_my_account()` call fails | The action returns | The page shows "We could not delete your account. Try again.", the learner stays logged in, and the browser keeps the saves. |
| D10 | An account is deleted | Someone signs up with the same email | It works, because the row in `auth.users` is gone (Supabase check by Hanif after the migration). |

### Where each scenario is checked

- E1 to E4, D1, D2: Vitest unit tests, `tests/account.test.ts` (the email schema and the `DELETE` rule).
- D7: Vitest unit test of `clearUserSaves` in the same file.
- D3 to D6: the SQL test `supabase/tests/delete_my_account.sql` on a throwaway local Postgres (red on the old schema, green with the migration).
- E1, E2 to E4 messages, D1, D2, D8, D9 on screen: the browser check with the server actions stubbed (screenshots in `prompts/account-controls-screens/`).
- E5, E6, D10: need the live Supabase project. Hanif checks them after the migration (steps in the PR text).

## Results

### Red (before the code, commit `26a4b7c`)

- `npx vitest run tests/account.test.ts`: `FAIL tests/account.test.ts`, `Error: Cannot find package '@/lib/profile/account'`. The suite did not load, so no test ran.
- SQL test on a local Postgres 16, schema without the new migration: `ERROR: function public.delete_my_account() does not exist` (the first call, the `anon` check, in line 15 of the test block).

### Green

- `npx vitest run tests/account.test.ts`: 8 of 8 tests pass. The whole suite: 29 files, 408 tests pass (400 before).
- SQL test with the migration: `SQL TEST PASSED`. It checks: `anon` is refused; a call with no user deletes 0 rows; after the call of A, A has 0 rows in `auth.users`, `profiles`, `sessions`, `attempts`, `snapshots` and `stars`; B has the same 1 row in each table and the same XP; `anon` has no `execute` right and `authenticated` has it.
- `npm run typecheck`, `npm run lint` and `npm run build`: pass, no warning.
- Change in the red test after the red commit: the key `text.email.errors` became `text.change_email.errors`, because `email` in `content/ui/profile.json` is already the label of the email line.

### Browser check (scratch page with stubbed actions, not committed)

Chromium, 390 × 844 (touch) and 1280 × 800, light and dark. The scratch page rendered the real `EmailForm` and `DeleteAccount` with stub actions. Screenshots are in `prompts/account-controls-screens/`.

- Change email: an empty field gives "Enter your new email."; `nope` gives "Enter a valid email address."; the same email in other letters gives "That is already your email."; a new email gives "Check your inbox. Your email changes after you click the link." All 4 sizes and themes.
- Delete dialog: the Delete button is off at the start and for `delete`; it is on for `DELETE`. All 4 sizes and themes.
- A failed delete: the dialog shows "We could not delete your account. Try again." and nothing else changes.
- A good delete (1280 × 800, light): the keys `jumper:u1:*` are gone; `jumper:u2:perch/1` and `theme` stay; the URL is `/?deleted=1`; the landing page shows "Your account is deleted."

Not checked in a browser: the real email link and the real delete (they need the live Supabase project and the migration).
