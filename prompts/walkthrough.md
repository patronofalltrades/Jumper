# Prompt log: Walkthrough clips (feature 15, issue #48)

1. "Work on walkthrough simple, issue 48. Branch is feature/walkthrough simple https://github.com/patronofalltrades/Jumper/tree/Feature%2FWalkthroughSimple read all documenation before touching any code"

   Claude read issue #48, CLAUDE.md, AGENTS.md, README.md, PLAN.md (row 15 of "Plan vs. Reality"), the PRD, the TRD, `schema.md`, the ledger, the guard and ledger hooks, the landing page and mascot prompt logs, the task engine, the board store, the build scene, build mode, the level map, the landing page, `content/boards/perch.json` and `content/projects/perch.json`. Claude worked on `Feature/WalkthroughSimple`, the branch that Hanif made. Then Claude asked 4 questions.

2. Answers: "Keep both" (the landing board that wires itself stays, and a button opens the intro clip), "Each time" (the clip opens each time the level opens, until the first task is done), "Yes, all levels" (a Watch button also on a locked level), and "make it so that it is full screen window but also able to do video on screen/screen on top of the screen". Claude asked to confirm the last answer: the clip opens big, and a button makes it a small player on top of the page, so the learner can watch and build at the same time. Hanif: "Yes, that is it".

   Claude built:
   - `lib/game/walkthrough.ts`: `levelClip()` plays the level with the task engine. The board starts with the parts of the levels before it, and adds the parts of the level from `content/boards/perch.json`, one at a time. Each task gets one step, with the instruction of the task as its caption. A part that is always on the bench gets "Got it" and adds no part. A part that also finishes the task after it gives that task a step with no part (Level 2: the light goes in the line of the resistor). The clip ends on the finished board, with Volt. `introClip()` takes 4 steps of Level 2 for the landing page: place the button, connect a wire, read the pop-up, press Check. `clipFrame()` gives the board of a step: first where the part goes (the holes glow), then the part in place; with reduced motion, only the part in place.
   - Tests first (red), then the code (green): `tests/walkthrough.test.ts` (28 tests). The order of the steps and the caption of each step for each Perch level, the intro clip, and reduced motion.
   - `lib/content/clips.ts`: the clips come from the content files, not the database, so the landing page can show one to a visitor.
   - `lib/game/board-store.ts`: `BoardContext`. The clip has its own board store, so it never changes the board of the learner.
   - `components/walkthrough/clip-player.tsx`: the clip window. Big: full screen on a phone, a large window on a laptop. Small: a player in a corner, on top of the page. Play/pause, replay and skip. A cover on the board stops taps and drags, so the viewer cannot wire. With reduced motion, each step is a still picture, with Back and Next. Esc closes the clip.
   - Build mode: the clip opens when the level opens, until the first task is done. A "Watch how" button in the header opens it again.
   - Level map: a "Watch" button on each level, also on a locked level.
   - Landing page: a "Watch how" button next to "How Jumper works" opens the intro clip. The board that wires itself stays.
   - Text in `content/ui/walkthrough.json`.

   Checks: 242 tests, the type check, lint and the build pass. Browser check on the landing page (`next start` with placeholder Supabase keys) at 390 px (dark, and light with reduced motion) and 1280 px (light): the clip plays, Pause stops it, the small player stays on top while the page scrolls, Esc closes it, no page errors, no sideways scroll. The level map and build mode need a log-in, so their Watch buttons are not checked in a browser yet.
