# Prompt log: First-visit tour of build mode (issue #123)

1. Hanif's request for the batch #122 to #127 (his words):

   "start working on #122 to #127 in different subsessions using haiku 5.5"

   Claude's work for #123 (not Hanif's words): the tour of build mode. The steps are in issue #123: a tour of the task list, the connection list, Check, Clear and Build it for me. It shows once for each browser. The profile page has "Show the tour again".

## Ledger notes (Claude, for the parent session)

Claude did not edit `PLAN.md` or `ledger/LEDGER.md`. The parent session adds the ledger entry and the Plan vs. Reality row.

**How it works**

- `lib/game/tour.ts`: pure rules. The steps (`TOUR_STEPS`), the plan (only the steps whose control is on the page), the next step, when the tour shows, the seen flag, and the side of the card.
- `components/build/tour.tsx`: the card. It reads the flag after the first render, makes the plan when it first shows, and places the card. It points at the control with a ring. It moves on when a control is gone.
- `components/build/build-view.tsx`: `tourBusy` is true while the intro clip plays, while the intro, a concept, a "what happened" or a mistake pop-up is open, while a "Got it" task is open, while the Check card, the code panel, Perch alive or the demo is open.
- `data-tour` attributes on the task list, the connection list, Clear, Check and "Build it for me".
- `content/ui/tour.json`: the text, in ASD-STE100. `content/ui/profile.json`: the text of the profile button.
- `components/profile/tour-again.tsx`: the "Show the tour again" button. It clears the flag.

**Choices made (also in the PR text, "Choices for Hanif")**

- The flag is in `localStorage` under one key, `jumper:tour-seen`. No migration, no `profiles` column, because the issue allows it.
- The connection list has no control on a first visit. It shows only after a failed Check. So the first visit shows 4 steps. The plan leaves out a missing step.
- A browser that blocks storage counts as "seen". The tour does not come back on each visit.
- The card goes under the control, or above it, on whichever side has room. It does not cover the control.
- The tour waits for blocking pop-ups only. On a phone, the "Place" sheet (a task with no "Got it") stays open during the task. The tour card can sit on top of that sheet. This is a choice for Hanif.

**Checks**

- Red: `fc652e0` ("Add red tests"). `vitest run tests/tour.test.ts`: the file did not load (`@/lib/game/tour` and `@/content/ui/tour.json` do not exist). No test ran.
- Green: `a7ac725`. `vitest run tests/tour.test.ts`: 17 passed. `npm test`: 47 files, 646 tests passed.
- Mutation check (not committed): `cardSide` set to always return "bottom". 2 of 17 tests failed. The file was restored, and 17 passed.
- `npm run typecheck`: exit 0. `npm run lint`: exit 0.
- Browser, local only. A temporary route `/tour-preview` (removed) rendered build mode for Perch level 2 with placeholder Supabase values. A temporary bypass in `proxy.ts` (reverted; `git status` shows no change to it). Playwright in Chromium at 1280x800 and 390x844:
  - The tour did not show during the intro clip or the intro pop-up.
  - After "Got it" on the concept pop-up, the tour showed 4 steps: task list, Clear, Check, Build it for me.
  - At every step, the card did not overlap its control at either size.
  - Next on the last step set `jumper:tour-seen` to `1`. The tour did not come back after a reload.
  - Skip set the flag and hid the card.
  - No page errors in the app. The "1 Issue" badge and the "We could not save your progress" alert come from the dev server and the placeholder Supabase values. They are not part of this change.
  - The dev-only "1 Issue" badge sits over the bottom-left corner on a phone, and it blocked a real click on "Skip the tour" in a test. Claude used a DOM click for that step.
- Screenshots: `prompts/first-visit-tour-screens/` (4 files).

**Not checked**

- The profile button in a browser. The profile page needs a log-in. The reset itself has a unit test (`resetTour` removes the key).
- A real phone with touch, dark mode, and the tour with the task list open on a phone.
- The live Vercel app.
- A human check of the ASD-STE100 text.
- The tour after a failed Check (the connection list step). Not run in the browser.
- No task-observer skill is listed in this session, so it was not loaded.
