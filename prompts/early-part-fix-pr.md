# PR title

Fix: a correct part placed before its task is a quiet snap, not a mistake

# PR body

closes #72

## User story

PLAN.md row 5: As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

## What occurred

A part that did a later task of the level buzzed and counted as a mistake, although its pins were correct. Example: in Perch Level 3, the pop-up asks for WS → GPIO 4. The learner wires SD → GPIO 6 first (task 7). The wire buzzed, the Mistake pop-up opened, and `mistakes` went up by 1. This took away the no-mistake bonus and added a bar to the dashboard mistakes chart. Cause: `step()` in `lib/game/engine.ts` compared a new part only with the tasks up to `reached`.

## How it was found

Hanif found it during #63. The #63 notes say: "A correct part placed out of order still counts as a mistake; this fix does not change that (a separate issue)."

## How it was repaired

Decision of Hanif: (a) quiet snap. A correct part placed early snaps in with no mistake and no note. Its task ticks when the learner gets to it.

- `step()` in `lib/game/engine.ts`: after the forbid rule check, a new part that makes a task after the task of now done (and the task was not done before) gives a snap. `Progress` does not change: `mistakes`, `tasksDone`, `xp` and the pop-up stay.
- `taskState()` has a new `locked` argument. An early part sees as fixed only the side choices (button, resistor) of the tasks that the learner reached. So it does not lock a wrong side for an earlier task.
- `advance()` already finishes a task that the board does, so the early task finishes by itself when the learner gets there, and its XP counts one time only. `doneTasks()` and `taskMarks()` did not change: no tick comes early.
- A part that does no task, and a part that makes a forbidden connection, still buzz.
- Known limit: if the learner later does the earlier task on a side that does not fit the early wire, the early wire stays and does not count; the learner needs the other wire. A short circuit across the button is still a forbid rule Mistake.

No migration, no content change, no change to the saved-board format.

## Testing scenarios and results

Scenarios are in `prompts/early-part-fix.md` (Given / When / Then). Tests are in `tests/engine.test.ts`, in the group "a correct part placed early (issue #72)".

| Scenario | Test |
| --- | --- |
| S1 Early wire in Perch Level 3 snaps, pop-up and task list stay | red, then green |
| S2 Early wire, then the tasks before it: `tasksDone` 7, `xp` 70, once | red, then green |
| S3 Remove or Undo of the early wire: no Mistake, the task is not done | red, then green |
| S4 Early wire that makes a forbidden connection still buzzes | green on both (guard) |
| S5 A wire or module that does no task still buzzes (`wrong_wire`, `wrong_part`) | green on both (guard) |
| S6 A "Got it" task between | red, then green |
| S7 Button side choice (GND wire on the other side first) | red, then green |
| S8 Arduino Foundations Level 2 | red, then green |
| S9 Old save with `reached` equal to `index` | red, then green |
| S10 Every finished Perch and Arduino board: no Mistake | existing tests, green |

- Red (old code, tests only): 7 failed, 388 passed (395 tests).
- Green (with the fix): 395 passed (27 files).
- One old test changed on purpose: "does not tick a task that the learner did not reach yet". It expected a Mistake for an early resistor; it now expects a quiet snap and no tick.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` (placeholder Supabase values) pass.
- Not done: a browser check (optional). The live Supabase project was not touched.

## The three items for a required test (assignment rule 3)

- What the test does: it plays a learner on a level. The learner places a correct part for a later task, and the test checks for a snap, no Mistake, and no change to `mistakes`, `tasksDone` and `xp`. Then the learner does the tasks before it, and the test checks that the early task finishes by itself, one time.
- Red and green screenshots: the red and green output is in `prompts/early-part-fix.md`; Hanif adds the screenshots.
- A real change that makes the test fail: if `step()` stops checking the tasks after `reached` (the old code), S1 gives `buzz` and `mistakes` 1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNXHJkrMUWvmnmRoZe
