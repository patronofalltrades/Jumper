# Prompts: README and Plan vs. Reality update (issue #71)

Branch: `Feature/DocsUpdate`. Issue: https://github.com/patronofalltrades/Jumper/issues/71

## Key prompt (Oct 27, 2026, from Hanif through the coordinating session)

"update our backlog based on the issues and the plan.md file … check the ledger mine insights from the ledger and figure out what we have done and how can we polish that into a story that we can submit for the assignment"

Then Hanif opened issues #71 to #73 and asked for one session for each issue. The session for #71 got these tasks:
1. Add rows 1 to 13 to the "Plan vs. Reality" table of `PLAN.md`. Set rows 14 to 23 to Done with their issues and PRs. Add rows 24 to 27 for the QA fixes #62 to #65. Leave the "Learning" column empty.
2. Fix the README: the live URL, and Perch and Arduino Foundations as playable.
3. Add the Oct 27 rows and one decision to `ledger/LEDGER.md`.
4. Add `ledger/story-brief.md` (source material, not the reflection).
5. Write test scenarios as checks and run them. No code, content or migration changes.

## Test scenarios (checks) and results

| # | Check | Result |
| --- | --- | --- |
| 1 | `git diff -U0 PLAN.md`: only lines that start with `\|` change | Pass. 19 rows added and 10 rows changed (all table rows). |
| 2 | Each Done row links an issue and a PR, and each PR number is in `git log --merges` | Pass for rows 1 to 10 and 14 to 27. Row 13 (Docs) links issue #71 and has no PR number yet: this PR is its PR. |
| 3 | The "Learning" column is empty in every row | Pass. 29 rows, 0 with text in column 4. |
| 4 | README has the live URL and both projects | Pass. |
| 5 | `npm ci`, `npm run typecheck`, `npm run lint`, `npx vitest run` | Pass. 386 tests in 27 files. |
