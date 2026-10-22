# Prompt log: Task list in levels (issue #52)

1. "issue 52, todo list in levels, branch https://github.com/patronofalltrades/Jumper/tree/Feature%2FTo-do-in-levels read all documenttion before touching code"

   Claude read issue #52, CLAUDE.md, AGENTS.md, README.md, PLAN.md, the PRD, the TRD, `schema.md`, the ledger, the walkthrough prompt logs, the task engine, the board store, build mode, the guide bar, the pop-ups, the autosave and the level Check. Claude worked on `Feature/To-do-in-levels`, the branch that Hanif made.

   Claude built:
   - `taskMarks()` in `lib/game/engine.ts` (pure, no React, no 3D): the mark of each task, `done`, `now` or `todo`. A tick comes from the board as it is now. A task that needs only "Got it" is done when the learner pressed it. A button or a resistor can use either side, as in the task engine. Only the tasks that the learner reached can get a tick. "Now" is the task of the pop-up; after the last task, the first task that is not done.
   - Tests first (red, then green), in `tests/engine.test.ts`: an empty board, the "Got it" tasks of level 1, a full board, a board with one wire removed (and put back), a button used on its other side, a part put down before its task. Each Perch level, played with its finished board, ends with a tick on every task.
   - `components/build/task-list.tsx`: the "Tasks" panel at the top-left of the board, below the guide bar. The header shows "Tasks · 3 of 8 done". A green tick, a ring in the primary color with bold text, or an empty circle. A screen reader reads "Done", "Now" or "To do" before each task, and the task of now has `aria-current="step"`. Laptop: it starts open. Phone: a "Tasks 3/8" chip; a tap opens the list, a second tap closes it. Not on the intro card.
   - Build mode: the guide bar and the panel are in one column, so the panel is always below the guide bar. Only the panels take clicks. When the Check button shows, the column stops above it.
   - Text in `content/ui/build.json` (`tasks`).

   Checks: 248 tests, the type check, lint and the build pass. Browser check on a temporary page (not committed) that opens build mode with the Perch content and placeholder Supabase keys, at 390 × 844 and 1280 × 800, light and dark: no panel on the intro; open on a laptop, a chip on a phone that opens and closes with a tap; Level 1 shows "3 of 7 done" after 3 × "Got it"; a finished Level 2 with the GPIO 2 wire removed shows "7 of 8 done" and that task is now; with the wire back, "8 of 8 done"; the panel does not cover the guide bar, the Check button or the tool bar; no page errors, no sideways scroll. The real routes need a log-in, so they are not checked in a browser in this session.

2. "the text "press got it" should just be a button instead besides the task list. Make it collapsible"

   Claude asked 2 questions. Answers: remove the sentence from the content ("Content"), and make the collapse of the whole panel easier to see ("Whole panel, clearer").

   Claude changed:
   - `content/projects/perch.json`: Level 1 tasks 1 to 3 no longer say "Read about it, then press Got it." or "Press Got it.". The pop-ups and the task list both use the shorter text. Run `npm run seed` after the merge, so the database gets the new text.
   - Task list: the task of now gets a "Got it" button in its row when its part is always on the bench (a breadboard, the ESP32-S3). It does the same as the "Got it" of the pop-up.
   - Task list: the header has a − button (hide the tasks) or a + button (show the tasks), with a tooltip.

   Checks: 248 tests, the type check, lint and the build pass. Browser check on the temporary page at 1280 px (light) and 390 px (dark): no "Got it" in the task text; the list "Got it" shows for tasks 1, 2 and 3 of Level 1 and gives "3 of 7 done"; no "Got it" on a wire task; − closes the list and + opens it. No page errors.

3. "resolve ledger conflict"

   Claude merged `main` into the branch and kept both sides of the 4 ledger conflicts.

4. Screenshot of Level 2 (the "All tasks are done" card over an empty board, "Tasks · 0 of 8 done"): "im stuck on this page because there is no way to exit it or to close the pop up"

   Cause: the "All tasks are done" card had only the Check button, and Check is off on an empty board. Only the card of a failed Check had "Fix the board". Fix: the "All tasks are done" card also has "Fix the board" (`components/build/popups.tsx`). It closes the card; the Check button stays on the board. Browser check on the temporary page with the same saved board (Level 2, all tasks passed, then all parts removed) at 1280 px dark and 390 px light: the button shows, the card closes, the Check button stays. No page errors.

5. Claude asked: change the "All tasks are done" wording now, or leave it for a separate issue? Hanif: "yes" (read as "change it now").

   The Check card counts the ticks of the task list. When not every task has a tick, its title is "Some tasks are not done", and the text is "{n} of {total} tasks are done. Use the task list to finish the other tasks. Then press Check." (`content/ui/build.json`). Check stays on, so the learner can still press it. Browser check at 1280 px dark and 390 px light: an empty Level 2 board ("0 of 8"), one wire removed ("7 of 8"), and a full board ("All tasks are done"). No page errors.
