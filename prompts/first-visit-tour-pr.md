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
- `prompts/first-visit-tour.md`, `prompts/first-visit-tour-pr.md`, `prompts/first-visit-tour-screens/` (4 browser screenshots, 2 test-run screenshots).

## How it was tested
Plain English: the tests check the rules of the tour. They check which steps show when a control is missing. They check when the tour waits. They check that the flag is kept in one key and that a browser that blocks storage does not show the tour again. They check the side of the card for a control at the top, at the bottom, and in the middle of the screen. They check that each step has a title and a text.

- Red (`fc652e0`): `vitest run tests/tour.test.ts`: the test file did not load, because `@/content/ui/tour.json` and `@/lib/game/tour` did not exist. No test ran. Screenshot: `prompts/first-visit-tour-screens/red-tests.png`.
- Green (`a7ac725`): `vitest run tests/tour.test.ts`: 17 passed. `npm test`: 47 files, 646 tests passed. Screenshot: `prompts/first-visit-tour-screens/green-tests.png`.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only: a temporary route (removed before the commit) showed Perch level 2 in Chromium, with placeholder Supabase values. At 1280 x 800 and 390 x 844, the tour showed after the intro and the first "Got it". It showed 4 steps: the task list, Clear, Check and Build it for me. At every step, the card did not cover its control. Next on the last step, and Skip, both set the flag. After a reload the tour did not show. No page errors in the app. Screenshots: `prompts/first-visit-tour-screens/`.
- A real change that makes the test fail: if `cardSide` always returned `"bottom"`, two tests fail: the test for a control at the bottom of the screen, and the test for a control in the middle of the screen. (Checked by running the tests with that change, then restoring the file.)

## Choices (decided by Hanif)
1. The flag is in `localStorage`, one key per browser, with no migration. (Hanif: localStorage.)
2. The tour shows 4 steps on a first visit. The connection list step is skipped, because the list shows only after a failed Check. (Hanif: 4 steps.)
3. On a phone, the tour waits only for blocking pop-ups. The tour card can sit on top of the "Place" sheet, which stays open during tasks. (Hanif: do not wait for the sheet.)
4. A browser that blocks storage counts as "seen", so the tour does not come back on each visit. (Hanif: yes.)
5. The red and green test runs have screenshots: `prompts/first-visit-tour-screens/red-tests.png` and `green-tests.png`. (Hanif: add screenshots.)

## Not checked
- The "Show the tour again" button in a browser. The profile page needs a log-in. The reset has a unit test.
- A real phone with touch, dark mode, and the tour with the task list open on a phone.
- The live Vercel app.
- A person's check of the ASD-STE100 text.
- The connection list step after a failed Check, in a browser.
- The dev-only "1 Issue" badge covers the bottom-left corner on a phone in development. It is not part of the app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
