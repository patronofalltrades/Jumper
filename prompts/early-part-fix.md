# Prompt log: A correct part placed before its task (issue #72, branch `Bug/EarlyPartFix`)

1. Task from Hanif (issue #72, "A correct part placed before its task counts as a mistake"). Decision of Hanif: (a) quiet snap. A correct part placed early snaps in with no Mistake and no note. Its task ticks when the learner gets to it. Not in the issue: a note such as "Good, but do this one first" (option b), and changes to the level Check. Rules for this work: work only on `Bug/EarlyPartFix`; no new branch, issue or pull request; no merge; no dependency; no migration; no change to `content/`; no change to the saved-board format (`components/build/autosave.ts`); do not touch the live Supabase project; tests first (red, then green); ledger entry; ASD-STE100 docs.

   Claude read the docs, the ledger (the #63 rows and notes), `lib/game/engine.ts`, `lib/game/board-store.ts`, `tests/engine.test.ts`, `tests/board-store.test.ts` and `tests/arduino.test.ts`. Claude read issue #72 on GitHub. It matches the text above.

## Test scenarios (Given / When / Then)

Words: "the task of now" is `progress.index`. An "early" part does a task after `reached`.

- **S1. Early wire in Perch Level 3.** Given the mic is on the board, the learner did tasks 1 to 4 (VDD, GND, LR) and the pop-up asks for WS → GPIO 4. When the learner wires SD → GPIO 6 (task 7). Then the effect is a snap. `mistakes` is 0 and the phase is `task`. `index` is still the WS task. `tasksDone` and `xp` do not change. The task list shows SD as "todo", not as a tick.
- **S2. Early wire, then the tasks before it.** Given S1. When the learner wires WS and SCK. Then the SCK wire finishes SCK and the early SD task by itself. The phase is `ready_to_check`. `tasksDone` is 7 and `xp` is 70 (each task once). `mistakes` is 0. The first two wires snap.
- **S3. Early wire, then Undo or Remove.** Given S1. When the learner removes the SD wire (Remove, or Undo, which sends the board without it). Then the phase is `task`, `mistakes` is 0, no effect. `index`, `tasksDone` and `xp` do not change. When the learner puts the same wire back, it snaps again (no Mistake).
- **S4. Early wire that also makes a forbidden connection.** Given a level whose rules forbid the connection that the early wire makes (a test plan with the forbid rule `mic1.SD` – `esp.GPIO6`). When the learner places the early wire. Then it buzzes and `mistakes` goes up by 1, with the code of the rule. The forbid rule wins.
- **S5. A wrong wire still buzzes.** Given S1 start. When the learner places a wire that does no task. Then it buzzes with `wrong_wire`. A module in the wrong place still gives `wrong_place`; a module of no task gives `wrong_part`.
- **S6. Early part with a "Got it" task between.** Given a plan with the tasks: wire A, "Got it" (the ESP32-S3), wire B. The learner is on wire A. When the learner places wire B first. Then it snaps, with no Mistake. When the learner places wire A, the engine finishes A and stops on the "Got it" task (`tasksDone` 1). After "Got it", wire B finishes by itself (`tasksDone` 3, `ready_to_check`).
- **S7. Button side choice.** Given Perch Level 2, the button on the board, and the pop-up on GPIO 1 → button side 1. When the learner puts the GND wire first, in the hole of the physical side 1 (task 3 uses side 2 after a swap). Then it snaps (no false Mistake). When the learner then puts GPIO 1 on the other side, both tasks finish, `swaps` is `["btn1"]`, and `mistakes` is 0.
- **S8. Arduino Foundations Level 2.** Given the resistor is on the board and the pop-up asks for the LED. When the learner wires D13 → the resistor first. Then it snaps. When the learner places the LED, the LED task and the two tasks after it finish (the LED is in line with the resistor). `tasksDone` is 4. The last wire finishes the level with `mistakes` 0.
- **S9. An old save with no `reached`.** Given a progress where `reached` equals `index` (the autosave gives this value to a save without `reached`). When the learner places an early correct wire. Then it snaps like S1.
- **S10. The finished boards.** Every Perch level and every Arduino level played with its finished board still gives no Mistake (the existing tests).

## Red and green

**Red (old code, tests only).** `npx vitest run`: 7 failed | 388 passed (395 tests; 27 files, 1 failed). The 7 new tests that fail are S1, S2, S3, S6, S7, S8 and S9 in `tests/engine.test.ts`. Example: S1 gives `expected 'buzz' to be 'snap'`, and S2 gives `mistakes: 1` where 0 is right. S4 and S5 pass on the old code on purpose: they protect the rules that must not change (a forbid rule and a wrong wire still buzz). S10 is the existing finished-board tests, which also pass.

(Green: below, after the fix.)
