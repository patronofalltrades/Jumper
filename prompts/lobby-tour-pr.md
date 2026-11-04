closes #N

## User story
As a new user, after my first log-in I want a short tour that shows what Jumper is and where the main controls are, so that I know how to start and where to find my builds, XP, profile and dashboard.

## What changed
- `components/tour.tsx` (new): one tour for the lobby and build mode. `<Tour>` wraps the page and keeps the state. `<TourStep id="…">` wraps one control and gives the tour a React ref (Radix `PopoverAnchor asChild`). The active step puts a ring on the control and opens a shadcn Popover with a shadcn Card. Radix places and flips the card, and ends the tour on Escape. The focus goes to Next. On a wide screen the Start step's card goes on the right.
- `components/ui/popover.tsx`, `components/ui/card.tsx` (new, from `npx shadcn@latest add popover card`). No new npm package.
- `lib/game/tour.ts`: the lobby steps (`LOBBY_TOUR_STEPS`), its flag (`jumper:lobby-tour-seen`) and `TOUR_KEYS`. The rules take the steps or the key of a tour. The build tour does not change.
- `components/lobby-tour.tsx` (new): the lobby's tour. `app/lobby/page.tsx`, `components/lobby-cards.tsx`, `lobby-header.tsx`, `dock.tsx`: `<LobbyTour>` and `<TourStep>` wrappers only.
- Build mode: `components/build/build-view.tsx` wraps the view in `<Tour busy={…}>` with the build steps. `task-list.tsx`, `connection-list.tsx`, `board-actions.tsx` (Clear, Check) and `build-for-me.tsx`: `<TourStep>` in place of `data-tour`. `components/build/tour.tsx` (the old card) is removed. The steps, text, flag and wait rules of the build tour do not change.
- `lib/game/tour.ts`: `cardSide` is removed (Radix places the card), with its 3 tests.
- `content/ui/tour.json`: the text of the 6 steps. `content/ui/profile.json` and `components/profile/tour-again.tsx`: "Show the tours again" resets both tours.
- `tests/tour.test.ts`: 7 new tests.

## How it was tested
Plain English: the new tests check the order of the lobby steps, that a missing Start card is left out, that the lobby tour does not take the build tour's steps, that each tour keeps its own flag, that "Show the tours again" knows both keys, and that each step has a title and a text.

- Red: with the old `lib/game/tour.ts`, 6 of the new tests failed.
- Green: `npm test`: 65 files, 862 tests passed (3 `cardSide` tests removed with the function). Typecheck and lint: no errors.
- Browser (local, temporary page, removed): all 6 steps at 1280 x 800 and 390 x 844, with the card next to its control and not on it. "Done" and Escape kept the flag; the tour did not show after a reload. Screenshots: `prompts/lobby-tour-screens/`.
- Build mode in the browser (local, temporary page, removed): Perch level 2. The tour waited for the clip and the pop-ups, then showed 4 steps at both sizes. "Done" set only the build flag. Screenshots: `prompts/lobby-tour-screens/build-*.png`.
- A real change that makes the test fail: if `markTourSeen` always wrote `jumper:tour-seen`, the test "keeps its own flag, so the build tour still shows after the lobby tour" fails.

## Choices for Hanif
1. A flag in `localStorage`, once per browser, with no database change.
2. Six steps: Start card, top bar, XP, profile, Build, Dashboard.
3. shadcn Popover + Card, with React refs in place of `data-tour`, for both tours (Hanif's choice).

## A bug that the agent made, and the repair
- What occurred: after the move of the build tour, build mode showed only 1 step (the task list) in place of 4.
- How it was found: Claude found it in the browser check, before the commit (not Hanif).
- How it was repaired: the Clear and Check row comes back in the same render as the pop-up closes, and the plan was made from a list that did not have those controls yet. The tour now keeps a ref of the controls that changes at once, and makes the plan from it. The browser check then showed 4 steps.

## Not checked
- The real lobby with a log-in, the live app, a real phone, and a person's check of the ASD-STE100 text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnQe5PWxxuo6QiH2FEw
