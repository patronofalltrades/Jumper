# PR text for issue #20 (Hanif opens the PR)

**Title:** Level complete pop-up

**Body:**

closes #20

As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

Level complete (PLAN.md): a summary screen shows XP earned and mistakes made, and offers Save snapshot, which saves the board to my lab notebook.

## What changed

- **Level complete pop-up** (`components/build/level-complete.tsx`), from the pattern of the Duolingo lesson-end screen:
  - The **Perch device wakes up** in place of a mascot: the screen lights, the eyes open, it smiles and hops.
  - A **title that changes with mistakes**: "Clean build!" (0), "Solid build!" (1 or 2), "Level complete!" (3 or more), and "You got {xp} XP!".
  - **3 stat cards**: TOTAL XP (amber), accuracy (green; label PERFECT, GREAT or GOOD), TIME (page text color). XP and accuracy count up.
  - **Save snapshot** shows a "coming soon" note. **Continue** goes to the next level, or to the lobby after the last level.
- **Logic** in `lib/stats/level-summary.ts` (pure TypeScript) with 8 Vitest tests.
- **Text** in `content/ui/complete.json`, in ASD-STE100.
- **Route** `/p/[project]/[level]/complete`: the user's latest completed session of the level. In development, `?preview` shows sample numbers.
- **CI** (`.github/workflows/ci.yml`): GitHub Actions runs the type check, lint and Vitest on each pull request and on each push to `main` (TRD section 10). It uses no secrets, because these checks do not use Supabase.
- No new packages.

## Decisions (Hanif)

- Screen only. The level check that saves the session is a later feature.
- Save snapshot shows "coming soon" until snapshots (feature 6) exist.
- Use an existing color for the time card (Claude chose the page text color).
- Titles and labels as Claude suggested.
- The Perch device wakes up in place of a mascot.

## The test

`tests/level-summary.test.ts` checks the numbers on the screen. Accuracy is right tries divided by all tries (10 tasks and 3 mistakes give 77 %). The title is "clean" with no mistakes, "solid" with 1 or 2 and "complete" with 3 or more. The accuracy label is "perfect" at 100 %, "great" from 80 % and "good" below. The time shows as `m:ss`, or `h:mm:ss` from one hour.

- A change that makes it fail: if `titleTier` uses `mistakes < 2` in place of `mistakes <= 2`, a level with 2 mistakes shows "Level complete!" in place of "Solid build!", and the test fails.
- Red: the commit "Red: break titleTier on purpose" makes that change. The CI check on this PR fails (1 failed, 7 passed).
- Green: the next commit puts `<= 2` back. The CI check passes (91 passed).

Red (CI fails):

_(screenshot)_

Green (CI passes):

_(screenshot)_

## Checks

- `npm test`: 91 tests pass (8 new).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- GitHub Actions CI on this PR: see the checks below.
- Chromium, on a test page with the same component: 390 × 844 in light and dark mode, 1280 × 800, and reduced motion. Esc does not close the pop-up; Continue has the focus; no console errors.
- Not checked yet: the real route with a log-in. On your Mac: `npm run dev`, log in, open `/p/perch/1/complete?preview`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0163HgEYr6xScMLH3Wx8xyLz
