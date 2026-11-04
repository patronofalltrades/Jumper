# Prompt log: Tour of the site for new users

1. Hanif's request (his words):

   "For new users logging into the website, can you provide them a tour of the site? The logic is to highlight things needed in order to get a grasp of what the website is and the functionality"

   Claude's work (not Hanif's words): a first-visit tour of the lobby. The lobby is the first page after the log-in. The tour uses the same card as the build-mode tour (issue #123), with its own steps, its own text and its own flag.

2. Hanif's request (his words):

   "can you use shadcn components for the tour and use react element?"

   Claude asked what he meant. Hanif's choices (from the question form): "Popover + Card", and "React refs, not data-tour".

3. Hanif's request (his words), during the work:

   "work in Features/Onboard-Tour-For-New-Users"

   Claude's work (not Hanif's words): the first commit of the tour was on `claude/awesome-wright-rr79kn`. Claude put it on `Features/Onboard-Tour-For-New-Users` (cherry-pick), after the two onboarding-gate commits that were already on that branch.

4. Hanif's request (his words):

   "move the build tour to the same Popover setup too"

## Notes (Claude)

**How it works**

- `lib/game/tour.ts`: `LOBBY_TOUR_STEPS` (start, nav, xp, profile, play, dashboard), `LOBBY_TOUR_KEY` (`jumper:lobby-tour-seen`) and `TOUR_KEYS`. `tourPlan`, `tourSeen`, `markTourSeen` and `resetTour` take the steps or the key of a tour. With no argument, they work on the build tour as before.
- `components/tour.tsx`: one tour for the lobby and build mode. `<Tour steps storageKey copy busy>` wraps the page and keeps the state (flag, plan, step). `<TourStep id="…">` wraps one control. It gives the tour a React ref through Radix `PopoverAnchor asChild` (no `data-tour`, no `document.querySelector`). The active step adds a ring to the control and opens a shadcn `Popover` with a shadcn `Card` (Volt, step count, title, text, Skip and Next).
- Radix places the card, flips it when there is no room, keeps it in the window, and ends the tour on Escape. A click outside does not close it. The focus goes to Next.
- The Start card is too tall for a card above or under it on a laptop, so on a screen 640 px or wider its card goes on the right (`wideSide="right"`).
- `components/ui/popover.tsx` and `components/ui/card.tsx`: added with `npx shadcn@latest add popover card`. The CLI also added an npm package named `cn` (a wrong alias). Claude removed it and pointed the files at `@/lib/utils`. No new dependency: Popover comes from `radix-ui`, which is already installed.
- `components/lobby-tour.tsx`: the lobby's `<Tour>`, with the lobby steps, key and text.
- Build mode (request 4): `components/build/build-view.tsx` wraps the view in `<Tour>`, with the build steps, key, text and `busy` (as before: the tour waits while a pop-up, the intro clip or the Check card is open). The task list, the connection list, Clear, Check and "Build it for me" are each in a `<TourStep>`. The old card (`components/build/tour.tsx`) and all `data-tour` attributes are gone.
- A control that leaves the page during the tour (the Check row under a pop-up) is left out, and the tour goes on, as before.
- `cardSide` and its 3 tests are removed from `lib/game/tour.ts`: Radix now decides the side of the card, so no code used it.
- Bug that Claude found in the browser and repaired before the commit: build mode first showed only 1 step. When the pop-up closes, the Clear and Check row comes back in the same render, but the plan was made from a list of controls that did not have them yet. Repair: the tour keeps a ref of the controls that changes at once, and makes the plan from it.
- `content/ui/tour.json`: the text of the 6 lobby steps, in ASD-STE100. Profile: "Show the tours again" removes the flags of both tours.

**Choices for Hanif**

1. The tour shows on the first visit to the lobby in each browser (`localStorage`), as the build tour. No database change.
2. Six steps: what Jumper is (on the Start card), Projects and My builds, XP, Profile, Build, Dashboard.
3. Both tours use Popover and refs (Hanif's request). The build tour keeps its steps, text, flag and "busy" rules.
4. `cardSide` and its 3 unit tests (from issue #123) are removed, because Radix places the card now.

**Checks**

- Red: the 6 new tests in `tests/tour.test.ts` failed with the old `lib/game/tour.ts` (6 failed, 18 passed).
- Green: `npm test`: 65 files, 862 tests passed (3 `cardSide` tests removed). `npm run typecheck` and `npm run lint`: no errors.
- A real change that makes a test fail: `markTourSeen` always writing `jumper:tour-seen` makes "keeps its own flag, so the build tour still shows after the lobby tour" fail (run, then restored).
- Browser, local only: a temporary page (removed before the commit) showed the lobby header, the Start card, a project card, the dock and the tour, with placeholder Supabase values. Chromium, 1280 x 800 and 390 x 844: all 6 steps showed in order, with one ring each time, and the card did not cover the control. The focus was in the card. "Done" and Escape each set `jumper:lobby-tour-seen`. After a reload the tour did not show. No page errors. Screenshots: `prompts/lobby-tour-screens/`.
- Build mode, local only: a temporary page (removed) showed Perch level 2 from the content JSON, with placeholder Supabase values. Chromium, 1280 x 800 and 390 x 844: the tour waited for the clip and the pop-ups, then showed 4 steps (task list, Clear, Check, Build it for me), with the card in the window and not on the control. "Done" set `jumper:tour-seen` and not the lobby flag. No page errors. The "could not save" alert and the "1 Issue" badge come from the placeholder values and the dev server. Screenshots: `prompts/lobby-tour-screens/build-*.png`.

**Not checked**

- The real lobby with a log-in, the live Vercel app, a real phone, and screen-reader use.
- The profile button in a browser (the reset has unit tests).
- A person's check of the ASD-STE100 text.
- No task-observer skill is listed in this session, so it was not loaded.
