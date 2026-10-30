closes #126

## User story
As a learner, I want to click two holes to place a wire, resistor or LED on a 3D breadboard holding an ESP32-S3, so that I can wire the way I would on a real bench. Hovering a hole lights up everything connected to it. (PLAN.md row 3)

**Changed:** On a phone, I want the panels to stay small until I open them, so that the board fills most of the screen and I can tap the holes.

## What changed
- `lib/game/phone-layout.ts` (new): `panelStartsOpen(laptop, codeOpen)`. A laptop opens a side panel. A phone, or the open code panel, starts it closed.
- `components/build/task-list.tsx`, `components/build/connection-list.tsx`: the panels use `panelStartsOpen`. Their behaviour does not change.
- `components/build/board-actions.tsx`: on a phone (`max-sm`), the button row does not wrap. Clear, Check and Build it for me stay on one line.
- `components/build/build-for-me.tsx`: on a phone, the Build button is smaller (`min-h-11`, `px-3`, `text-sm`). Its label does not change.
- `components/build/popups.tsx`: the phone pop-up sheet is 160 px high (was 240 px). Its text scrolls inside it.
- `components/build/build-view.tsx`: on a phone, the tool bar is shorter (tool buttons `min-h-12`, smaller gap and tray row). Desktop classes do not change.
- `tests/phone-layout.test.ts` (new): 3 tests for `panelStartsOpen`.
- `prompts/phone-layout.md`, `prompts/phone-layout-pr.md`, `prompts/phone-layout-screens/`: prompt log, this text, before and after screenshots, and the measuring script.

## How it was tested
Plain English: the test checks the rule that decides if the task list and the connection list start open. On a laptop they start open. On a phone they start closed. When the code panel is open, they start closed, even on a laptop.

- Red (`59f5b26`): `vitest run tests/phone-layout.test.ts`: the suite failed before any test ran: `Error: Cannot find module '/lib/game/phone-layout.ts' imported from tests/phone-layout.test.ts`. "Test Files 1 failed, Tests no tests".
- Green (`871fb40`): `vitest run tests/phone-layout.test.ts`: 3 passed. `vitest run` (full): 47 files, 632 tests passed.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only, at 390 x 844 (touch) and 1280 x 800 (Chromium, Perch level 1, placeholder Supabase values, a temporary route that was removed before the commit):
  - Board height, with the task sheet open: before 412 px (49%), after 508 px (60.2%). Measured with `prompts/phone-layout-screens/measure-board.js`.
  - The button row: before, Clear and Check on one line and Build it for me on a second line (row 100 px). After, all three on one line (row 44 px).
  - The task list and the connection list start closed on the phone (before and after).
  - Desktop 1280 x 800: the before and after screenshots are pixel-identical.
- A real change that makes the test fail: in `panelStartsOpen`, return `true` when `laptop` is false, and the phone starts the panels open, so the phone test fails.

## Choices for Hanif
1. The pop-up sheet is now 160 px, not 240 px. This lets the board reach 60%. Long texts (Check, Mistake, Concept) scroll inside the sheet. Is this acceptable, or should the sheet stay at 240 px and the board be below 60%?
2. The 60% number is measured with the task sheet open. With no sheet, the board area is larger. Is this the right state to measure?
3. "Build it for me" keeps its full label at a smaller size. Should it use a short label, such as "Build", on a phone? That would be new text in `content/ui/build.json`.

## Not checked
- A real phone and real touch input (the check used Chromium with a touch viewport).
- The sheet with each long text (Check, Mistake, Concept), and the code panel open on a phone.
- Dark mode.
- The `e2e/` Playwright suite (needs the Supabase project; not run).
- The live Vercel app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
