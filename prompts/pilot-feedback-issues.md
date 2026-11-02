# Pilot feedback issues (requests 3, 5 and 6)

## Hanif's prompts

> no need indonesian translations. Return all their suggestions and see if we have time to implement some or if some already is part of our road map

> build 3, 5 and 6, write the issue text. Open Issues for each stories

## Notes

The source is the pilot user feedback of Nov 2, 2026 (see the section "Pilot user feedback" in `ledger/story-brief.md`). Claude tried to open issue A on GitHub. The guard hook stopped it: "opening an issue is Hanif's step." Hanif opens the three issues and the three branches below.

---

## Issue A

**Title:** Build mode: show the board of the project (ESP32-S3, Arduino Uno)

**Body:**

**Branch:** `feature/board-name`

**User story (PLAN.md row 5):** As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

**Changed:** In build mode, I want to see which microcontroller board the project uses (for example ESP32-S3 or Arduino Uno), so that I know which real board I learn to wire.

**Source:** Pilot user feedback, Nov 2, 2026 (request 3 in `ledger/story-brief.md`): "It is not stated which microcontroller a project uses (Arduino, ESP32, etc.)." Today the catalog cards and the level map show the board, but build mode does not.

**Acceptance:**
- [ ] The build page header shows the board, for example "Perch · ESP32-S3 · Level 2".
- [ ] The level intro pop-up shows the same line.
- [ ] The board name comes from the `board` field in `content/projects/*.json`. The text format is in `content/ui/build.json`, not in code (house rule 7).
- [ ] A Vitest test for the header text, red first, then green.
- [ ] Phone (390 x 844): the header line does not wrap or cover the board.

PLAN.md: add a row to "Plan vs. Reality". Prompt log in `prompts/board-name.md`.

---

## Issue B

**Title:** Build mode: read the task aloud

**Body:**

**Branch:** `feature/read-aloud`

**User story (PLAN.md row 5):** As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

**Changed:** I want a button that reads the current task aloud (for example "Put a 220 ohm resistor on the board"), and a setting that reads each new task by itself, so that I can listen and keep my eyes on the board.

**Source:** Pilot user feedback, Nov 2, 2026 (request 5 in `ledger/story-brief.md`): "Add voice-over narration for assembly steps, e.g. 'Install a 220 ohm resistor in the circuit,' to speed up comprehension."

**Acceptance:**
- [ ] A speaker button on the current task (task pop-up and task list) reads the instruction aloud. A second press stops it.
- [ ] A "Read steps aloud" switch. When it is on, each new task is read by itself. The browser keeps the choice (`localStorage`, with try/catch).
- [ ] The voice says symbols as words: "Ω" → "ohm", "+" → "plus", "−" → "minus", "→" → "to", "3V3" → "3.3 volts", "GND" → "ground". This is a pure function with Vitest tests, red first, then green.
- [ ] Speech stops when the learner leaves the level, opens the Check card or plays "Build it for me".
- [ ] A browser without Speech Synthesis does not show the button.
- [ ] No new dependency: the browser Speech Synthesis API is already in the TRD and in `components/build/alive-audio.ts`.

PLAN.md: add a row to "Plan vs. Reality". Prompt log in `prompts/read-aloud.md`.

---

## Issue C

**Title:** Build mode: a short description of each part and tool

**Body:**

**Branch:** `feature/part-descriptions`

**User story (PLAN.md row 4):** As a learner, I want to drop multi-pin modules (button, mic, amplifier, screen) onto the board, so that I can build the full device.

**Changed:** When I pick a part or a tool (wire, resistor, LED, button, mic, amplifier, speaker, screen), I want a short description of what the part is and what it does, so that I know the part before I put it on the board.

**Source:** Pilot user feedback, Nov 2, 2026 (request 6 in `ledger/story-brief.md`): "Add component information to the library: what each component is and what it does." Today the parts tray shows only the names.

**Acceptance:**
- [ ] Each tool and tray part has a description of 1 or 2 short sentences: what it is, what it does, and the real model (for example "INMP441: a digital microphone. It sends sound to the board on 3 wires (I²S).").
- [ ] Laptop: the description shows when the learner points to or picks the part. Phone: it shows when the learner picks the part. It does not cover the board.
- [ ] The text is in `content/` as JSON, in ASD-STE100 (house rules 5 and 7). It agrees with the terms in `content/terms/*.json`.
- [ ] A Vitest test checks that each tool and tray part has a description, red first, then green.

PLAN.md: add a row to "Plan vs. Reality". Prompt log in `prompts/part-descriptions.md`.
