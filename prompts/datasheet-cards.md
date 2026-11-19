# Prompt log: Datasheet cards (issue #182)

1. Hanif gave Claude two user interviews of November 18, 2026 (Student A and Lecturer B), and asked: "based on these two feedbacks, what issues do you see and what sort of JTBD we can add to our issue list to tackle?" Claude proposed eight jobs, J1 to J8. J3: "When I meet a new part, I want to read its pinout from a datasheet myself, so that I can wire parts that the app does not explain."
2. Hanif: "Let's start with J3, J6, and start a separate session to do a spike on J8."
3. Hanif's decisions: open J3 as a discovery issue, because its user story is not in `PLAN.md`; branch `feature/datasheet-cards`.
4. Claude's scope: a `datasheet` block (summary, power, real datasheet URL, one line for each pin name) in each module file in `content/parts/`; pure functions in `lib/circuit/datasheet.ts` with Vitest tests; a Datasheet button in the parts tray that opens the card. The two boards and "find the pin" tasks are not in this pull request.
5. Hanif: "let's see where we are in terms of like the code that we're pushing. Can we do some adversarial tests first?" An independent reviewer read the branch and checked the cards against the real datasheets. Fixes from that review:
   - Pushbutton: the real switch has no pin numbers, and on the Omron drawing legs 1-2 are one side and 3-4 the other. The card now says this. The rating is 3 V to 24 V DC (not 5 V), so 3.3 V is safe.
   - MAX98357A: SD text is for the breakout (a resistor pulls SD up), and GAIN gives the direction (ground 12 dB, Vin 6 dB). ST7789: connect BLK to 3.3 V if you do not control it. INMP441: 1.62 V to 3.63 V, and the canonical datasheet URL.
   - Keys 1–5 and Esc do nothing in build mode while a dialog is open (before, key 1 closed the card and changed the tool).
   - The Datasheet button has a fixed place first in the tray (disabled for the speaker), so the chips do not move and a phone shows it.
   - Light pin chips with a dark dashed border for screw terminals (contrast in dark mode), the pinout picture is hidden from screen readers (the table has the same data), the link says "new tab", the pin dot uses the `probe` token, and a test checks that legs with the same name have the same label.
