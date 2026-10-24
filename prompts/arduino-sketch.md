# Prompt log: Arduino Foundations, write the sketch and run it on the 3D board (issue #58)

1. "Work on issue 58, Branch is Arduino sketch. Read all documentation before touching the code. Make sure once work is done, create a temporary account to do e2e testing. We will later open a PR and merge to main, create the PR title and body based on your work"

   Claude read issue #58, CLAUDE.md, AGENTS.md, README.md, PLAN.md, the PRD, the TRD, `schema.md` and the ledger. Issue #58 needs issue #57 (the Uno bench and the 4 wiring levels) merged first. `main` still had Arduino Foundations as "Coming soon" with no levels; the #57 work was on `Feature/ArduinoUnoBench`, with no PR.

   Claude asked how to start. Answer: "Wait for #57 merge". Claude did not change code.

2. "continue with this build"

   Hanif merged #57 (PR #59). Claude moved `Feature/ArduinoSketch` to the new `main` (a fast-forward) and read the circuit code, the task engine, the board store, the autosave, the Check, the pop-ups, the task list and the 3D scene.

   Claude asked 2 questions:
   - The issue says that a loop() with no delay() stops with a message, but the usual button sketch has no delay. Answer: "Stop it, starter has delay". The runner stops a loop that does not wait, and the starter code of levels 3 and 4 has `delay(10);`.
   - Where to save the sketch. Answer: "Browser, with the board". No new column.

   Claude built:
   - `lib/sketch/` (pure TypeScript, no React, 3D or database code):
     - `parse.ts`: reads `void setup()`, `void loop()`, `int` and `const int`, `pinMode`, `digitalWrite`, `digitalRead`, `delay`, `if` / `else`, `==`, `!=`, `!`, `HIGH`, `LOW`, `INPUT`, `OUTPUT`, `INPUT_PULLUP`, `LED_BUILTIN` and comments. An error gives the line and a message in simple words, for example "Line 4: pinMode needs two values: the pin and the mode."
     - `circuit.ts`: what a pin reads and which LEDs light, from the nets of `lib/circuit`. The L light of the Uno is on pin 13.
     - `run.ts`: runs `setup()` one time, then `loop()` again and again, on a clock that the app controls. A loop that never waits stops after 10 000 lines, with a message.
     - `goal.ts`: the goal check (blink, or LED with the button), with the reason when the sketch does not do the goal, for example "The LED stays on. It must turn off for 500 ms."
   - `content/sketches/arduino-foundations.json`: the code step of levels 2, 3 and 4 (task line, goal, starter code, hints, source). `content/ui/sketch.json`: all the messages and the panel text.
   - The code panel: CodeMirror 6 with C++ colors, line numbers and a red mark on the wrong line. Run, Stop and Start again. Beside the board on a laptop, under it on a phone.
   - The 3D board: the LED glows from the pin states, the Uno has an L light, and while the sketch runs a tap on the 3D button presses it (also a "Hold to press the button" control in the panel).
   - The level Check waits until the sketch does the goal. A failed sketch saves no attempt, so it costs no heart. The task list has a line for the code step.
   - The browser saves the sketch with the board, so a reload keeps it.
   - Tests: `tests/sketch.test.ts` (49 tests).
   - Docs: TRD (CodeMirror row, folders), `schema.md` (where the sketch is saved, and the comparison with PLAN.md section 3), PLAN.md row 22.

   End-to-end check with a temporary account, as Hanif asked: a production build on the real Supabase project. Claude made the account with the secret key, played levels 2, 3 and 4 in the browser, and deleted the account (0 rows left). The check found 4 bugs in Claude's own code (see the PR text), and Claude fixed them. At the end, 42 of 42 checks pass.
