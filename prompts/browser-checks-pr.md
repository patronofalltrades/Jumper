# PR text: Flows that were never checked in a real browser (#80)

**Title:** Add browser checks for the 5 flows that were never checked in a browser

**Body:**

closes #80

## User story

PLAN.md row 12 (Tests): Data isolation and dashboard stat tests (section 4). Added: as the owner, before Demo Day, I want the flows that were never checked in a real browser to be tested, so that nothing breaks in front of people.

## Summary

- A Playwright suite in `e2e/` and the script `npm run e2e`. It builds the app, starts it (`npm start` on port 3100), runs 18 tests on 2 projects (`phone`: 390 × 844 with touch on; `laptop`: 1280 × 800), and stops the app.
- Each test makes its own temporary account on the Supabase project with `SUPABASE_SECRET_KEY` and deletes it at the end, also when the test fails. The test fails if a row of the account is left. A global set-up deletes `jumper-e2e-` accounts that an earlier run left, and a global tear-down fails the run if one stays. The key stays in the test process; it is in no file. The suite writes nothing else to the project and does not seed.
- Levels are passed with the real Check of the app: the test presses Start (the app makes the session row), puts the finished board of the level in the browser storage with that session (as in #57, #58 and #62), reloads, and presses the real Check button. The real `record_attempt` runs.
- Scenarios (Given / When / Then) are in `prompts/browser-checks.md`. Each test says in plain words what it checks. Screenshots are in `prompts/browser-checks-screens/` (40 files).
- README: a "Browser checks" section and a line in the Checks table.
- Not changed: no migration, no change to levels or tasks, no change to the saved-board format, no change to `.github/workflows/` (the suite is not in CI), no new package (`@playwright/test` was already a dev package), `vitest.config.ts` (it includes only `tests/**`).

## The 5 flows

| # | Flow | Tests | Result |
| --- | --- | --- | --- |
| 1 | Level map with Volt (#44) | 4: phone and laptop, light and dark | Pass. A new account: Volt on Level 1. After the real Check of Level 1: Volt on Level 2. After all 5 Perch levels pass: Volt on Level 5. He is in the screen, the bottom bar does not cover him, and the page has no sideways scroll. |
| 2 | A real touch on the 3D button while a sketch runs (#58) | 2: phone (real touch events from the browser) and laptop (mouse) | Pass. Arduino Foundations level 3, the sketch runs, a finger on the 3D button holds the button down (the cap goes down and the L light turns on), and the button is up when the finger leaves. The test never presses the "Hold to press" button of the panel. |
| 3 | Walkthrough video in dark mode (#49) | 4: intro video (no log-in) and Perch level 1 video, at both sizes | Pass. No WebGL (`--disable-3d-apis`) and dark mode: the right file plays (phone file at 390 px, laptop file at 1280 px), the time moves, the window is dark and readable, Esc closes it and the focus goes back to the button. |
| 4 | Log out button of the profile page (#64) | 4: phone and laptop, light and dark | Pass. The bottom bar does not cover the button, it is 44 px high, a real tap logs out, and `/lobby` then goes to `/login`. |
| 5 | Dark mode in the code step (#58) | 4: phone and laptop, dark and light | Pass. The editor is dark in dark mode; the hints, buttons and the messages of a mistake, a fail and a pass are readable (see the notes below). |

## Bugs found by Claude's browser check

No bug in the app. The first runs of each flow failed many times, always in the check script (a slow first log-in, a status of 206 for the video, the level clip over the Start button, a click on a button under the Check card, a canvas scan that was too slow, a first contrast limit, and a scroll position); the app was right each time, and the ledger lists them in Corrections.

Notes for Hanif (nothing changed; none of them is a new issue unless Hanif wants it):

1. **Contrast.** The PRD and the TRD have no contrast rule. The suite holds the panel texts to 4.5 : 1 and the colored code and the line numbers to 3 : 1. Measured near misses under 4.5 : 1: dark mode line numbers 4.04; light mode comments 4.08 and 4.32; light mode `OUTPUT` on the red mark of a mistake 4.32. Fix, if wanted: 3 color tokens in `app/globals.css` (about 3 lines).
2. **The videos are light mode.** In the dark window the video is a light rectangle (#49 recorded light mode only). The browser's video controls cover the second line of the caption that is in the video picture.
3. **Phone, code panel, hints open.** In `flow5-code-phone-dark-3-goal-fails.png`, the first line of the fail message is under the Run row until the panel scrolls. The panel does scroll. The suite does not check it.

## Does a test fail when the app breaks?

Three changes on purpose, then reverted (Claude, not part of the diff):

- Volt on the wrong level (`here={i === here + 1}`): both Flow 1 tests on the laptop fail.
- The 3D button cap does not take the pointer (`onPress={undefined}`): Flow 2 fails ("the 3D button is on the canvas, and a touch on it presses it": null).
- The editor background of dark mode is white: the dark Flow 5 test fails ("the editor is dark": luminance 1). The light Flow 5 test stays green.

## Tests

- `npm run e2e`: **18 passed (2.3 min)**: Flow 1 × 4, Flow 2 × 2, Flow 3 × 4, Flow 4 × 4, Flow 5 × 4.
- `npm run typecheck`, `npm run lint`, `npx vitest run` (28 files, 400 tests, the same as before), `npm run build`: pass.
- Chromium only. Not checked: Safari, Firefox, a real phone, sound and vibration.

## Account clean-up

Each test deletes its account in a `finally` block and then counts the rows of the account (profile, sessions, attempts, snapshots, stars): 0 each time. After the full run, the global tear-down printed "Clean-up: 0 temporary accounts left", and a separate check with the secret key found 0 accounts with `jumper-e2e-` in the email.

## How to run `npm run e2e`

1. One time on a new computer: `npx playwright install chromium` (or set `CHROMIUM_PATH` to an existing Chromium).
2. `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`, and the database has the seeded projects (`npm run seed`). Perch and Arduino Foundations must be `available`.
3. `npm run e2e` (it builds and starts the app). One flow: `npm run e2e -- flow2`. An app that already runs: set `BASE_URL`.

No migration, no change to levels or tasks.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnQkfX3mxHqp6kfZiFg
