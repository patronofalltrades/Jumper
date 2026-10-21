# PR text for issue #44 (Hanif opens the PR)

**Title:** Jumper mascot: Volt guides the pop-ups, the level map and Level complete

**Body:**

closes #44

As a learner, I want a Jumper mascot that guides me (on the home page, the level map and the pop-ups) and reacts when I pass or fail a task, so that the app feels like a game and not a manual.

## What changed

- **Volt is the mascot.** One fixed mascot for all of Jumper: the box robot of `public/avatars/volt.svg`. Volt stays a profile picture choice too.
- **4 poses as SVG** (`components/art/volt.tsx`): idle, happy, oops and cheer. Each pose has its own eyes, mouth and arms.
- **Build mode pop-ups:** Volt shows in the task pop-up (idle), the "Nice! Here is what happened" pop-up (happy, with a hop) and the Mistake pop-up (oops, with a shake). On a laptop and in the sheet at the bottom of a phone.
- **Level map:** Volt stands on the current level: the first open level, or the last level when all levels passed.
- **Level complete:** Volt cheers next to the Perch device that wakes up, and hops at the same time as the device.
- **Reduced motion:** when the device asks for reduced motion, Volt does not move.
- **Text** in `content/ui/mascot.json`: the name, a screen reader text for each pose, and the map text.
- No new package. No database change.

## Tests

`tests/mascot.test.ts` (8 tests) for the logic that picks a pose (`mascotPose`) and the level that Volt stands on (`mascotLevel`), and for the text in `content/ui/mascot.json`. These are not one of the two required tests in PLAN.md section 4, so this PR has no red and green screenshots.

205 tests, the type check, lint and the build pass.

## Not in this PR

- The home page (feature 14). It is not built yet.
- Volt on the level Check result card.

## How to check

1. Open a level. Volt is in the task pop-up.
2. Do a task. Volt hops in the "Nice! Here is what happened" pop-up.
3. Put a wire in a wrong place. Volt shakes in the Mistake pop-up.
4. Open the level map. Volt stands on the level to play next.
5. In development, open `/p/perch/1/complete?preview`. Volt cheers next to Perch.
6. Turn on reduced motion on the device. Volt does not move.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_016Q4C9KJwpLNhw311gnrAKg
