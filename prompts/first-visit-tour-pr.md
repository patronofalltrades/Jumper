closes #123

## User story
As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words. (PLAN.md row 18)

## What changed
- `lib/game/tour.ts` (new): pure rules, with no React and no DOM. The steps (`TOUR_STEPS`), the plan (only the steps whose control is on the page), the next step, when the tour shows, the seen flag in `localStorage` (one key, `jumper:tour-seen`), and the side of the card. Storage that the browser blocks counts as seen.
- `content/ui/tour.json` (new): the title and the text of each step, the buttons and the step count. ASD-STE100.
- `components/build/tour.tsx` (new): the tour card. It points at one control at a time with a ring, and it has Next and Skip. It reads the flag after the first render. The card goes under the control, or above it, so it does not cover the control. A control that is not on the page is left out.
- `components/build/build-view.tsx`: the tour waits while the intro clip plays, while the intro, a concept, a "what happened" or a mistake pop-up is open, while a "Got it" task is open, and while the Check card, the code panel, Perch alive or the demo is open.
- `components/build/task-list.tsx`, `connection-list.tsx`, `board-actions.tsx` (Clear and Check), `build-for-me.tsx`: a `data-tour` attribute on each control. Nothing else changes in them.
- `components/profile/tour-again.tsx` (new) and `app/profile/page.tsx`: the "Show the tour again" section. It removes the flag.
- `content/ui/profile.json`: the text of that section.
- `tests/tour.test.ts` (new): 17 tests.
- `prompts/first-visit-tour.md`, `prompts/first-visit-tour-pr.md`, `prompts/first-visit-tour-screens/` (4 screenshots).

## How it was tested
Plain English: the tests check the rules of the tour. They check which steps show when a control is missing. They check when the tour waits. They check that the flag is kept in one key and that a browser that blocks storage does not show the tour again. They check the side of the card for a control at the top, at the bottom, and in the middle of the screen. They check that each step has a title and a text.

- Red (`fc652e0`): `vitest run tests/tour.test.ts`: the test file did not load, because `@/lib/game/tour` and `@/content/ui/tour.json` did not exist. No test ran.
- Green (`a7ac725`): `vitest run tests/tour.test.ts`: 17 passed. `npm test`: 47 files, 646 tests passed.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only: a temporary route (removed before the commit) showed Perch level 2 in Chromium, with placeholder Supabase values. At 1280 x 800 and 390 x 844, the tour showed after the intro and the first "Got it". It showed 4 steps: the task list, Clear, Check and Build it for me. At every step, the card did not cover its control. Next on the last step, and Skip, both set the flag. After a reload the tour did not show. No page errors in the app. Screenshots: `prompts/first-visit-tour-screens/`.
- A real change that makes the test fail: if `cardSide` always returned `"bottom"`, two tests fail: the test for a control at the bottom of the screen, and the test for a control in the middle of the screen. (Checked by running the tests with that change, then restoring the file.)

## Choices for Hanif
1. The flag is in `localStorage`, one key per browser, and there is no migration. The issue allows this. Do you accept it, or do you want the flag in `profiles` (a database change)?
2. The connection list has no control on a first visit, because it shows only after a failed Check. So the tour shows 4 steps, not 5. Do you want a note in the tour for the connection list, or is 4 steps enough?
3. The tour waits for the blocking pop-ups only. On a phone, the "Place" sheet of a task with no "Got it" stays open during the task, and the tour card can sit over it. If you want the tour to wait for that sheet too, the tour would not show on a phone during the tasks. Which do you want?
4. A browser that blocks storage counts as "seen", so the tour does not come back on each visit. Do you accept this?
5. The unit test has text output here, not screenshots. Assignment rule 3 asks for a red and a green screenshot. Do you want screenshots of the test runs in this PR?

## Not checked
- The "Show the tour again" button in a browser. The profile page needs a log-in. The reset has a unit test.
- A real phone with touch, dark mode, and the tour with the task list open on a phone.
- The live Vercel app.
- A person's check of the ASD-STE100 text.
- The connection list step after a failed Check, in a browser.
- The dev-only "1 Issue" badge covers the bottom-left corner on a phone in development. It is not part of the app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
