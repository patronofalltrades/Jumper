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
