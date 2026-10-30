closes #125

## User story
As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)

Changed: after a level passes and I go back to the map, I want to see my marker move to the next level and the XP count go up, so that I feel that I moved forward.

## What changed
- `lib/game/map-progress.ts` (new, pure): `animateFrom` (the stored state to animate from, or null), `parseStoredProgress` (the stored state, zod; anything else is null), `countValue` (the XP count, ease-out), `mapProgressKey` (`jumper:<user>:map/<project>`, under the saved-board prefix, so account deletion clears it).
- `tests/map-progress.test.ts` (new): 8 tests for the rule above.
- `components/build/level-path.tsx` (new, client): the level list, moved from the map page, with the same look. Before the first paint it reads the state that the map showed last time, and saves the state that it shows now. After a pass, it starts at the stored state, then moves once: the passed level gets its check mark, the path below it fills, the next level opens, the Volt marker moves, and the XP chip counts up (1.2 s). The path stays hidden until the stored state is read, so the end state of the server never shows first. The transition classes are on only the end state, so the start state shows at once. A first visit, a visit with no change, and reduced motion show the end state. `localStorage` calls are wrapped in try/catch.
- `app/p/[project]/page.tsx`: also reads `profiles.xp` (the same total as the lobby), and renders `LevelPath` with the levels and the passed positions. The level list and its nodes moved out of this file.
- `content/ui/build.json`: `map.xp` = "{n} XP" (the new XP chip).
- `prompts/pass-progress.md`, `prompts/pass-progress-pr.md`, `prompts/pass-progress-screens/`: the prompt log, this text, and the browser check screenshots (1280 x 800 mid-animation and end; 390 x 844 end).
- No new package, no migration.

## How it was tested
Plain English: the tests give the map a stored state and a server state, and check that the map animates only when the learner passed a level or gained XP since the last visit. The first visit and a visit with no change must show the end state with no animation. The XP count must go from the stored value to the new one and end exactly on it.

- Red (`9f6bc22`): `vitest run tests/map-progress.test.ts`: the file failed to load, because `lib/game/map-progress.ts` did not exist yet. Result: `Test Files 1 failed (1)`, `Tests no tests`.
- Green (`78e2371`): `vitest run tests/map-progress.test.ts`: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- Full suite on the branch (`a0f191e`): `npm test`: `Test Files 47 passed (47)`, `Tests 637 passed (637)`.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only: a temporary public route (`/s/mapdemo`, removed before the commit) with placeholder Supabase values and sample levels, in Chromium with Playwright. Stored state 1 level and 40 XP, server state 2 levels and 80 XP: the start state paints at 40 XP with level 2 open; the check mark and the path fill grow over about 500 ms; the marker moves to level 3; XP reaches 80 at about 1.3 s. A second load with the same state: 80 XP at once, no animation. A first visit: no animation. Reduced motion: 80 XP at once. No page errors. Screenshots: `prompts/pass-progress-screens/`.
- Two bugs found by this browser check, fixed before the commit: (a) the end state showed for a moment before the page loaded, then jumped back to the stored state; (b) the check mark and the path fill began at their end values, so the start state never showed. Both are fixed in `a0f191e`.
- A real change that makes the test fail: in `animateFrom`, return the server state instead of the stored state, and then 2 tests fail (`animates from the stored state when a level passed`, `... when only the XP went up`), 6 pass.

## Choices for Hanif
1. The map now shows the XP total as a chip above the path. The map had no XP number before, and the issue asks for one. Keep it, or put it somewhere else?
2. The stored state is per user and per project (the key has your user id), not per project alone. Two accounts on one browser do not see each other's animation. Keep it?
3. The state is saved when the map opens, not when the animation ends. If the learner leaves the map during the animation, it does not play again. Keep it?
4. "Level complete" → "Continue" opens the next level page, not the map. The animation plays on the next visit to the map. Should Continue on the last screen of a pass go to the map, so the animation plays at once?
5. The Volt marker hops in on the new level. It does not slide along the path. Keep it?
6. A learner who passed a level before this feature has no stored state, so the first visit shows the end state with no animation. This is as the issue asks. OK?

## Not checked
- The live app and the real data path of the map page (the Supabase queries, with a real log-in). The browser check used sample data on a temporary route, as the rules say.
- The live Vercel app after the merge.
- A real phone (touch, a slow network). Dark mode. Safari and Firefox.
- The short blank list on a slow network: the path is hidden until the page script runs, so a learner on a slow connection sees an empty space for that time.
- The terminal output of the red and green runs is pasted above, not as screenshots.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnPDBQN1o5sd2HXwFfR
