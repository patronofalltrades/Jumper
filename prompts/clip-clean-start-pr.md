closes #103
## User story
As a new visitor or learner, I want to watch a short video in the app that shows how build mode works (place a wire, read the pop-up, press Check) and, at the start of each level, a short clip that shows what I build in that level, so that I know how to play and what comes next. (PLAN.md row 15)
## What changed
- `lib/game/walkthrough.ts`: `levelClip` takes a `start` caption. After level 1, the clip starts with a new `board` step: the board of the levels before, with no new part and no glow. The clip has a new `faded` list: the ids of the parts of the levels before. `introClip` keeps its steps and passes `faded` on.
- `content/ui/walkthrough.json`: `start`: "This is your board from level {n}. The new parts come next." ({n} is the level before), in ASD-STE100.
- `lib/content/clips.ts`: fills `start` with the number of the level before.
- `lib/game/board-store.ts`: a `faded` list in the state and in `open()`. It is empty unless the caller gives it, so the build page draws no part faded.
- `components/scene/build-scene.tsx`: a small `Fade` wrapper draws a part in the `faded` list at 30 % opacity. The part meshes (`parts.tsx`, `modules.tsx`) do not change.
- `components/walkthrough/clip-player.tsx`: gives `clip.faded` to the clip store. The `board` step stays on the screen as long as a pop-up step.
- `tests/walkthrough.test.ts`, `tests/board-store.test.ts`: tests for the first step and the faded parts (red commit `39bef17` before the fix `c8fca74`).
- `tests/arduino.test.ts`: one old test changed on purpose. It expected engine state on each step before the end; the `board` step has none.
- `PLAN.md`: row 38 added at the end of "Plan vs. Reality". No existing line changed.
- `prompts/clip-clean-start.md`, `prompts/clip-clean-start-pr.md`, `ledger/LEDGER.md`: prompt log, this text, ledger entry.

The clip still uses the holes of the finished board (`content/boards/`). `lib/game/engine.ts` does not change (#101 makes the guide use the same holes).
## How it was tested
- What the tests check, in plain words: the Perch level 2 to 5 clips start with one step that shows the board of the levels before, with the new caption, and add no part in that step. Level 1 has no such step. Each clip fades the parts of the levels before, and no part of its own level. The level 2 clip from `loadLevelClips` has the exact caption "This is your board from level 1. The new parts come next." The intro clip keeps its 5 steps. The board store fades no part on a level board, and fades the parts that a clip gives it.
- Red: `vitest run tests/walkthrough.test.ts tests/board-store.test.ts`: 13 failed (no `board` step, `faded` undefined, no `start` text), 57 passed.
- Green: the same 2 files pass. `vitest run`: 502 passed in 36 files.
- Typecheck (`next typegen && tsc --noEmit`): exit 0. Lint (`eslint`): exit 0.
- A real change that makes the test fail: remove the `board` step from `levelClip`, and the Perch level 2 clip starts with "Put the button across the gap in the middle of breadboard A." again, so the tests fail.
- Browser, local only: a temporary route (removed before the commit) opened the Perch level 1 and 2 clips, the Arduino Foundations level 2 clip and the intro clip in Chromium (software GL) at 1280 x 800 and 390 x 844, on `next dev` with placeholder Supabase values. Perch level 2 starts with the new caption and pale level 1 wires; at the end, the new parts are in full color and the level 1 wires stay pale. Perch level 1 starts with its first task, as before. No page errors. No Supabase project was used.
## Not checked
- The videos in `public/videos/` were not recorded again. `npm run videos` makes a temporary account on the Supabase project with `SUPABASE_SECRET_KEY`, and this session must not use the live project. The old videos (the fallback on slow devices and with no WebGL) still show the old clips. Hanif can run `npm run videos` (README) after the merge.
- The clip opened from the real level map (it needs a log-in), the live Vercel app, a real phone and a real GPU.
- Reduced motion: the `board` step is a still picture with no part, so it should work with Back and Next, but it was not seen.
- Merge with the sibling PRs (#100, #101, #102, #104): they also add rows to `PLAN.md` and `ledger/LEDGER.md`, and some change `content/ui/build.json` and `components/scene/build-scene.tsx`, so small conflicts are possible.
- Assignment rule 3 (red and green screenshots). It applies only if this test counts as a required test; the red and green output is above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNpRC5YSKtBnkC1UpA
