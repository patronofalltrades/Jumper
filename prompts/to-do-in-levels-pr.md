# PR text for issue #52 (Hanif opens the PR)

**Title:** Build mode: a task list with done, now and to do

**Body:**

closes #52

As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.
Added: I want to see all the tasks of the level as a list that I can track (done, now, to do), so that I always know what to do next.

## What changed

- **A "Tasks" panel** at the top-left of the board, below the guide bar. The header shows the count: "Tasks · 3 of 8 done".
- **All the tasks of the level**, in order, with the same text as the pop-ups.
- **3 states.** Done: a green tick and muted text. Now: a ring in the primary color and bold text. To do: an empty circle.
- **The ticks come from the board as it is now.** Remove a wire and the tick of its task goes; put it back and the tick comes back. After the last task, "Now" is the first task that is not done. A breadboard or the ESP32-S3 is done after "Got it". A button or a resistor can use either side.
- **Laptop:** the panel starts open. **Phone:** a small "Tasks 3/8" chip; a tap opens the list over the board, a second tap closes it. Not on the intro card.
- Only the panel takes clicks; the rest of the board works as before. The panel stops above the Check button.
- A screen reader reads "Done", "Now" or "To do" before each task.
- `taskMarks()` in `lib/game/engine.ts` is a pure function: no React, no 3D.
- Text in `content/ui/build.json`. No new package. No database change.

## Tests

`tests/engine.test.ts` (red first, then green):
- An empty board: the first task is now, the others are to do.
- Level 1: the "Got it" tasks get a tick when the learner presses it.
- A full board after the last task: every task has a tick. Each Perch level, played with its finished board, ends with a tick on every task.
- A board with one wire removed: its tick goes and its task is now; with the wire back, all ticks show.
- A button used on its other side: the ticks show.
- A part put down before its task: no tick.

These are not one of the two required tests in PLAN.md section 4, so this PR has no red and green screenshots.

248 tests, the type check, lint and the build pass.

Browser check on a temporary page with the Perch content (not committed), at 390 px and 1280 px, light and dark: the counts, the ticks after a wire is removed and put back, the chip on a phone, and no overlap with the guide bar, the Check button or the tool bar. No page errors, no sideways scroll.

## Not in this PR

- After the last task, when parts are removed, the step-by-step pop-ups and the glowing holes do not come back. The list shows what to do.

## How to check

1. Open a level. The panel does not show on the intro card. Press Start.
2. Laptop: the panel is open. Phone: tap the "Tasks 0/8" chip to open it, and tap again to close it.
3. Finish a task. Its tick shows at once, and the next task is "Now".
4. Finish the level. All tasks have a tick. Remove a wire: its tick goes, and its task is "Now". Undo: the tick comes back.
5. Check light and dark mode.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_011rMt83dZsACHhNRHD5MfGj
