# Prompt log: Arduino Foundations, Uno bench and 4 wiring levels (issue #57)

1. "Work on issue 57. Branch is the folllowing: https://github.com/patronofalltrades/Jumper/tree/Feature%2FArduinoUnoBench Read documentations before touching code"

   Claude read issue #57, CLAUDE.md, AGENTS.md, README.md, PLAN.md, the PRD, the TRD, `schema.md` and the ledger. Then Claude read the circuit code (`lib/circuit/`), the task engine, the board store, the 3D scene, build mode, the autosave, the snapshot page and the clips. Claude worked on `Feature/ArduinoUnoBench`, the branch that Hanif made.

   Claude asked 2 questions:
   - Levels 3 and 4: each level starts with the board of all the levels before it, so level 3 already has the LED, and level 4 has nothing new. Answer: "Rebuild in Level 4". Levels 2 and 3 start with the powered breadboard of level 1. Level 4 starts with the button of level 3 and builds the LED circuit again.
   - Walkthrough clips: the Arduino levels would get 3D clips automatically. Answer: "No clips yet". A level gets a clip only when it has a recorded video.

   Claude built:
   - `content/benches/perch.json` and `content/benches/arduino-foundations.json`: the breadboards, the main board, where the board goes, the open rails and the camera view. `lib/circuit/bench.ts` makes the bench from this file (`createBench()`), with no fixed ESP32-S3 values. The Perch bench is the same as before (all 800 holes, 44 pins and 88 covered holes are equal to `main`).
   - `content/parts/arduino-uno.json`: the Uno header pins and their labels: 5V, 3V3, GND (3 pins on one net), VIN, D0–D13 and A0–A5. Each pin is a socket: a wire end goes into it. A resistor or LED leg cannot.
   - `components/scene/uno.tsx` and `drawUno()`: the Uno from code shapes (teal board, headers, USB socket, power jack, chip), on the table beside one breadboard. A hover on a pin lights up its net; a tap puts a wire end into it.
   - `content/projects/arduino-foundations.json` (status `available`): 4 levels in simple words, with Concept pop-ups for the power rails, Ohm's law and the pull-up resistor inside the Uno (INPUT_PULLUP). Mistake pop-ups, for example "This shorts 5 V to ground".
   - `content/boards/arduino-foundations.json`: a finished board for each level, and a `start` list (level 3 starts with level 1; level 4 with levels 1 and 3).
   - The board store, the engine, the scene, the hints, the Check reasons, the autosave and the snapshot page use the bench of the project. The Level complete screen shows the Perch picture only for Perch.
   - Tests: `tests/arduino.test.ts` (the Uno bench nets, each level played to a pass with its finished board, the Mistake and Check reasons, the board store on the Uno bench, no clips). The content test now lets a level require a connection from its start board.
   - A separate commit fixes a crash in build mode that was on `main`: in new Chromium, `scrollIntoView()` gives a Promise, and two effects gave it back to React.

   Checks: 288 tests, the type check, lint and the build pass. Browser check on a temporary page (not committed) with the content files and placeholder Supabase keys, at 1280 × 800 and 390 × 844 (dark): Level 1 with the Uno outline and the Pin pop-up, the hover on a GND pin, Levels 2 and 4 finished, and Perch Level 2. The real routes need a log-in, so they are not checked in a browser in this session.
