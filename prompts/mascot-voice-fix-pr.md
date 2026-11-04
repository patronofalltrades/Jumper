# Issue and PR text: Mascot load and natural voice

## Issue

**Title:** Landing mascots flash in 2D before 3D, and the read-aloud voice sounds robotic

**Body:**

## User stories

PLAN.md row 53 (rows 2a and 14): As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account. Added: I want the home page to feel like a game that I want to play, like the Duolingo home page.

PLAN.md row 47 (row 5): As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

## Problem

1. When the home page opens, the 2D mascots show for a short time before the 3D mascots load. A caption ("Point at a mascot to make it cheer") shows on the image.
2. The voice that reads the steps aloud sounds robotic.

## Expected

1. The 3D mascots show with no 2D step and no caption.
2. The voice is the most natural voice that the browser has.

## PR

**Title:** Show the 3D mascots with no 2D flash or caption, and read steps in a natural voice

**Body:**

closes #166

## User stories

PLAN.md row 53 (rows 2a and 14) and row 47 (row 5). The full text is in the issue.

## What occurred

1. **2D flash.** `components/landing/mascot-band.tsx` gave the 2D mascots as the `loading` view of `next/dynamic`. They showed until three.js loaded, then the 3D mascots replaced them.
2. **Robotic voice.** `speak()` in `components/build/alive-audio.ts` did not choose a voice. The browser used its default voice, which is often an old voice (for example "Microsoft David" on Windows or eSpeak on Linux).

How Hanif found it: Hanif opened the live URL and saw the 2D mascots before the 3D ones, and heard the read-aloud voice.

## How we repaired it

1. The 2D stand-in and the caption are removed. Until the 3D scene loads, only the green glow shows. The canvas fades in (0.5 s) after its first frame. The two caption strings are removed from `content/ui/landing.json`.
2. `lib/game/voice.ts` (pure, with `tests/voice.test.ts`, 5 tests) gives each English voice a score and chooses the most natural one: Edge "Natural", Chrome "Google", Safari "Enhanced" or "Premium". The old and novelty voices get a low score. `speak()` uses that voice at rate 0.95. The browser loads its voices late, so the choice is made again at `voiceschanged`.

Not changed: no new package, no API key, no change to the database. A browser with only eSpeak (Firefox on Linux) still sounds robotic. A cloud voice needs a new dependency and Hanif's approval.

## Checks

- Vitest: 65 files, 856 tests pass (5 new in `tests/voice.test.ts`).
- `tsc --noEmit` and ESLint: no errors.
- Browser check (Chromium, 1280 × 800): at 0.3 s the band shows only the glow (no 2D mascots); at 6 s the 3D band shows with no caption.

Prompts: `prompts/mascot-voice-fix.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnM85GSUYCbQuoJLLjP
