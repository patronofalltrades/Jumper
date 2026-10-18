# PR text for feature 4 (Hanif opens the PR)

**Title:** Module placement: button, mic, amplifier, screen

**Body:**

closes #17

As a learner, I want to drop multi-pin modules (button, mic, amplifier, screen) onto the board, so that I can build the full device.

## What changed

- **Parts tray.** A new **Parts** button opens a tray with the Perch modules: Button, Mic (INMP441), Amp (MAX98357A), Speaker and Screen (ST7789 1.54").
- **Place a module.** Select a part, then select the hole for its pin 1 (TRD 12.2). On a laptop, a shadow follows the pointer and a click puts the part down. On a phone, the first tap shows the shadow, and a second tap on the same hole puts the part down. The shadow is green if the part fits and red if it does not.
- **Plain refusals.** The app refuses a part that hangs off the board, has pin 1 on a rail, is on the wrong side of the center gap, has a pin in a full or covered hole or an ESP32-S3 hole, or sits on top of another part. The card says why, in ASD-STE100.
- **Nets.** Module pins join the nets. Hover lights them up, and the card names them ("Connected to GPIO 4 and Mic WS"). `mic1.WS`, `btn1.1`, `amp1.OUT+` and `spk1.+` resolve, as in `perch.json`.
- **Remove and Undo** work for modules: tap a pin or the body.
- **Pin layouts** are data in `content/parts/*.json`, with pin names that match `content/projects/perch.json`. A test checks this.

## Decisions (Hanif)

- The pushbutton must go **across** the center gap, as on a real breadboard. The mic also goes across (its 2 rows of pins are 7.62 mm apart, the width of the gap). The amplifier goes across, because its speaker terminal is on the far edge. The screen stays on one side.
- The speaker is a two-leg part (+ and −), like the LED. The learner wires it to OUT+ and OUT− of the amplifier.

## Checks

- `npm test`: 83 tests pass (22 new for modules).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Playwright, 390 × 844 touch, light and dark mode: 15 of 15 checks pass (tray, shadow, two-tap place, wire to the mic, hover card, off-board and gap refusals, all 5 parts, remove, undo, no sideways scroll). Laptop 1280 × 800: one click places, Ctrl+Z undoes.
- Not checked yet: the real `/p/perch/3` route with a log-in. Please check it on your Mac before you merge.

## Notes

- Pin layouts checked against: the Adafruit MAX98357A board file (header LRC, BCLK, DIN, GAIN, SD, GND, Vin; − terminal on the LRC side), a KiCad footprint of the round INMP441 board (2 rows: GND, VDD, SD and L/R, WS, SCK, 7.62 mm apart), and the LCDWIKI MSP1541 manual for the 8-pin ST7789 (GND, VCC, SCL, SDA, RES, DC, CS, BLK). Boards from other sellers can differ: check the labels on your board.
- The real amplifier terminal is a 3.5 mm screw block. Jumper puts OUT+ and OUT− in breadboard holes, so that the learner can wire the speaker.
- Modules do not turn. Pin 1 is at the lowest column, and the other pins go to higher columns.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01FE2dCHwfc5CvtL3yZ3joJh
