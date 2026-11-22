# Prompt log: Compare views, the answer first (Light an LED, Arduino Uno, level 2)

1. "Change only the Compare views panel (Light an LED, Arduino Uno, Level 2). Make these 3 changes, in this order."

   1. Put the answer first. The match verdict goes to the top of the panel, in the largest and boldest type. Match: "Your board matches the reference ✓". No match: name the connection that is off, for example "Pin 13's wire goes to row 18. The reference uses row 22.", and highlight that wire on the 3D board in a color that nothing else on the screen uses. While the panel is open, WRITE THE SKETCH has the same size and weight as CLEAR and CHECK.
   2. Link the three views under the answer. The schematic ("Drawing") and the reference photo ("Real kit") side by side at the same size, and the 3D canvas labelled "Your board". Each connection has one color in the three views. The panel opens with the off connection selected (or the first connection when all match). "A different layout" stays as a smaller link below the views.
   3. Turn the differences of the photo into numbered markers, with a list "Different in this photo, fine on your board". Keep the photo credit and source line.

   "Change only what is listed above. Keep every other screen, control, lesson step and the CHECK flow working as they do now."

   Claude added `verdictOf`, `wireOn`, `placeOf` and `placeText` to `lib/journey/select.ts` (pure, with Vitest tests), a `compare` mark in the board store for the 3D board (the net colors and the magenta off wire), and rebuilt the panel. The text is in `content/ui/journey.json` and `content/lessons/af-led.json`. Claude checked the panel in a browser on a laptop and a phone screen size, with a temporary page that it did not commit.
