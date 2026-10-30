# Prompt log: phone layout that keeps the board clear (issue #126)

1. Hanif's request for this batch (his words):

   "start working on #122 to #127 in different subsessions using haiku 5.5"

2. The task for #126 (the issue text, copied by the parent session):

   "Build issue #126 in the Jumper repo, on branch feature/phone-layout. Below 640 px: the task list and the connection list start closed. The button row fits on one line or goes into a bottom sheet. The 3D board gets 60% or more of the screen height at 390 x 844. Desktop must not change. Playwright screenshots at 390 x 844 before and after, and at 1280 x 800 after."

## Ledger notes (Claude, not Hanif's words)

How it works:
- The two side panels (`task-list.tsx`, `connection-list.tsx`) already start closed below 640 px since #112. The rule is now a pure function, `panelStartsOpen(laptop, codeOpen)` in `lib/game/phone-layout.ts`, with 3 Vitest tests. The panels use it instead of `laptop && !small`. The behaviour does not change.
- The button row (Clear, Check, Build it for me) wrapped to two lines at 390 px. It now uses `max-sm:flex-nowrap`. The Build trigger is smaller on a phone. Its label is unchanged, so no new text is in `content/`.
- The phone pop-up sheet (`popups.tsx`) was `h-60` (240 px). It is `h-40` (160 px). Its text scrolls inside the sheet.
- The phone tool bar is shorter (tool buttons `min-h-12`, gap and tray row smaller, `max-sm` only).
- Desktop: the 1280 x 800 screenshots before and after are pixel-identical (Pillow `ImageChops.difference` bounding box: None).

Measured board height at 390 x 844, with the task sheet open (the normal build state):
- Before: 412 px (49%). The board area was cut by the 240 px sheet and the 127 px tool bar. The button row wrapped to two lines.
- After: 508 px (60.2%). The button row is on one line.

Choices made:
- Shrink the sheet and the tool bar, not the board's overlay. The board area is a flex column, so the sheet and bar take its height. Covering the board with the sheet would have hidden the glowing holes.
- The "Build it for me" label was kept in full, at a smaller font, instead of a new short label.
- No new dependency, no migration, no `localStorage`.

Not checked:
- A real phone and touch input. The check used Chromium with a 390 x 844 touch viewport.
- The sheet at 160 px with the long Check, Mistake and Concept texts. They scroll; I did not look at each one.
- Dark mode, and the code panel open on a phone.
- The Playwright suite in `e2e/` (it needs the Supabase project; not run).
- The live Vercel app.

Process notes:
- The browser check used a temporary route at `app/s/phone-check/` (not committed) with Perch level 1 data, and placeholder Supabase values. The Supabase save banner was hidden in the screenshots. The walkthrough clip opens by itself at the start of a level; the script closes it.
- The task-observer skill named in CLAUDE.md is not in this session's skill list, so I could not load it.
- The `ledger/raw/` entry was staged by the hook and went into the red commit (59f5b26) and the green commit (871fb40). I did not edit `ledger/LEDGER.md` or `PLAN.md`.
