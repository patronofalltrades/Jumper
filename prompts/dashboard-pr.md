# PR text for issue #28 (Hanif opens the PR)

**Title:** Dashboard: levels, sessions, XP, first-try pass rate and a mistakes chart

**Body:**

closes #28

As a learner, I want to see levels completed, completed sessions, XP and first-try pass rate, plus a chart of the mistakes I make most, so that I know what to practice.

## What changed

- A new page, `/dashboard`, behind the log-in. The dock's Dashboard button opens it (before, it opened a "Coming soon" page).
- **Four stat cards:** levels completed, completed sessions, XP (from the profile), and first-try pass rate, with "2 of 3 levels passed on the first Check" under it.
- **Mistakes you make most:** a Recharts bar chart of the failed Checks, by mistake type, most first. The bar labels are plain words from `content/ui/dashboard.json` (for example "Short circuit (power to ground)"), not codes. The count is at the end of each bar, and a hidden list gives the same data to screen readers.
- **New learner:** a "Start your first level" card with a Build button, real zeros, "–" for the pass rate, and a short text in place of the chart. No placeholder numbers.
- **Pure stat functions** in `lib/stats/dashboard.ts` (no React, no database): `firstTryPassRate()`, `levelsCompleted()`, `completedSessions()`, `mistakesByType()`.
- The data comes from the user's own sessions and attempts. Row-level security keeps it to the user.
- New package: `recharts` (in the TRD stack). No database change.

## The required test (PLAN.md section 4, test 2)

`tests/dashboard.test.ts`: **"is 67% when the first attempt passed on step 1, failed on step 2 (then passed on retry), and passed on step 3"**.

In plain English: the learner checks three levels. Level 1 passes on the first Check. Level 2 fails first, then passes on the second Check. Level 3 passes on the first Check. The first-try pass rate looks only at the first Check of each level, so 2 of the 3 levels passed on the first try: 67%. The pass on the retry of level 2 must not count.

- A real change that makes it fail: if `firstTryPassRate()` counts every attempt and not only the first attempt of each level, the result is 3 passes of 4 attempts (75%), and the test fails.
- Red: the commit "Red: count every attempt in the first-try pass rate" makes that change. The CI check on this PR fails.
- Green: the next commit counts only the first attempt of each level again. The CI check passes.

Red (CI fails):

_(screenshot)_

Green (CI passes):

_(screenshot)_

## Other tests

- `tests/dashboard.test.ts` (11 tests in total): first attempt by time and not by row order, 100%, 0% (a later pass does not count), no attempts gives no number; levels counted once; every completed session counted; mistakes counted by type, most first, ties in name order; passed attempts not counted.
- `tests/content.test.ts` (1 new): each mistake code of a level Check has a plain label for the chart.

## Checks

- `npm test`: 171 tests pass (12 new).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Real routes (Chromium): `next start` on the real Supabase project, with a temporary test account. Hanif allowed it, and the account was deleted after the test with all its rows.
  - New learner: the dock's Dashboard button opens `/dashboard`. 0, 0, 0 XP, "–" and "No Checks yet", the empty state and the empty chart text.
  - After Checks through the real `record_attempt` function (level 1 pass; level 2 fail, fail, pass; level 3 pass; level 1 again fail, fail, pass): 3 levels, 4 sessions, 510 XP, **67%** (2 of 3 levels), and the chart short circuit 2, LED turned around 1, wrong or missing wire 1.
  - Phone (390 px), laptop (1280 px), light and dark mode. No page errors.
- The bar color (`--danger`) passes the chart color check against the card in light and dark mode (contrast 3:1 or more).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DXFtA3smhH65eWL9D4kSES
