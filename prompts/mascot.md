# Prompt log: Jumper mascot (feature 16, issue #44)

1. "Issue 44, https://github.com/patronofalltrades/Jumper/tree/Feature%2FMascot, read all documentation before implemetation, create test units, develop, and test"

   Claude read issue #44, CLAUDE.md, AGENTS.md, PLAN.md (row 16 of "Plan vs. Reality"), the PRD, the TRD, the ledger, the beginner guidance prompt log, the build-mode pop-ups, the level map, the Level complete screen, `public/avatars/volt.svg` and `content/ui/avatars.json`. Claude worked on `Feature/Mascot`, the branch that Hanif made. No migration and no new package.

   Claude built:
   - `lib/game/mascot.ts`: `mascotPose()` (the pose next to a pop-up: happy while the "Nice! Here is what happened" pop-up shows, oops on a wrong part or wire, idle while the learner works) and `mascotLevel()` (the level that Volt stands on: the first open level, or the last level when all passed). Test first (red), then the code (green): `tests/mascot.test.ts`, 8 tests.
   - `components/art/volt.tsx`: Volt as an SVG with 4 poses (idle, happy, oops, cheer). It is the box robot of `public/avatars/volt.svg`, standing, with arms and no background. Each pose changes the eyes, the mouth and the arms. In the oops pose, the antenna light is red and a drop of sweat shows.
   - `app/globals.css`: a hop for happy, a shake for oops, and for cheer a pop-in and a hop at the same time as the Perch device. Each motion plays one time, when the pose shows. With reduced motion, Volt does not move. In dark mode, a light edge goes around Volt, so that his dark outline shows on a dark card.
   - Build mode (`components/build/popups.tsx`): Volt in the first row of the task pop-up (idle), the "Nice! Here is what happened" pop-up (happy) and the Mistake pop-up (oops). On a laptop and in the phone sheet at the bottom.
   - Level map (`app/p/[project]/page.tsx`): Volt stands at the end of the row of the current level.
   - Level complete (`components/build/level-complete.tsx`): Volt cheers next to the Perch device that wakes up.
   - Text in `content/ui/mascot.json`: the name, a screen reader text for each pose, and the map text.

   Checks: 205 tests, the type check, lint and the build pass. Browser check on a scratchpad page (Vite, the CSS from `npm run build`, server actions replaced by stubs; not in the repository): the 4 poses, the task, "what happened" and Mistake pop-ups at 390 px and 1280 px, and Level complete at 390 px and 1280 px, in light and dark mode, with no page errors. With reduced motion, the animation of each pose is `none`. The level map is a server page, so it is not checked in a browser yet.
