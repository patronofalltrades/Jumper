# Pull request text: TRD update (issue #79)

**Title:** Update the TRD to match the app as built

**Body:**

closes #79

## Summary

The TRD was written before the build. This pull request changes only `docs/TRD.md` (and the prompt log and the ledger). Each fact is checked in the code. The section numbers stay the same.

- **Section 3 (stack):** `proxy.ts` replaces "middleware". The Tests row says that Playwright is a dev package that records the videos, and that SQL tests exist.
- **Section 4 (routes):** 15 routes (13 pages and 2 route handlers), not 7. New: `/`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/play`, `/profile` and `/p/[project]/[level]/complete`. The log-in rule of `proxy.ts` is written out: the 5 public paths, the redirect of a logged-in user to `/lobby`, and `/reset-password` that needs the session of the reset link.
- **Section 4.1 (folders):** Each folder of the root, `content/` and `lib/` is there, with `content/benches/`, `content/boards/`, `content/ui/`, `content/videos.json`, `components/walkthrough/`, `scripts/record-videos.ts`, `public/videos/`, `public/avatars/`, and the real names in `components/scene/` and `components/ui/`.
- **Section 7 (schema):** `profiles.avatar`, the column grants (a learner changes only `display_name` and `avatar`), the sign-up trigger, the `record_attempt` rules (first pass only gives XP, the profile row lock, a closed session raises `JS001`), the 4 migration files, the `{ version, parts }` wiring format, and the stars rule. The "2 hours then abandoned" rule is removed: no code sets `abandoned`.
- **Section 8 (flows):** the replay and `closed` steps, and the profile and password-reset flows.
- **Section 9 (server actions):** all 14 actions of `app/actions/`, including `sendPasswordReset`, `updatePassword`, `updateProfile` and `changePassword`. The table has the real inputs. The text about named read functions is replaced: the app has none.
- **Section 10 (tests):** a `Status` column. The Data isolation test and the phone smoke test are **Not built**. Rows for all 28 Vitest files, the SQL test in `supabase/tests/`, the lint rule of #61 and the tab-save test of #73. The CI text says what CI runs (no secrets, no SQL test, no Playwright).
- **Section 12.2:** the first two questions are marked as answered (tap-to-place works; the wiring is JSON).

## Checks

Written first, as Given / When / Then, in `prompts/trd-update.md` (with the scripts). Each of checks 1 to 5 fails on the old TRD and passes on the new one.

| # | Check | Old TRD | New TRD |
| --- | --- | --- | --- |
| 1 | Each `page.tsx` and `route.ts` is in section 4 | 7 missing | Pass (15 of 15) |
| 2 | Each folder of the root, `content/` and `lib/` is in section 4.1 | 17 missing | Pass (34 of 34) |
| 3 | Each exported action is in section 9 | 4 missing | Pass (14 of 14) |
| 4 | Each migration column and each `schema.md` column is in section 7 | 5 missing | Pass (121 of 121) |
| 5 | Each test file is in section 10 | 31 missing | Pass (31 of 31) |
| 6 | `git diff --stat`: only `docs/TRD.md`, the prompt logs and the ledger | — | Pass |
| 7 | `npm ci`, `npm run typecheck`, `npm run lint`, `npx vitest run` | — | Pass (28 files, 400 tests) |

## Differences between the issue and the task text

- The issue says "the 4 migrations"; the task text says all the migrations. There are 4 files, so both agree.
- The issue says "#10 (change email)"; the task text says #78. #78 is the change-email and delete-account issue.
- `/play` is not in the issue list. It is in `app/`, so it is in section 4.

## Not changed (outside this issue)

- Section 6.3 still shows the first plan for `snapshot.wiring`. Section 7 and `schema.md` give the built format.
- Section 11 says to apply migrations with the Supabase CLI. The README says to use the Supabase SQL Editor.

## Lines to add if #77, #78 or #80 merge first

Hanif plans to merge this pull request last. This text is for `main` as it is now. If another issue merges first, ask for a small follow-up commit with these lines:

- **#77 (Arduino clips):** In section 4.1, `public/videos/`: add the 8 files `arduino-foundations-1` to `-4` (laptop and phone). `content/videos.json` has 4 more entries.
- **#78 (change email and delete account):**
  - Section 4, `/profile`: add "change email" and "delete account".
  - Section 7: add `delete_my_account()` (`security definer`, it deletes only the row of `auth.uid()` in `auth.users`; the other rows go by `on delete cascade`; `execute` only for `authenticated`), and the 5th migration `20261028000000_delete_account.sql`. Change "No feature deletes a profile" in the **Profile columns** paragraph.
  - Section 9: add `changeEmail` (`supabase.auth.updateUser({ email })`, the email changes after the link) and `deleteAccount` (calls `delete_my_account()`, then signs out) to the table and to the `profile.ts` list.
  - Section 10: add rows for the new SQL test in `supabase/tests/` and the unit tests of the email schema and the `DELETE` rule.
- **#80 (browser checks):**
  - Section 3, Tests row: Playwright runs the `e2e/` suite.
  - Section 4.1: add `e2e/` (Playwright suite, `npm run e2e`).
  - Section 10: add a row for the `e2e/` suite (5 flows, temporary account, not in CI). The "Phone smoke test" row may then change from **Not built**. The Data isolation test stays **Not built**.

No code, content or migration changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnR9cerhhd7WNAwcVDB
