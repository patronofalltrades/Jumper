# Mascot band on the landing page

Branch: `Features/BigHaulDesign` (issue #152)

## Hanif's prompts (his words)

1. "okay cool, let's use these mascots in a way that is similar to duolingo is using them for the landing page. I want it to be sleek clean and modern. When users arrive at the landing page they should be in awe of the 3D characters"
2. Answers in the session form: hero layout "Band beside the pitch"; sections "Yes, one per section"; branch "Features/BigHaulDesign".
3. "can we do something about the eyes? I think when they open their eyes while Idle its scary"

## What Claude made

- The hero shows the 3D band (Bulb, Volt, Knob, Coil) beside the pitch card, in place of the 3D breadboard. The mascots drop onto a dark stage with a green edge, all cheer, then each mascot is happy in turn. A pointer or a tap on a mascot makes it cheer. The heads turn to the pointer.
- The project tabs show the mascot of the project in 3D ("Your guide: Bulb"). It drops in when the tab changes.
- Open eyes: big dark pupils with two shine dots, and a blink every few seconds (not small dots on big white eyes).
- Code: `components/mascots-3d/models.tsx`, `components/mascots-3d/stage.tsx`, `components/landing/mascot-band.tsx`; the pure motion rules in `lib/game/band.ts`, with tests in `tests/band.test.ts`.
