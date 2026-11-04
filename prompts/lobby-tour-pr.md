closes #N

## User story
As a new user, after my first log-in I want a short tour that shows what Jumper is and where the main controls are, so that I know how to start and where to find my builds, XP, profile and dashboard.

## What changed
- `lib/game/tour.ts`: the lobby tour steps (`LOBBY_TOUR_STEPS`), its flag (`jumper:lobby-tour-seen`) and `TOUR_KEYS`. The rules take the steps or the key of a tour. The build tour does not change.
- `components/build/tour.tsx`: the tour card takes an optional tour. It brings a control into view first, and the ring follows it on scroll.
- `components/lobby-tour.tsx` (new) and `app/lobby/page.tsx`: the lobby tour.
- `components/lobby-cards.tsx`, `lobby-header.tsx`, `dock.tsx`: `data-tour` attributes only.
- `content/ui/tour.json`: the text of the 6 steps. `content/ui/profile.json`: "Show the tours again".
- `components/profile/tour-again.tsx`: it resets both tours.
- `tests/tour.test.ts`: 7 new tests.

## How it was tested
Plain English: the new tests check the order of the lobby steps, that a missing Start card is left out, that the lobby tour does not take the build tour's steps, that each tour keeps its own flag, that "Show the tours again" knows both keys, and that each step has a title and a text.

- Red: with the old `lib/game/tour.ts`, 6 of the new tests failed.
- Green: `npm test`: 65 files, 863 tests passed. Typecheck and lint: no errors.
- Browser (local, temporary page, removed): all 6 steps at 1280 x 800 and 390 x 844. "Done" kept the flag; the tour did not show after a reload. Screenshots: `prompts/lobby-tour-screens/`.
- A real change that makes the test fail: if `markTourSeen` always wrote `jumper:tour-seen`, the test "keeps its own flag, so the build tour still shows after the lobby tour" fails.

## Choices for Hanif
1. A flag in `localStorage`, once per browser, with no database change.
2. Six steps: Start card, top bar, XP, profile, Build, Dashboard.
3. On a laptop the tour card covers the lower-right corner of the tall Start card (the Perch picture).

## Not checked
- The real lobby with a log-in, the live app, a real phone, and a person's check of the ASD-STE100 text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnQe5PWxxuo6QiH2FEw
