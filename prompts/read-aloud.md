# Prompt log: Build mode, read the task aloud (issue #135)

1. Hanif's prompt (his words):

   "build 3, 5 and 6, write the issue text. Open Issues for each stories"

   Claude's note: Claude read this as a request to write the issue text for the pilot feedback items 3, 5 and 6. Issue #135 is the voice-over request of Nov 2. Hanif opens the issues and makes the branches.

2. Hanif's prompt (his words):

   "branches are created, start the agents"

   Claude's note: Hanif made branch `Features/Task-Read` from `main`. Claude worked only on that branch. Claude did not create a branch, an issue or a pull request.

3. Source of the request: pilot user feedback, Nov 2, 2026. Words of the user (quoted in the issue text): "Add voice-over narration for assembly steps, e.g. 'Install a 220 ohm resistor in the circuit,' to speed up comprehension."

4. Claude's work (not Hanif's words):
   - Red first: `tests/read-aloud.test.ts` for `spokenText` in `lib/game/read-aloud.ts`. The stub returned the text unchanged. 8 of 10 tests failed.
   - Green: `spokenText` replaces "Ω" with "ohm", "→" with "to", "−" with "minus", a standalone "+" with "plus", "3V3" with "3.3 volts" and "GND" with "ground". A "+" inside a word (for example "C++") is not changed.
   - UI: a speaker button on the current task (task pop-up and task list), a "Read steps aloud" switch in the task list, the choice in `localStorage` (try/catch on every read and write). No button or switch in a browser without Speech Synthesis.
   - Speech stops when the learner leaves the level, when the Check card opens, and when "Build it for me" starts.

5. Choices made by Claude (minimal choices, listed in the PR text under "Questions for Hanif"):
   - Turning the switch on reads the current task at once.
   - The speaker button is shown on the current row of the task list only, not on every row.
   - The switch is in the task list, under the rows.
