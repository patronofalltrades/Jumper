# PR text for issue #137 (Hanif opens the PR)

**Title:** Data isolation test: User B cannot see User A's snapshot (required test 1)

**Base:** `main` · **Compare:** `Features/UserVisibilityTest`

**Body:**

closes #137

**12. Tests:** Data isolation and dashboard stat tests (section 4). The dashboard stat test is done (PR #32). This PR adds the Data isolation test.

## The required test (PLAN.md section 4, test 1)

> Given User A has saved a snapshot titled "Ears wired", when User B logs in and opens their snapshot list or requests A's snapshot by its ID, then B's list is empty and the direct request returns "not found".

`supabase/tests/data_isolation.sql`

**In plain English:** the test makes two users, A and B. User A saves a snapshot titled "Ears wired". Then the test logs in as User B and asks the database for B's snapshot list and for A's snapshot by its id, with the same queries as the snapshot pages. B's list must be empty, and the request by id must give no row, so the page shows "not found". The test also checks that A can see the snapshot (so the test data is correct), that B cannot find it by its title, change it or delete it, and that a visitor who is not logged in sees no snapshot.

**A real change that makes it fail:** if a developer changes the row-level security policy on `snapshots` so that it lets each logged-in user read each row (`using (true)`), User B can open "Ears wired" by its id, and the test fails.

### Red (the policy is broken)

The commit "RED: Data isolation test with the snapshots policy broken on purpose" sets the policy to `using (true)`. The `SQL tests (row-level security)` CI check fails:

![CI red: SQL tests log](prompts/data-isolation-test-screens/ci-red-log.png)

![CI red: checks of the PR](prompts/data-isolation-test-screens/ci-red-checks.png)

On a computer:

![local red](prompts/data-isolation-test-screens/local-red.png)

### Green (the policy is back)

The next commit puts the policy back. The CI check passes:

![CI green: SQL tests log](prompts/data-isolation-test-screens/ci-green-log.webp)

On a computer:

![local green](prompts/data-isolation-test-screens/local-green.png)

## What changed

- **New test** `supabase/tests/data_isolation.sql`, in the style of `collaborate.sql`. It uses the queries of `app/snapshots/page.tsx` (the list) and `app/snapshots/[id]/page.tsx` (by id), in SQL. The app has no `listSnapshots` or `getSnapshot` function, and this PR does not add them.
- **New runner** `scripts/sql-tests.sh` (`npm run test:sql`). It makes a new database for each file in `supabase/tests/`, applies the stub and the migrations, runs the file, and lists the files that fail. It refuses a `PGHOST` that is not local.
- **CI:** a second job, `SQL tests (row-level security)`, runs all 5 SQL tests on a Postgres 16 service in the job. No Supabase project and no secrets.
- **Docs:** PLAN.md "Plan vs. Reality" row 12 (Done), docs/TRD.md section 10 (the test table and CI), schema.md, README (the new command).
- **No change to the app, the migrations or the live database.** No new dependency.

## Why not a Supabase test project

docs/TRD.md said "a separate Supabase test project". Hanif chose a throwaway Postgres in CI. The rule that the test proves is row-level security, and Postgres enforces it, so a plain Postgres with the migrations is sufficient. CI needs no keys, and the test cannot touch the live project. This test does not check the Supabase API layer (PostgREST) or Supabase Auth.

## Collaborate (#88)

A joined collaborator of A can see A's snapshots of that project. `supabase/tests/collaborate.sql` already checks a user with no invite, an invited user who did not join, and a removed collaborator. This PR does not repeat those checks. In the red run, `collaborate.sql` fails too.

## How to test

On a throwaway local Postgres 16 (never the live project):

```
PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres npm run test:sql
```

Expected: `All SQL tests pass: collaborate data_isolation delete_my_account get_shared_snapshot record_attempt_replay`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNm5X5rDKxgmvGXfUE
