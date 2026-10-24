# PR text for issue #58 (Hanif opens the PR)

**Title:** Arduino Foundations: write the sketch and run it on the 3D board

**Body:**

closes #58

As a learner, after I wire a level of Arduino Foundations, I want to write the Arduino sketch for it in a code editor, press Run, and see the 3D board do what my code says, with a clear message about the line that is wrong, so that I learn how code and wiring work together.

## What changed

- **`lib/sketch/`, pure TypeScript** (no React, no 3D code, no database code):
  - `parse.ts` reads a small part of Arduino C: `void setup()` and `void loop()`, `int` and `const int`, `pinMode`, `digitalWrite`, `digitalRead`, `delay`, `if` / `else`, `==`, `!=`, `!`, `HIGH`, `LOW`, `INPUT`, `OUTPUT`, `INPUT_PULLUP`, `LED_BUILTIN`, `//` and `/* */` comments. An error gives the line and a message in simple words, for example "Line 4: pinMode needs two values: the pin and the mode." Words that Jumper does not run yet (`Serial`, `analogRead`, `millis`, `for`, functions that the learner makes) get a clear message too.
  - `circuit.ts` uses the nets of `lib/circuit`: a pin with an LED on its net can light it, through the resistor; `digitalRead` on the button pin reads the button (LOW while pressed, HIGH with `INPUT_PULLUP`). The L light of the Uno is on pin 13.
  - `run.ts` runs `setup()` one time, then `loop()` again and again, on a clock that the app controls. A loop that never waits stops after 10 000 lines, with a message. The browser does not stop.
  - `goal.ts` tests the goal of the level on the board as it is wired, and gives the reason when the sketch does not do it, for example "The LED stays on. It must turn off for 500 ms."
- **The code step** of levels 2, 3 and 4 is data in `content/sketches/arduino-foundations.json` (task line, goal, starter code, hints and source). All messages are in `content/ui/sketch.json`.
  - Level 2: make the LED on D13 blink once each second (500 ms on, 500 ms off).
  - Level 3: turn on the L light of the Uno (D13) while the button is pressed.
  - Level 4: turn on the breadboard LED while the button is pressed.
- **The code panel**: CodeMirror 6 with C++ colors, line numbers and a red mark on the wrong line. Run, Stop and Start again, the goal and hints. Beside the board on a laptop, under the board on a phone, so the LEDs stay in view.
- **The 3D board**: Run makes the 3D LED turn on and off from the pin states. The Uno has an L light with its label. While the sketch runs, a tap on the 3D button presses it (the cap goes down, its ring turns green). A "Hold to press the button" control in the panel does the same for a keyboard or a screen reader.
- **The level passes** when the wiring passes Check and the sketch does the goal. Until then, the Check card says "Now write the sketch" and opens the editor, and the Check button is off. A failed sketch saves no attempt, so it does not cost a heart. The task list has a line for the code step ("Write the sketch", then "See the sketch").
- **A reload keeps the sketch**: the browser saves it with the board (Hanif's choice). No new column, no migration. `schema.md` says where the sketch is saved, and compares it with PLAN.md section 3.
- **Packages**: CodeMirror 6, approved by Hanif on Oct 23 (house rule 8): `codemirror`, `@codemirror/lang-cpp`, `@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@lezer/highlight`. The TRD has a row for it.
- Docs: TRD (CodeMirror row, `lib/sketch/` and `content/sketches/` in the folders), `schema.md`, PLAN.md row 22 (Plan vs. Reality), prompt log, ledger.

## Decisions by Hanif

- Wait for #57 to merge before this issue starts.
- A `loop()` with no `delay()` stops with a message (as the issue says). The starter code of levels 3 and 4 has `delay(10);` with a comment, because the usual button sketch has no delay.
- The sketch is saved in the browser with the board, not in a new database column.

## Bugs found by Claude in the end-to-end check (in this branch)

1. **No way back to the editor.**
   - What occurred: after the sketch did the goal, or after a reload, no button opened the editor again.
   - How Claude found it: the end-to-end check could not open the editor after a reload.
   - How we repaired it: a "See the sketch" button on the task line of the code step, and on the Check card.
2. **Run and Stop under the tool bar.**
   - What occurred: on a laptop, on level 3, the panel was taller than its space, and the tool bar covered the Run and Stop button.
   - How Claude found it: a click on Stop failed, because the tool bar took the click.
   - How we repaired it: the panel scrolls, and the Run row stays at its bottom edge.
3. **The 3D button did not press.**
   - What occurred: a tap on the 3D button did nothing.
   - How Claude found it: a mouse press at the place of the button cap did not change the button state, but the panel button did.
   - How we repaired it: the cap was made with `raycast={() => null}`, and a later `undefined` did not give it back its raycast. Now it is a new mesh when it starts to take the pointer.
4. **The L light was hidden.**
   - What occurred: on a laptop, the L light of the Uno was under the open task list, so the learner could not see the goal of level 3.
   - How Claude found it: in a screenshot of level 3 while the button was held.
   - How we repaired it: the task list starts as a small chip while the code panel is open.

## End-to-end check

A production build of this branch, on the real Supabase project, with a temporary account made for the check and deleted after it (0 sessions, attempts, snapshots or profile left). A completed level 1 session opened level 2. The wiring of levels 2 to 4 came from their finished boards (the wiring was checked in #57). All of the code step used the real UI. **42 of 42 checks pass, with no page errors:**

| Acceptance criterion | Result |
| --- | --- |
| 1. The editor opens with the starter code after the wiring tasks | Pass, levels 2, 3 and 4. The Check card says "Now write the sketch"; the task list shows the code step as "now". |
| 2. The blink sketch makes the 3D LED turn on and off once each second | Pass. 16 screenshots in 3.7 s fit a 500 ms on / 500 ms off wave 100 % (in an earlier run, the same kind of shots fit a wrong 700/700 ms wave only 69 %). |
| 3. The button sketch lights the LED only while the 3D button is pressed | Pass. A mouse press on the 3D button presses it; the L light turns on, and off again on release. Level 4 passes with the breadboard LED. |
| 4. A syntax error marks the line and shows a simple message | Pass. "Line 7: Put a ; at the end of this line." with line 7 marked; "Line 2: pinMode needs two values: the pin and the mode." |
| 5. A sketch that does not do the goal shows the reason, and the level does not pass | Pass. "The LED stays on. It must turn off for 500 ms." (level 2 starter), "The LED does the opposite…" (level 4). The Check stays off, and no attempt is saved. |
| 6. A loop with no delay stops with a message; the page does not freeze | Pass. "Line 4: loop() runs again and again with no pause, so Jumper stopped the sketch…"; the page answered in 9 ms. |
| 7. A reload keeps the sketch | Pass. After a reload, "See the sketch" opens the same code, and the card says that it did the goal. |
| 8. Unit tests for `lib/sketch` | Pass (see Tests). |
| 9. Type check, lint, Vitest and the build pass; `schema.md` says where the sketch is saved | Pass. |

Also: Check passes on levels 2, 3 and 4 (3 passed attempts, no failed attempt); at 390 × 844 the panel is under the board, the board stays in view, and there is no sideways scroll; Perch level 1 opens with no code step. Not checked: dark mode, and a real touch tap on the 3D button.

## Tests

`tests/sketch.test.ts` (49 tests):
- The reader: words, numbers and lines; comments; setup, loop, variables, the 4 functions, `if` / `else`, `else if`, `!`; 18 error messages, each with its line; a missing `}`, a const that changes, a line outside the functions, a missing `setup` or `loop`, a variable outside its braces.
- The runner: `setup` one time and `loop` again and again on the app clock; global and loop variables; a pull-up; a loop with no delay, or with `delay(0)` only, stops with the message; a pin that the Uno does not have; notes for a pin that writes with no OUTPUT mode and a pin that floats.
- The circuit: the LED of level 2 lights through the resistor, with the L light; a reversed LED or an LED with no ground wire stays dark; the button of level 3 reads HIGH with the pull-up, LOW while pressed, and floats with no pull-up; a wire to 5V reads HIGH.
- The goal check: blink passes; "stays on", wrong times, "stays off", and a pin that is not an OUTPUT give their reasons; no pass without the wires; the button sketch passes for the L light and the breadboard LED; swapped, never on, no pull-up, always on and no delay give their reasons.
- The content: levels 2, 3 and 4 have a valid code step; each starter reads with no error, does not do the goal yet, and names a part of the finished board; the level 2 starter gives the message of the issue; a correct sketch does the goal on each finished board.

337 tests, the type check, lint and the build pass.

## After the merge

Nothing to run: no migration and no seed. The code step comes from `content/sketches/`, which the app reads from the repository.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01BBRVaeTVYmEMuhGg9KB6jo
