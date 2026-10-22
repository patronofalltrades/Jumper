# PR text for issue #48 (Hanif opens the PR)

**Title:** Walkthrough: 3D replay clips at the level start, on the level map and on the landing page

**Body:**

closes #48

As a new visitor or learner, I want to watch a short video in the app that shows how build mode works (place a wire, read the pop-up, press Check) and, at the start of each level, a short clip that shows what I build in that level, so that I know how to play and what comes next.

## What changed

- **A clip for each level.** The 3D board starts with the board of the levels before it. The parts of the level come in one at a time, from `content/boards/perch.json`, in task order. First the holes glow where the part goes, then the part snaps in with a green flash.
- **Captions.** Each step shows the instruction of its task, from `content/projects/perch.json`. No clip text in code.
- **The end.** The finished board shows, and Volt cheers.
- **Level start.** The clip opens each time the level opens, until the learner finishes the first task. Skip closes it. A "Watch how" button in build mode opens it again.
- **Level map.** A "Watch" button on each level. A locked level has one too, so the learner sees what comes next.
- **Landing page.** A "Watch how" button opens the intro clip: put a part on the board, connect a wire, read the pop-up, press Check, with captions. The board that wires itself (#46) stays.
- **Big or small.** The clip opens big: full screen on a phone, a large window on a laptop. "Make the clip small" puts it in a corner on top of the page, so the learner can watch and build at the same time.
- **Controls.** Play/pause, replay, skip, and Esc to close. A cover on the board stops taps and drags, so the viewer cannot wire.
- **Reduced motion.** Each step is a still picture with its caption. Back and Next go to the steps.
- **Text** in `content/ui/walkthrough.json`.
- The clip has its own board store (`BoardContext`), so it never changes the board of the learner.
- No new package. No database change.

## Tests

`tests/walkthrough.test.ts` (28 tests, red first, then green):
- For each Perch level: one step for each task, in task order, with the instruction of the task as its caption; the clip starts on the board of the levels before it and adds the parts of the level on top; it ends on the finished board.
- Level 1: the breadboards and the ESP32-S3 add no part. Level 2: the light also finishes the task "resistor to light", so that step adds no part.
- The intro clip: place, wire, pop-up, Check, end, with the captions of `content/ui/walkthrough.json`.
- Reduced motion: one still picture for each step.

These are not one of the two required tests in PLAN.md section 4, so this PR has no red and green screenshots.

242 tests, the type check, lint and the build pass.

## Not in this PR

- Recorded video files (a separate issue).

## How to check

1. Log out. Open `/`. Click "Watch how". The intro clip plays. Try Pause, Replay, "Make the clip small" and Skip.
2. Log in. Open the level map. Click "Watch" on a level, also on a locked level.
3. Open a level that you did not start. The clip opens before the first task. Skip it. Click "Watch how" in the header. The clip opens again.
4. Make the clip small, and connect a wire while it plays.
5. Turn on reduced motion. Open a clip. Each step is a still picture, with Back and Next.
6. Check a phone and a laptop, in light and dark mode.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015J19rRFfJRCvs8NCQR55kL
