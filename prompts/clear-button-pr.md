closes #114

## User story
As a learner, I want to click two holes to place a wire, resistor or LED on a 3D breadboard holding an ESP32-S3, so that I can wire the way I would on a real bench. Hovering a hole lights up everything connected to it. (PLAN.md row 3)

## What changed
- `lib/game/board-store.ts`: new action `clear`. It removes the parts that the learner put in this level (`placedParts` of `lib/circuit/check.ts`) and keeps the `base` parts. It goes through the same `commit` as a removal, so it is one Undo step, and the engine sees a "change" with no added part: the tasks go back, and the XP, the task count and the mistake count do not change. A board with no part from the learner, or a read-only board, does not change.
- `components/build/board-actions.tsx` (new): the button row at the bottom of the board, with Clear and Check. Clear opens the shadcn dialog (`components/ui/dialog.tsx`) and asks once. Check is off until all tasks are done. The empty-board note and the "open the code" button stay as before (only when all tasks are done). **"Build it for me" (#115) can add one button to this row after the merge.**
- `components/build/build-view.tsx`: the old Check block moves to `BoardActions`. The row shows in each phase after the intro, and hides while a pop-up covers the board, the Check card is open, the code panel is open, or Perch comes alive. The task column stops above the row.
- `content/ui/build.json`: the text `play.clear`, in ASD-STE100.
- `tests/board-store.test.ts`: 4 tests for `clear`. The red commit (`845c631`) came before the change.
- `PLAN.md`: row 43 at the end of "Plan vs. Reality". No other line changed.
- `prompts/clear-button.md`, `prompts/clear-button-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

## How it was tested
Plain English: the tests put wires and an LED on a board that starts with one wire, then press Clear in code. Only the start wire must stay, and one Undo must put all the parts back. On Perch level 1, the tests finish all the tasks, press Clear, and the level must go back to the first wire task, with the same XP, tasks done and mistakes.
- Red (`845c631`): `vitest run tests/board-store.test.ts`: 4 failed (`store.getState(...).clear is not a function`), 29 passed.
- Green (`ab080fe`): `vitest run tests/board-store.test.ts`: 33 passed. `vitest run`: 40 files, 560 tests passed.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint .`): exit 0.
- Browser, local only: a temporary public route (removed before the commit) with placeholder Supabase values showed Perch level 2 in Chromium at 1280 x 800 and 390 x 844. The row showed Clear and Check, both off. After one wire, Clear turned on. The dialog opened; Cancel kept the wire; "Remove the parts" removed only the new wire (5 parts to 4); Undo put it back. No page errors. No Supabase project was used.
- A real change that makes the test fail: in `clear`, filter out all parts (not only the placed parts), and the level 1 parts and the start wire go too.

## Not checked
- The live Vercel app, a real log-in, and touch on a real phone.
- The row in dark mode, and the row together with the code panel or the Check card on a phone.
- A disabled Check before the tasks are done has no note that tells why (the issue asked for no note).
- Merge with the sibling PRs (#111, #112, #113, #115): `PLAN.md`, `ledger/LEDGER.md` and `content/ui/build.json` will likely conflict (rows and keys added at the same places). #115 adds its button to `components/build/board-actions.tsx`, and may also touch `build-view.tsx` and `lib/game/board-store.ts`. #111 adds a button to the tool bar in `build-view.tsx`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
