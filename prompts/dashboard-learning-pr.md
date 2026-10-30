closes #127

## User story
As a learner, I want to see levels completed, completed sessions, XP and first-try pass rate, plus a chart of the mistakes I make most, so that I know what to practice. (PLAN.md row 10)

I also want (1) a count of my top mistakes with a link to the level to practise, (2) a dictionary of the terms that I learned in the levels that I passed, and (3) a Flashcards card marked "Coming soon", so that the dashboard helps me study.

## What changed
- `lib/stats/dashboard.ts`: new `topMistakes()`. It gives the 3 most frequent fail reasons, each with its count and the level where it happened most. A level tie goes to the lower level id. The types with the same count keep the name order of `mistakesByType()`.
- `lib/stats/terms.ts` (new): `termsLearned()`. It gives only the terms of the passed levels, in content order. A level of another project does not count. Pure: no React, no database.
- `lib/content/terms.ts` (new): `loadTerms()`. It reads `content/terms/*.json`, validates it with Zod, and checks that each term names a level that exists in its project.
- `lib/content/schema.ts`: new `termsFileSchema`.
- `lib/content/load.ts`: `issueText()` is now exported, so the terms loader can use it.
- `content/terms/perch.json` (new): 16 terms of the 5 Perch levels.
- `content/terms/arduino-foundations.json` (new): 9 terms of the 4 Arduino Foundations levels.
- `content/ui/dashboard.json`: the text of the Top mistakes, Terms and Flashcards sections, in ASD-STE100.
- `app/dashboard/page.tsx`: a Top mistakes card (3 rows, each with its count, its most common level and a Practise button to `/p/<project>/<level>`), a Terms you learned card, and a disabled Flashcards card with the "Coming soon" badge. The existing stats and chart are unchanged. The page also reads the `levels` table, because attempts store the database level id.
- `tests/dashboard.test.ts`: 8 new tests (4 for `topMistakes`, 4 for `termsLearned`).
- `tests/content.test.ts`: 3 new tests for `content/terms` (each term has a level of its project; no term twice in one project; each sentence has 20 words or fewer).
- `prompts/dashboard-learning-screens/`: browser check at 1280 x 800 and 390 x 844.
- `prompts/dashboard-learning.md`, `prompts/dashboard-learning-pr.md`: prompt log and this text.
- No database change. No new dependency. `PLAN.md` and `ledger/LEDGER.md` are not changed.

## How it was tested
Plain English: the new tests check three things. The top-mistakes list shows the 3 most common reasons, each with a count and the right level. The terms list shows only the terms of the levels that the learner passed. Each term points to a level that exists, and no definition has a sentence longer than 20 words.

- Red (`3d9ddc2`): `vitest run tests/dashboard.test.ts tests/content.test.ts`: 2 test files failed to load (`Cannot find package '@/lib/stats/terms'` and the matching content import). 0 tests ran.
- Green (`f471c05`): `vitest run tests/dashboard.test.ts tests/content.test.ts`: 35 passed (19 in dashboard, 16 in content). `npm test`: 46 files, 640 tests passed.
- Typecheck (`npm run typecheck`): exit 0.
- Lint (`npm run lint`): exit 0.
- Browser, local only: a temporary public route with placeholder numbers and the real terms file, plus a temporary move of `proxy.ts` (both reverted before the commit). Chromium with Playwright at 1280 x 800 and 390 x 844: no horizontal scroll, no console or page errors, and the three Practise links were `/p/perch/2`, `/p/perch/3` and `/p/arduino-foundations/1`. The Flashcards card is dimmed, with the "Coming soon" badge. No Supabase project was used.
- A real change that makes the test fail: in `topMistakes`, remove the `.slice(0, limit)` call, and the list shows every mistake type, so the 3-item test fails.

## Choices for Hanif
1. A level counts as passed when it has a completed session. This is the same rule that unlocks levels. Is that the meaning you want for "passed"?
2. I did not add I2S. No level text mentions it, and the issue asks that each definition match the level text. Do you want it as a term anyway?
3. I added Anode and Cathode for the two LED legs. The level text says "long leg (+)" and "short leg (−)", and the definitions use the same words. Keep both terms, or only LED?
4. A tie in the level for a mistake goes to the lower level id, which is the earlier level. Is that the right link when two levels tie?
5. The Flashcards card is the last card on the page, with no action. Should it sit higher, or be removed until it is ready?
6. The lobby cards still write "Coming soon" in the code. Should I move that text to `content/` in a later change?

## Not checked
- The live app with a real login and real attempt rows. The browser check used placeholder numbers.
- The existing mistake chart in the browser. The preview route did not include it. The chart is unchanged.
- Dark mode.
- A Practise link for a level that the learner has not unlocked. The level page redirects to the level map, as it does today.
- Touch on a real phone.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
