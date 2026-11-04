closes #148

## User story
As a learner who has never built a circuit, I want each step in very simple words, a cue that shows where to click or tap, and a short note after each step about what I just did, so that I can finish a level without knowing technical words. (PLAN.md row 18)

## What changed
- `lib/game/task-text.ts` (new, pure): `holePhrase` gives the words for a hole ("breadboard A, row b, column 5", "breadboard A's left red + line next to column 5", "pin 13 (D13) on the Uno", "the + screw of the amp"). `taskText` fills `{from}` and `{to}` from the taps of the arrow (`taskSpot`). `taskTexts` gives the text of each row of the task list: the task of now on the board, and each later task on the board of the guide. `partTaps` gives the holes of a part for the level clip. `pinName` moves here from `components/build/guide.tsx`.
- `lib/game/engine.ts`: `fitProgress`. A saved board from the old task list opens on the first task that the board does not do. XP stays.
- `content/projects/perch.json`, `content/projects/arduino-foundations.json`: every task uses `{from}` and `{to}`, in 20 words or less. Level 1 of each project has one "Look at your bench" task in place of the "Got it" tasks (Perch 7 → 5 tasks, Arduino 4 → 3). The Level 1 goals say why, with no listed word. Cards move so that each listed word shows after its card (Perch: Pin on the 3V3 wire; Arduino: Pin on the 5V wire, Resistor on the resistor, Ohm's law on the pin 13 wire).
- `content/ui/build.json`: new `spot` words; pin names with the plain name first ("pin 4 (GPIO 4)", "ground (GND)"); no "rail" and no "I²S".
- `components/build/filled-tasks.ts` (new), `build-view.tsx`, `autosave.ts`: the pop-up, the task list, read aloud and Redo show the filled text. A task is read aloud once, also when its holes change. The saved progress goes through `fitProgress`.
- `lib/game/walkthrough.ts`: each clip caption names the holes of the part that it shows, also on the learner's carried board.
- Tests: `tests/content-rules.test.ts` and `tests/task-text.test.ts`, `tests/fit-progress.test.ts` (new). The older tests use the new Level 1 task numbers and expect the filled captions.
- `PLAN.md` row 52, `prompts/first-timer-guidance.md`, this text, `ledger/LEDGER.md`.

## How it was tested
Plain English: the content-rules test plays each level of Perch and Arduino Foundations as a learner who puts each part where the arrow points. For each task, it fills the holes of the arrow into the text and reads it: 20 words or less, one sentence, one action, the breadboard and the column of each hole, each listed word only after its Concept card, each pin label in brackets after a plain name.
- Red (`4c7ca47`): `vitest run tests/content-rules.test.ts`: 27 failed, 21 passed, on the content of `main`.
- Green (`804a583`, `6be8173`): `vitest run`: 58 files, 809 tests passed. Typecheck (`next typegen && tsc --noEmit`) and lint: exit 0.
- Browser, local only: a temporary public route (removed before the commit) with placeholder Supabase values showed Perch levels 1 and 2 and Arduino Foundations levels 1 and 2 in Chromium at 1280 × 800, and Perch levels 1 and 2 and Arduino level 2 at 390 × 844 with touch. The hole card under the arrow said "Breadboard B · row b, column 5", the same hole as the task text. No page errors. The check found two bugs, fixed in `6be8173`: rows of later tasks showed `{from}` before their part was on the board, and "Resistor to light" said "column 4 to column 4".
- A real change that makes the test fail: put back the old Perch Level 1 task 6 text ("Connect the red + line on the left side of breadboard A to the red + line on the right side of breadboard B."), and the content-rules test fails (24 words, no `{from}`).

## Choices that Hanif confirmed (Nov 4: "1. Yes 2. Yes 3. Yes 4. Yes")
1. The LED and the speaker stay one task with two holes (one action, two taps, as a wire). The issue asked for one task for each leg; that needs an engine change.
2. A wire to a GPIO pin says "pin 7 at …" to stay in 20 words. "(GPIO 7)" is in the "What happened" text and the hole card.
3. Perch breadboards have two free lines of each color, so the text says "left" or "right".
4. The later rows of the task list name the holes that the guide will show. They change when the learner uses other holes.
5. A wire task whose two ends already share a line of 5 says "already joined in …".

## Checked before the merge (Nov 4, Hanif: "check first before merging")
- An independent review (a second agent, read-only) of the diff. Fixed from it: a done row of the task list, and the Redo card, named new free holes ("already joined in …", "column 2 to column 2"). Now a done row names the holes of its own part or wire (`doneTaps`, `7a0a353`). A hole that the guide cannot find says "the hole that glows", never `{from}`.
- Browser play-through, Chromium 1280 × 800: Perch levels 1 and 2 and Arduino levels 1 and 2, played by the **words only** (the script reads each task, turns the words into holes, and taps them). Every step snapped in, 0 mistakes, each level reached Check. After each level, every row names the holes that the script tapped.
- An old browser save of Perch level 1 (7 tasks) opens on the new list: mid-level → "2 of 5 done", the next task is Ground; ready to Check → "5 of 5"; ready with a wire gone → that wire's task. XP stays.
- Read aloud speaks the filled text. The "Watch how" 3D clip captions name the holes of the clip parts.
- The phone sheet (390 × 844) shows the full wire text; it scrolls by 19 px, with the buttons sticky.
- Database: `tasks.instruction` has no length check; `record_attempt` caps the task XP with `least(...)` and needs `tasks_done >= count(tasks)`. The build page reads the tasks from Supabase, so the new app with the old rows still sends 7 for Perch level 1.
- Fixed from the play-through: the "What happened" text of Perch level 1 task 4 said "a bridge that carries power across" from breadboard A, but the guide starts that wire in the 3V3 line of breadboard B (`cf9d59e`).

## After the merge (in this order)
1. Wait for the Vercel deploy of `main`.
2. Run `supabase/seed.ts`. Not before the deploy: the old app would show `{from}` from the new rows.
3. Run `npm run videos` to record the walkthrough videos again. The videos in `public/videos/` have the old captions, and the level 1 videos show the old "Got it" steps. Do not remove a video from `content/videos.json`: a level with no video has no clip, no "Watch how" and no "Build it for me".

## Known limit
- A browser save made in the middle of Perch or Arduino level 1 **before** this change: the next 2 tasks give no "What happened" pop-up, and the task count in the header is 2 ahead until the level ends. The final XP is right. The app cannot tell such a save from a save where the learner took a wire away, so it does not guess.

## Not checked
- The live Vercel app, a real log-in, Supabase, and a real phone.
- The fail card in a browser: a Check needs a Supabase session. Its Redo line uses the same filled tasks as the task list.
- The guide's choice of holes did not change. In Perch level 2 the guide can send the short leg of the light to a ground hole in the line of the button. The text now shows this choice; the guide itself is not in this issue.
- The timed test with a person who has no electronics background.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnPd46HFvRs9vcZ9NnD
