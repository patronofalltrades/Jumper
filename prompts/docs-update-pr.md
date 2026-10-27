# PR title and body (issue #71)

**Title:** Update README and Plan vs. Reality; add story brief

**Body:**

closes #71

## Summary

- `README.md`: the "Live app" line has the live URL, https://jumper-inky-sigma.vercel.app/. The intro says that Perch and Arduino Foundations can be played.
- `PLAN.md`: only the "Plan vs. Reality" table changes. Rows 1 to 13 are new. Rows 14 to 23 are Done, with their issues and PRs. Rows 24 to 27 are new, for the QA fixes #62 to #65. The "Learning" column is empty. Feature 11 (simulation) is Backlogged. Feature 12 (tests) is Backlogged because the Data isolation test is not in the repository.
- `ledger/LEDGER.md`: the Oct 27 rows and one decision line.
- `ledger/story-brief.md`: new. Source material for the reflection (numbers, a story arc, Hanif's quotes, questions for Hanif, a checklist). It is not the reflection.
- `prompts/docs-update.md`: the prompts and the test scenarios.

## Testing scenarios and results

1. `git diff -U0 PLAN.md` changes only table lines: pass.
2. Each Done row links an issue and a PR, and each PR number is in `git log --merges`: pass. Exception: row 13 (Docs) has no PR number, because this is its PR. Add it after the merge.
3. The "Learning" column is empty in every row: pass.
4. README has the live URL and both projects: pass.
5. `npm ci`, `npm run typecheck`, `npm run lint` and `npx vitest run` (386 tests): pass.

No code, content or migration changes.
