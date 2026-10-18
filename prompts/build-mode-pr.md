# PR text for feature 5 (Hanif opens the PR)

**Title:** Build mode with guided pop-ups

**Body:**

closes #19

As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

## What changed

- **Level map** (`/p/[project]`). The levels of a project sit on a path. Level 1 is open. A level opens when the level before it passes. A locked level shows a lock, and its page sends the learner back to the map. The Perch card in the lobby opens the map.
- **One task at a time.** The level page reads the level and its tasks from the `levels` and `tasks` tables. A level starts with an intro (title, goal, task count, **Start**). Each task shows its instruction, the "why" and a source link. A task that brings a new idea shows its Concept pop-up first.
- **Pop-ups.** Laptop: the Place or Wire pop-up hangs over the target pin, with a line down to it. Phone: a sheet under the board, with a fixed height, so it does not cover the board and the board does not move. The target holes blink in amber. For a module, the holes where pin 1 can go blink.
- **Snap and buzz.** A correct part snaps in: a click sound, a green flash on its connection, the XP, and the next task. A wrong part buzzes: a low sound, a red flash and, on a phone, a vibration. The Mistake pop-up shows the message of the forbid rule of the level (for example, the short from 3.3 V to ground), or a general message. It has **Undo** and **Try again**.
- **XP and the session row.** XP for each task, in the header with a progress bar. The `sessions` row (tasks done, mistakes, XP) is made at **Start** and updated after each change (`startSession`, `updateSession`, TRD 9).
- **The task engine** is a state machine in the Zustand store (`lib/game/engine.ts`, TRD 6.1): intro → task ⇄ mistake → ready to check. It is pure TypeScript with Vitest tests.
- **The board saves in the browser.** A level starts with the learner's saved board. A new level starts with the finished board of the level before it, or, with no save, with a ready-made board from `content/boards/perch.json`.
- **No pop-up text in code.** All words are in `content/projects/perch.json` and `content/ui/build.json`.

## Decisions (Hanif)

- Level N starts with my own board from level N−1, saved in the browser; with no save, a ready-made board from `content/`.
- The Level 1 tasks about the breadboards and the ESP32-S3 (always on the bench) finish with **Got it**.
- A wrong wire buzzes, counts one mistake and stays on the board; the Mistake pop-up has Undo.
- Fix the amplifier in this PR: OUT+ and OUT− are a screw terminal on top of the module, and the speaker leads go into it. (Before, the amplifier had no place on the bench where its outputs did not share a line with an ESP32-S3 pin.)
- A module pin cannot go in a line with an ESP32-S3 pin. The good holes glow during a Place task.

## Bug found during this work

- **What occurred:** in feature 4, the MAX98357A could not go anywhere on the bench without OUT+ or OUT− in the same breadboard line as an ESP32-S3 pin. The checker did not see it, so Level 4 could pass with the amplifier output connected to a GPIO pin. Also, the mic and the button could go in lines of ESP32-S3 pins with no warning.
- **How we found it:** Claude wrote a test that tried every hole on the bench for each module. The amplifier had 0 good places; the mic and the button had 8 each.
- **How we repaired it:** the speaker terminal is on top of the amplifier (not in the breadboard), the amplifier stays on one side of the gap, and the new `esp_line` rule refuses a module pin in an ESP32-S3 line. Level 4 tasks 8–10 became one task: the speaker leads go into the terminal.

## Checks

- `npm test`: 115 tests pass (32 new). `tests/engine.test.ts` plays all 5 Perch levels with the ready-made boards: every part snaps in, with no mistakes, and the level rules are true at the end.
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Browser check on Claude's scratchpad page (the real `BuildView`, server actions replaced by stubs), at 1280 × 800 and 390 × 844 touch: intro, Concept, Got it, a short circuit (Mistake pop-up, Undo), a snap, the end of the level, and Level 4 with the speaker in the terminal.
- Real routes on the Supabase project, with a temporary test account (deleted after the test), on `next start` in Chromium at 1280 × 800 and 390 × 844: log-in, the level map (passed, open and locked levels), a locked level sends the learner back to the map, **Start** makes a `sessions` row, and after 3 tasks the row has 3 tasks done, 0 mistakes and 30 XP. After a reload, the level comes back with 30 XP (browser save). With levels 1–3 passed, Level 4 opens with the ready-made board, and the good holes for the amplifier glow. No page errors.
- `npm run seed` ran on the Supabase project: Perch has 39 tasks, and Level 4 has 8.
- Hanif checked build mode on his Mac with `npm run dev`: the pop-ups, the guide bar and the level flow show.
- Not checked on the real routes: wires placed by hand in 3D (checked on the scratchpad page), and the sounds.

## Not in this PR

- The level **Check**, hearts and the level bonus XP are feature 5a. A session becomes `completed` only when a Check passes (TRD 7), so until 5a, no level passes and levels 2–5 stay locked on the map.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_019omJZ4B9HAmgD2DF8KEoqq
