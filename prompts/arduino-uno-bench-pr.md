# PR text for issue #57 (Hanif opens the PR)

**Title:** Arduino Foundations: Uno bench and 4 wiring levels

**Body:**

closes #57

As a learner, I want to open the Arduino Foundations project and wire an Arduino Uno to a breadboard in 4 levels, so that I learn breadboard basics, Ohm's law, LEDs and buttons before I build Perch.

## What changed

- **The bench comes from data.** `lib/circuit/bench.ts` reads the breadboards, the main board and the place of the board from `content/benches/<project>.json`. It has no fixed ESP32-S3 values now.
- **Perch keeps its bench.** The ESP32-S3 across two 400-hole breadboards: all 800 holes, the 44 pins and the 88 holes under the board are equal to `main`. The camera view is the same.
- **The Uno bench.** The Uno is on the table, to the left of one 400-hole breadboard. It does not go in the breadboard. Wires go from the Uno header pins to the breadboard holes.
- **`content/parts/arduino-uno.json`:** the header pins and their labels: 5V, 3V3, GND (3 pins), VIN, D0–D13 and A0–A5. The 3 GND pins are on one net. Each pin holds one wire end. A resistor or LED leg cannot go into a pin ("Put the legs of this part in the breadboard…").
- **The 3D Uno**, from code shapes: the teal board with its labels, the headers, the USB socket, the power jack and the chip. A hover on a Uno pin lights up its net, and the hint says, for example, "Arduino Uno pin: GND (ground)".
- **4 levels** in `content/projects/arduino-foundations.json`, in simple words:
  1. Power the breadboard: 5V → + line, GND → − line. Concept: the power rails.
  2. Light an LED: D13 → 220 Ω resistor → LED + leg, LED − leg → − line. Concept: Ohm's law (why 220 Ω keeps the LED safe).
  3. Read a button: D2 → button → − line. Concept: the pull-up resistor inside the Uno (INPUT_PULLUP).
  4. Button and LED together: the LED circuit of level 2 next to the button of level 3, on the same breadboard.
- **Start boards.** Levels 2 and 3 start with the powered breadboard of level 1. Level 4 starts with the button of level 3 (Hanif's choice). `content/boards/arduino-foundations.json` has a finished board for each level and a `start` list.
- **The same build mode** as Perch: pop-ups, the task list, Check, hearts and XP. Mistake pop-ups, for example "Oops! This shorts 5 V to ground…". A Check with a reversed LED or with no resistor fails with the reason and costs a heart. New mistake code `power_to_power` (5V to 3V3), with a dashboard label.
- **Status `available`.** The lobby card opens the level map with 4 levels.
- **No clips yet** for the Arduino levels (Hanif's choice): a level gets a Watch clip only when it has a recorded video.
- The Level complete screen shows the Perch picture only for Perch.
- No new package. No new table: `schema.md` does not change.

## Bug found by Claude (on `main`, separate commit)

- **What occurred:** in the browser check (Chromium 153), build mode showed "This page couldn't load" after Start. Perch had the same crash.
- **How Claude found it:** the Next.js error overlay named the task list effect. In the same browser, `scrollIntoView()` gives a Promise. Two effects gave this value back to React (`components/build/task-list.tsx` and the tool row in `components/build/build-view.tsx`), and React stops the page when an effect gives back a Promise ("destroy is not a function").
- **How we repaired it:** braces around the two effect bodies, so they give back nothing. After the fix, Perch Level 2 and Arduino Level 1 load with no page errors.

## Tests

`tests/arduino.test.ts` (24 tests):
- The bench files are valid. A project without a bench file gets the Perch bench. The Perch bench keeps its counts.
- The Uno bench: one breadboard, no hole under the Uno, the pins of the issue, the 3 GND pins on one net, a wire from each pin to a hole, the net that lights up from a pin, one wire end in each pin, no leg in a pin.
- Each level plays to a pass with its finished board: every part snaps in, no mistakes, every task has a tick, and the level Check passes.
- Level 1 passes in other holes. Level 4 fails without the button.
- 5V straight to GND gives the Mistake pop-up "this shorts 5 V to ground". The level 2 Check fails with a reversed LED (`reversed_led`) and with no resistor (`missing_resistor`). Level 3 fails with a wire around the button.
- The board store puts a wire from a Uno pin to a hole with two taps, and goes back to the Perch bench.

Other tests: the content test now lets a level require a connection that no task teaches only if its start board has it (level 4 keeps the button). The catalog tests expect Perch and Arduino Foundations as available.

288 tests, the type check, lint and the build pass.

## After the merge

Run `npm run seed`, so the database gets the Arduino Foundations levels and its new status.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01H6HrYhk7r5gmPtpHB2cYFS
