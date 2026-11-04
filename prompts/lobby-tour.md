# Prompt log: Tour of the site for new users

1. Hanif's request (his words):

   "For new users logging into the website, can you provide them a tour of the site? The logic is to highlight things needed in order to get a grasp of what the website is and the functionality"

   Claude's work (not Hanif's words): a first-visit tour of the lobby. The lobby is the first page after the log-in. The tour uses the same card as the build-mode tour (issue #123), with its own steps, its own text and its own flag.

## Notes (Claude)

**How it works**

- `lib/game/tour.ts`: `LOBBY_TOUR_STEPS` (start, nav, xp, profile, play, dashboard), `LOBBY_TOUR_KEY` (`jumper:lobby-tour-seen`) and `TOUR_KEYS`. `tourPlan`, `tourSeen`, `markTourSeen` and `resetTour` take the steps or the key of a tour. With no argument, they work on the build tour as before.
- `components/build/tour.tsx`: the `Tour` card takes an optional `tour` (steps, key, label, text). Build mode does not change. A control that is out of view comes into view first, and the ring follows the control when the page scrolls.
- `components/lobby-tour.tsx` (new): the lobby tour. `app/lobby/page.tsx` shows it.
- `data-tour` attributes: the Start/Continue card, the top bar, the XP, the profile picture, the Build button and the Dashboard button of the dock.
- `content/ui/tour.json`: the text of the 6 lobby steps, in ASD-STE100.
- Profile: "Show the tours again" now removes the flags of both tours.

**Choices for Hanif**

1. The tour shows on the first visit to the lobby in each browser (`localStorage`), as the build tour. No database change.
2. Six steps: what Jumper is (on the Start card), Projects and My builds, XP, Profile, Build, Dashboard. The dock "Builds" button is not a step; the "My builds" tab step tells about saved boards.
3. On a laptop, the Start card is tall. The tour card cannot fit above or under it, so it covers the lower-right corner of the Start card (the Perch picture), not the Start button.

**Checks**

- Red: the 6 new tests in `tests/tour.test.ts` failed with the old `lib/game/tour.ts` (6 failed, 18 passed).
- Green: `vitest run tests/tour.test.ts`: 24 passed. `npm test`: 65 files, 863 tests passed. `npm run typecheck` and `npm run lint`: no errors.
- Browser, local only: a temporary page (removed before the commit) showed the lobby header, the Start card, a project card, the dock and the tour, with placeholder Supabase values. Chromium, 1280 x 800 and 390 x 844: all 6 steps showed in order. "Done" set `jumper:lobby-tour-seen`, the build tour flag stayed empty, and after a reload the tour did not show. No page errors. Screenshots: `prompts/lobby-tour-screens/`.

**Not checked**

- The real lobby with a log-in, the live Vercel app, a real phone, and dark/light theme changes.
- The profile button in a browser (the reset has unit tests).
- A person's check of the ASD-STE100 text.
- No task-observer skill is listed in this session, so it was not loaded.
