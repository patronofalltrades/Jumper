Title: Build mode: read the task aloud

closes #135

## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)

## Summary in plain English
- A speaker button on the current task reads it aloud. It is in the task pop-up and in the task list. A second press stops the voice.
- A "Read steps aloud" switch in the task list. When it is on, each new task is read by itself. The choice is kept in the browser.
- The voice says the symbols as words: "Ω" is "ohm", "+" is "plus", "−" is "minus", "→" is "to", "3V3" is "3.3 volts", "GND" is "ground". A "+" inside a word, such as "C++", is not changed.
- The voice stops when the learner leaves the level, opens the Check card or starts "Build it for me".
- A browser without Speech Synthesis shows no button and no switch.
- No new dependency. The voice is the browser's Speech Synthesis, through `speak` in `components/build/alive-audio.ts`.

## What changed
- `lib/game/read-aloud.ts` (new): `spokenText`, a pure function.
- `components/build/read-aloud.tsx` (new): the voice state (a small store), `readAloud`, `stopReading`, `SpeakButton`, `ReadStepsSwitch` and the saved choice (`useReadSteps`).
- `components/build/task-list.tsx`: the speaker button on the current row, and the switch under the rows.
- `components/build/popups.tsx`: the speaker button in the task pop-up.
- `components/build/build-view.tsx`: each new task is read when the switch is on; the voice stops when the level is left and when the Check card opens.
- `components/build/build-for-me.tsx`: the voice stops when "Build it for me" starts.
- `content/ui/build.json`: new `aloud` text (ASD-STE100).
- `tests/read-aloud.test.ts` (new): see below.
- `PLAN.md`: row 47 added at the end of "Plan vs. Reality". No other line changed.
- `prompts/read-aloud.md`, `prompts/read-aloud-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

## How it was tested
- What the tests check, in plain words: the function turns each symbol of the task text into the word that the voice should say. It leaves a plus sign that is part of a word alone, and it leaves the other words of the sentence unchanged. Then it reads every task of Perch and Arduino Foundations, and checks that no symbol is left that the voice would read badly, and that one real Perch task is read in full.
- Red (commit `238ae4d`): `npx vitest run tests/read-aloud.test.ts`: 8 of 10 tests failed on the stub (the stub returned the text unchanged).
- Green (commit `ebef6b7`): `npx vitest run tests/read-aloud.test.ts`: 10 passed. `npm test`: 674 passed in 50 files.
- `npm run typecheck`: exit 0. `npm run lint`: exit 0.
- A real change that makes the test fail: if `spokenText` replaced every "+" (not only the one with spaces or brackets around it), "C++" would be read as "Cplusplus" and the test "does not change a plus or minus inside a word" would fail.
- Screenshots: not made. The house rule asks for a red and a green screenshot of the required test. Claude did not have a browser run for this change, so there are none. See "Not checked".

## Not checked
- The voice in a real browser. The speech was not heard, and no browser test ran.
- The layout of the speaker button and the switch on a phone and on a laptop. Not seen.
- The stops (Check card, "Build it for me", leaving the level) in a real browser.
- The live app and a real log-in. The live Supabase project was not used.
- Arduino Foundations levels were not seen in a browser.

## Questions for Hanif
1. When the switch is turned on during a task, the current task is read at once. Keep it (Claude's choice), or read only the next new task?
2. The speaker button is on the current row of the task list only (not on each row). Keep it?
3. The switch is in the task list, under the rows. Should it also be on the build page header?
4. The code step (the sketch task) can be read too, because it is the current row. Keep it?

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNKepU8bFQobc7cRmg
