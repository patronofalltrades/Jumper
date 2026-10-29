closes #112

## User story
As a learner, I want to see all the tasks of the level as a list that I can track (done, now, to do). (PLAN.md, Plan vs. Reality row 20)

## What changed
- `components/build/panel-header.tsx` (new): `PanelHeader`, the header button of a side panel (the look of the task list header, `aria-expanded`, a minus to close and a plus to open), and `usePanelOpen`, the open state (open on a laptop, closed on a phone, until the learner taps; then the choice stays while the level is open).
- `components/build/connection-list.tsx`: the header is now this button. Closed, the list is a small chip with the count ("Connections · 12 of 13 right"). It takes a new `laptop` prop. The rows did not change.
- `components/build/task-list.tsx`: uses the same button and hook. Same look and behavior as before.
- `components/build/build-view.tsx`: passes `laptop` to the connection list (one line).
- `content/ui/build.json`: `connections.show` and `connections.hide` (the tooltip), in ASD-STE100.
- `tests/collapsible-panels.test.ts` (new): 2 tests. The red commit (`1093755`) came before the fix (`a59ccc9`).
- `PLAN.md`: row 41 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/collapsible-panels.md`, `prompts/collapsible-panels-pr.md`, `ledger/LEDGER.md`: prompt log and ledger entry.

Other panels on the board: the guide bar is one line of help, not a list; the sketch panel and the Check card already have a close button; the task pop-up on a laptop goes away with its task. So only the connection list needed the new header.

## How it was tested
- Plain English: the test draws the connection list as a laptop and as a phone. On a laptop the header button must say "open" (`aria-expanded="true"`) and the list must show. On a phone the button must say "closed", the header must show the count, and the list must not show.
- Red: `npx vitest run tests/collapsible-panels.test.ts`: 2 failed (no `aria-expanded` in the header; the list showed on a phone).
- Green: `tests/collapsible-panels.test.ts` 2 passed. `npx vitest run`: 558 passed in 41 files.
- `npx next typegen && npx tsc --noEmit`: exit 0. `npx eslint`: exit 0.
- A real change that makes the test fail: remove `{open && (...)}` around the `<ol>` in `connection-list.tsx`, and the phone test fails, because the list shows when it must be closed.
- Browser, local only: a temporary route (removed before the commit) showed the Perch level 2 task list and connection list in Chromium at 1280 x 800 and 390 x 844. Laptop: both open; a click on the connection header closed it to a chip. Phone: both closed; a click opened the connection list. No page errors. No Supabase project was used.

## Not checked
- A click test in Vitest. Testing Library and jsdom are not in the TRD, so they were not added (house rule 8). The click was checked in Chromium only.
- The list after a real failed Check (that needs a log-in and the live Supabase project), and the live Vercel app.
- Touch on a real phone.
- Merge with the sibling PRs. #113 changes the rows of `task-list.tsx` and `connection-list.tsx`; this diff changes only the header and the open state, but a conflict near the `<ol>` of the connection list is possible. All sibling PRs add rows to `PLAN.md` and `ledger/LEDGER.md`, and some change `content/ui/build.json`, so conflicts there are likely.
- Assignment rule 3 screenshots (red and green). They apply only if this test counts as a required test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
