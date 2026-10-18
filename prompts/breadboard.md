# Prompt log: 3D breadboard editor (feature 3, issue #15)

1. "git fetch origin / git checkout Feature/Breadboard"

   Claude checked out Hanif's branch `Feature/Breadboard` (it includes the merged lobby, PR #14) and read issue #15, TRD sections 4 to 6 and `reference/breadboard-prototype.html`. Claude installed the 4 TRD packages: three 0.186.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, zustand 5.0.15 (and @types/three).

2. "let's work in another session"

   Claude stopped and wrote the notes below for the next session. No feature code is written yet.

## Notes for the next session (Claude)

- Perch uses **two** 400-hole breadboards, `bbA` and `bbB`, with the ESP32-S3-DevKitC-1 across both (`perch.json` level 1: `zone: across-bbA-bbB`). The prototype has one 830-hole board and an ESP32 DevKit V1, so its geometry cannot be copied as is.
- Planned layout: the ESP's two 22-pin headers in row `j` of bbA and row `a` of bbB. Each pin then has 4 free holes in its strip. The ESP body covers the bottom rails of bbA and the top rails of bbB, so `bbA.+` / `bbA.-` are the top rails of bbA and `bbB.+` / `bbB.-` are the bottom rails of bbB.
- Endpoint names in `perch.json`: `esp.3V3`, `esp.GND`, `esp.GPIOn`, `bbA.+`, `bbA.-`, `r1.1`, `r1.2`, `led1.anode`, `led1.cathode`. Pins with the same name on the ESP (2 × 3V3, 4 × GND) are one net.
- ESP32-S3-DevKitC-1 header order (from Espressif, to check again): J1 = 3V3, 3V3, RST, 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, 5V, GND. J3 = GND, TX (43), RX (44), 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, GND, GND. Every GPIO that Perch uses is in this list.
- Planned files: `lib/circuit/` (holes, strips, union-find nets, endpoint lookup, placement rules, with Vitest tests), `content/parts/esp32-s3-devkitc-1.json` (pin layout, TRD 4.1), `lib/game/board-store.ts` (Zustand: parts, tool, pending hole, undo stack), `components/scene/` (Canvas with `frameloop="demand"`, boards, instanced holes, ESP, wire, resistor, LED, camera with a top view).
- Open question for Hanif: the build page needs the bottom of the screen for the tool bar (Wire, Resistor, LED, Erase, Undo). Claude plans to hide the site dock there and show a "← Lobby" button in the top bar.

3. "Work on https://github.com/patronofalltrades/Jumper/issues/15 on Branch Feature/Breadboard. Read readme.md, claude.md, plan.md, and schema.md before touching anything"

   Claude read the four files, issue #15, TRD sections 4 to 6 and 12, and the prototype. Claude asked 2 questions. Hanif chose: hide the dock on the build page and show "← Lobby" in the top bar; the bench starts with the two breadboards and the ESP32-S3 on every level.

   Claude built the editor:
   - `content/parts/esp32-s3-devkitc-1.json`: the J1 and J3 headers.
   - `lib/circuit/`: holes and names (`A-c14`, `B-R+3`), strips and rails, the Perch bench, nets (union-find), endpoint lookup (`esp.GPIO4`, `bbA.+`, `led1.anode`), placement rules. Tests in `tests/circuit.test.ts`.
   - `lib/game/board-store.ts`: Zustand store with tools, the first hole of a part, hover, notices and undo. Tests in `tests/board-store.test.ts`.
   - `components/scene/`: the R3F scene (lights, boards, instanced holes, ESP32-S3, wire, resistor, LED, camera limits).
   - `components/build/build-view.tsx` and `/p/[project]/[level]`: top bar, tool bar, hints.

4. "placement of the instructions seem off and it's too technical. Use STE1000 to guide users and rethink where we should put the prompts/instructions for the user"

   Claude moved the guidance to two places. The guide bar at the top of the board tells what to do now, with "Step 1 of 2" for parts with two legs. A card next to the pointer (above the finger on a phone) tells what is at the hole and what connects to it, or why the last click did not work, in red. The tool bar keeps only the tools and the wire colors, so the bottom of the screen stays free for the task pop-ups of feature 5. All the text is in `content/ui/build.json`, in ASD-STE100, with no hole codes. `describeHole()` in `lib/circuit/nets.ts` gives the facts for the card (3 new tests).

5. "Now it looks better. Can you use playwright to stress test the touch and interaction of the modal when we are doing a project?"

   Claude read "the modal" as the guide bar and the hole card (the task pop-ups come in feature 5). A Playwright script on the scratchpad test page did 34 checks on 4 touch screens (360×640, 390×844, 430×932, 820×1180): Perch Level 1 and Level 2 by touch (the rules from `perch.json` pass), the guide text at each step, mistakes, the card at the 4 corners, long press, one-finger drag, pinch, 200 fast taps with tool changes, undo to an empty bench, a fast double tap, and a turn to landscape in the middle of a wire.

   The test found 3 bugs, and Claude fixed them: the board moved when the tool changed (the color row went away); the camera did not frame the bench again after a turn; the card could go behind the tool bar in landscape. After the fixes, 136 of 136 checks pass.
