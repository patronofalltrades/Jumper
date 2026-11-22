# Prompt log: Compare views, the answer first (Light an LED, Arduino Uno, level 2)

1. "Change only the Compare views panel (Light an LED, Arduino Uno, Level 2). Make these 3 changes, in this order."

   1. Put the answer first. The match verdict goes to the top of the panel, in the largest and boldest type. Match: "Your board matches the reference ✓". No match: name the connection that is off, for example "Pin 13's wire goes to row 18. The reference uses row 22.", and highlight that wire on the 3D board in a color that nothing else on the screen uses. While the panel is open, WRITE THE SKETCH has the same size and weight as CLEAR and CHECK.
   2. Link the three views under the answer. The schematic ("Drawing") and the reference photo ("Real kit") side by side at the same size, and the 3D canvas labelled "Your board". Each connection has one color in the three views. The panel opens with the off connection selected (or the first connection when all match). "A different layout" stays as a smaller link below the views.
   3. Turn the differences of the photo into numbered markers, with a list "Different in this photo, fine on your board". Keep the photo credit and source line.

   "Change only what is listed above. Keep every other screen, control, lesson step and the CHECK flow working as they do now."

   Claude added `verdictOf`, `wireOn`, `placeOf` and `placeText` to `lib/journey/select.ts` (pure, with Vitest tests), a `compare` mark in the board store for the 3D board (the net colors and the magenta off wire), and rebuilt the panel. The text is in `content/ui/journey.json` and `content/lessons/af-led.json`. Claude checked the panel in a browser on a laptop and a phone screen size, with a temporary page that it did not commit.

2. "do e2e testing on the new feature"

   Claude wrote `e2e/flow7-compare-views.spec.ts`. It uses a temporary account and the real app. It checks the answer for a board that matches and for a board where the pin 13 wire goes to row 18, the two views side by side at the same size, the numbered photo notes, the size of "Write the sketch", the magenta wire on the 3D board (laptop), and at the end the real Check.

   The flow found a bug in the first change: on a phone, while the panel was open, "Write the sketch" went onto two lines in the row (77 px high, Clear is 44 px). Now the button stays on one line, and the row can wrap while the panel is open.

   The e2e helpers in `e2e/levels.ts` did not work on the live Supabase project: its tasks are older than `content/projects/` (level 1 has 4 tasks, the file has 3), and since #218 only level 1 opens its clip by itself. Claude changed the helpers only on the local machine for the run, and did not commit that change.
