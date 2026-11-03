# Data isolation test: User B cannot see User A's snapshot (issue #137)

Branch: `Features/UserVisibilityTest` (Hanif made it). Issue: [#137](https://github.com/patronofalltrades/Jumper/issues/137). PR: [#142](https://github.com/patronofalltrades/Jumper/pull/142).

## Key prompts

Hanif's words only. Claude notes are in `ledger/LEDGER.md`.

1. Session task (from the coordinating session, in Hanif's name, short form): build the required Data isolation test (feature 12, PLAN.md section 4, test 1). Due November 4, 2026. Step 1: give the issue text and the branch name; Hanif opens them. Step 2: ask where the test runs, (a) local only or (b) a Supabase test project in CI. Step 3: red first, then green; use the queries of the snapshot pages; do not repeat `collaborate.sql`. Step 4: PR text with `closes #N`, a plain-English explanation, a red and a green screenshot, and one sentence about a real change that makes the test fail. Step 5: prompts, ledger. Never use the live Supabase project without Hanif's yes.
2. "Issue is #134, branch exists (Features/UserVisibilityTest)"
3. "For step two, which one is more appropriate? by the way, submission deadline is Wednesday before class so we still have time"
4. "Okay let's do it. I can spend time to setup the tests. You just need to show me the steps"
5. Dialog answers: "(c) Local SQL + CI job (Recommended)" and "Use Features/UserVisibilityTest".
6. "send the PR body here"
7. "red done" (after the CI red run on PR #142)

## Decisions by Hanif

1. The test runs on a throwaway Postgres 16: on a computer with `npm run test:sql`, and in CI on each pull request. No Supabase test project and no secrets.
2. The work stays on `Features/UserVisibilityTest`.

## Test scenario (Given / When / Then)

SQL, `supabase/tests/data_isolation.sql` (throwaway Postgres, never the live project):

- Given User A has saved a snapshot titled "Ears wired", when User B opens their snapshot list, then the list is empty.
- When User B requests A's snapshot by its id, then no row comes back, so the page shows "not found".
- Also: B cannot find it by its title, change it or delete it; a visitor who is not logged in sees no snapshot; A sees it in the list and by id.

## Red and green

- Red: the commit "RED: Data isolation test with the snapshots policy broken on purpose" sets the "Owner only" policy on `snapshots` to `using (true)`. The test fails: `B can open the snapshot "Ears wired" of A by its id`.
- Green: the next commit puts the policy back. All 5 SQL tests pass.
- Local screenshots: `prompts/data-isolation-test-screens/local-red.png` and `local-green.png`.
