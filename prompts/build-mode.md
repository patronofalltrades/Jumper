# Prompt log: build mode with guided pop-ups (feature 5, issue #19)

1. "Work on Issue #19: Build Mode https://github.com/patronofalltrades/Jumper/tree/Feature%2FBuildMode is the branch Read: Claude.md, PLAN.md, Readme.md, Schema.md before touch any files"

   Claude read the four files, issue #19, TRD sections 5, 6, 8 and 9, PRD section 4, `content/projects/perch.json` and the feature 3 and 4 code. Claude worked on Hanif's branch `Feature/BuildMode`.

   Claude asked 3 questions, because the docs did not answer them:
   - Each level opened with an empty bench, but the Level 3 task "connect VDD to the + rail (3.3 V)" works only when the rails are wired from Level 1. Hanif chose: **my own board.** The browser saves the board. Level N starts with the board that the learner finished in Level N−1. With no save, it starts with a ready-made board of the earlier levels, from `content/boards/`.
   - Level 1 tasks 1–3 ask the learner to put the breadboards and the ESP32-S3 on the bench, but these parts are always on the bench. Hanif chose: **a "Got it" button.** The pop-up points at the part and explains it, and "Got it" finishes the task and gives its XP.
   - A wire that does not make the connection of the task. Hanif chose: **buzz, keep the wire, Undo.** It counts one mistake, and the Mistake pop-up shows the forbid message of the level, or a general message from `content/ui/build.json`.

   While Claude made the ready-made boards, a search of every hole on the bench found 2 problems from feature 4. Claude asked 2 more questions:
   - The MAX98357A had **0** places where none of its pins shared a breadboard line with an ESP32-S3 pin: its OUT+ and OUT− holes always landed in a line of a J3 pin. Hanif chose: **fix it in this PR.** OUT+ and OUT− are now a screw terminal on top of the module, not in breadboard holes. The speaker leads go into the terminal directly. The amplifier header is one row, so it now stays on one side of the center gap.
   - A learner could put the mic or the button in a line that an ESP32-S3 pin already uses. Hanif chose: **refuse it, and glow.** A module pin cannot go in a line with an ESP32-S3 pin, and during a Place task the holes where pin 1 can go glow.

   Claude built:
   - `lib/game/engine.ts`: the task engine, a pure state machine (TRD 6.1): intro → task ⇄ mistake → ready to check. It checks each change against the task target and the forbid rules, gives a snap or a buzz, counts tasks, mistakes and XP, and finishes the next tasks that the board already does. The two sides of a resistor or a button are the same, so the learner can use either side. `taskSpot()` gives the holes that glow and the point of the pop-up.
   - `lib/game/board-store.ts`: the Zustand store sends each change, undo and removal to the engine, selects the tool of each new task, and keeps the green or red flash.
   - `lib/game/map.ts` and `/p/[project]`: the level map. Level 1 is open; a level opens when the level before it passed (a completed session).
   - `/p/[project]/[level]`: loads the level and its tasks from the database, sends a locked level back to the map, and gives the ready-made board.
   - `app/actions/session.ts`: `startSession` and `updateSession` (TRD 9). The session row gets tasks done, mistakes and XP.
   - `components/build/popups.tsx`: the Place, Wire, Concept and Mistake pop-ups, the level intro and the end of the level. Laptop: the task pop-up hangs over the target pin, with a line to it. Phone: a sheet under the board, with a fixed height.
   - `components/build/autosave.ts`: the board saves in the browser for each user and level, and the session row updates after a short pause and when the learner leaves.
   - `components/build/feedback.ts`: the snap and the buzz with Web Audio, and a vibration on a phone for a buzz.
   - `components/scene/`: target holes blink in amber, the hover glow is pale amber, a snap flashes green and a buzz flashes red. The screw terminal takes clicks and taps.
   - `lib/circuit/`: terminal pins (`amp1.OUT+`), the `esp_line` placement rule.
   - Content: `content/boards/perch.json` (a finished board for each level); Level 4 tasks 8–10 became one task (the speaker leads into the terminal); the place pop-ups of the button, mic, amplifier and screen say why some lines are not free. All text is in `content/`.
   - Tests: `tests/engine.test.ts` plays all 5 Perch levels with the ready-made boards (every part snaps in, no mistakes, the level rules are true at the end), plus the engine states, the glow and the boards; more tests in `board-store`, `modules`, `content` and `map`.
