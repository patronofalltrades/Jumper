# Prompt log: Dashboard learning (issue #127)

1. "start working on #122 to #127 in different subsessions using haiku 5.5"

   The parent session gave this task. Claude read issue #127 on GitHub (acceptance list: top mistakes, terms, Flashcards, pure functions with tests). The branch `feature/dashboard-learning` was already made from `main` at 43eb02c.

   Claude worked test first:
   - Red commit `3d9ddc2`: tests in `tests/dashboard.test.ts` (top mistakes, terms learned) and `tests/content.test.ts` (content/terms). The modules did not exist, so the files failed to load and no tests ran.
   - Green commit `f471c05`: `lib/stats/dashboard.ts` (`topMistakes`), `lib/stats/terms.ts` (`termsLearned`), `lib/content/terms.ts` (`loadTerms`, Zod), `content/terms/perch.json` and `content/terms/arduino-foundations.json`, `content/ui/dashboard.json` (new text), and `app/dashboard/page.tsx` (Top mistakes with Practise links, Terms you learned, disabled Flashcards card).

## Ledger notes

How it works:
- The dashboard page already read sessions and attempts. The new code reuses those rows. It also reads the `levels` table (with the project slug and title), because attempts and sessions store the database level id, and the Practise link needs the project slug and the level position.
- A level counts as passed when it has a completed session. This is the same rule as `passedLevels` in `lib/game/featured.ts`, which unlocks levels.
- Practise links go to `/p/<project>/<position>`.
- The terms come from `content/terms/*.json`. Each term names its project and level. `loadTerms()` checks each term against `content/projects/`, so a term cannot point at a level that does not exist.

Choices made:
- Top mistakes: the 3 types with the most failed attempts. Each one has the level where it happened most. A tie goes to the lower level id.
- Terms: the definitions come from the level text and the concept text in `content/projects/`. Each sentence has 20 words or fewer (ASD-STE100). A test checks this.
- I did not add I2S. No level text mentions it, so the issue's rule ("each definition must match what the level text says") leaves it out.
- I added Anode and Cathode for the LED legs. The level text says "long leg (+)" and "short leg (−)". The new definitions say the same thing with the two words.
- Flashcards: a disabled card (dimmed, no action) with the "Coming soon" text in `content/ui/dashboard.json`. The lobby cards still have "Coming soon" written in the code. I did not change them, because they are outside this issue.
- No database change. No new dependency.

What was not checked:
- The live app with a real login and real attempt rows.
- The browser check used a temporary preview route with placeholder numbers and the real terms file. The route and the temporary move of `proxy.ts` were both reverted before the commit. The preview did not include the existing mistake chart, so the chart was not checked in this run.
- Dark mode.
- Clicking a Practise link for a level that the learner has not unlocked. The level page redirects there, which is the existing behavior.

Process notes:
- The `task-observer` skill named in CLAUDE.md is not in this session's skill list, so it could not be loaded.
- The commit trailer uses `Co-Authored-By: Claude <noreply@anthropic.com>`. The model name is left out, because the session rules say not to put a model identifier in commit messages.
