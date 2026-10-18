# Prompt log: module placement (feature 4, issue #17)

1. "Work on Module placement: button, mic, amplifier, screen Issue #17 Branch: https://github.com/patronofalltrades/Jumper/tree/Feature%2FModules. Read these first: Claude.md, PLAN.md, Readme.md, Schema.md"

   Claude read the four files, issue #17, TRD sections 5, 6 and 12, `content/projects/perch.json` and the feature 3 code. Claude worked on Hanif's branch `Feature/Modules`.

   Claude asked 2 questions, because the issue and `perch.json` did not agree:
   - The issue refuses a module that goes across the center gap. A real pushbutton must go across the gap (`perch.json`: `zone: bbA-center-gap`). Hanif chose: **the button must go across the gap.** Each pin layout says if its part goes across the gap.
   - Level 4 wires `spk1.+` to `amp1.OUT+`. On a real MAX98357A, OUT+ and OUT− are a screw terminal, not header pins. Hanif chose: **the speaker is a two-leg part** (like the LED), and the amplifier has its 7 header pins plus OUT+ and OUT− in breadboard holes on the far edge, across the gap.

   Claude built:
   - `content/parts/pushbutton.json`, `inmp441.json`, `max98357a.json`, `st7789-154.json`: the pin layouts (name, label, row and column from pin 1), the "across the gap" flag, the body size and color, and a source.
   - `lib/circuit/modules.ts`: the hole of each pin from pin 1, the body outline and the holes under it, the gap test.
   - `lib/circuit/parts.ts`: modules (`{ id, type, at }`, TRD 6.3) and the speaker are parts. `checkModule()` refuses a module off the board, with pin 1 on a rail, on the wrong side of the gap, with a pin in a full, covered or ESP32-S3 hole, or with its body on the ESP32-S3 or on another part.
   - `lib/circuit/nets.ts`: module pins join the nets (the 2 legs of a button with the same name connect), `mic1.WS` and `spk1.+` resolve, and `describeHole()` names module pins.
   - `lib/game/board-store.ts`: a click puts a module down; on a phone, the first tap shows the shadow and the second tap on the same hole puts it down. Remove (on a pin or under the body) and Undo work.
   - `components/scene/modules.tsx`: the module bodies with printed pin labels, the button cap, the mic port, the amplifier terminal, the screen that stands up and looks at you, and the green or red shadow. The speaker is in `components/scene/parts.tsx`.
   - `components/build/build-view.tsx`: a **Parts** button and a parts tray (Button, Mic, Amp, Speaker, Screen) in the row of the wire colors, so the board does not move.
   - Text in `content/ui/build.json`, in ASD-STE100.
   - Tests: `tests/modules.test.ts` (16) and 5 more in `tests/board-store.test.ts`. 82 tests pass.

   Browser check (Claude's scratchpad page with the same `BuildView`, not the log-in route): 15 touch checks at 390 × 844 in light and dark mode, and 2 mouse checks at 1280 × 800, pass.
