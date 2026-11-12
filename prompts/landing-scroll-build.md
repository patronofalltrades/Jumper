# Prompt log: the scroll builds the hero board (issue #173)

1. Hanif's prompt (his words): "5. Yes do three" (his answer to the scope of the landing page: three pull requests, and the third is the scroll-driven build)

2. Hanif's prompt (his words): "merge it once CI is green and start issue 173"

   Claude notes: Claude read the CI result of pull request #176 (3 checks, all passed) and merged it. Then Claude made the branch `feature/landing-scroll-build` from `main`.

   Claude notes: the issue was written before the hero changed. Now the visitor makes the first wire (issue #171), so the scroll build starts after that wire.

3. Claude's steps

   - `lib/game/landing.ts`: `scrollCount` (the number of parts at a scroll position) and `levelAt` (the level of the last part). Tests in `tests/landing.test.ts`.
   - `components/landing/landing-board.tsx`: new `HeroRunway`. The hero stays in its place for 150% of the screen height while the visitor scrolls. After the first wire, the board shows the parts of level 1. The scroll puts the parts of levels 2 to 5 on the board, and takes them away on a scroll up. The hint names the level. In the last 20% of the scroll, the board is finished and the screen of Perch shows the face (the alive store of build mode).
   - A visitor who scrolls and makes no wire: the board makes the wire, and the scroll builds.
   - No pin with reduced motion, or on a screen less than 700 px high: the board shows all its parts after the first wire, as before.
   - `app/page.tsx`: the hero is in `HeroRunway`, and the board gets the names and the sizes of the levels.
   - `content/ui/landing.json`: the level line and three hints.
   - `PLAN.md` row 67 and `docs/PRD.md`.

4. A bug that Claude made in pull request #176 and found here

   - What occurred: the 3D mascot scene in the Projects section drew frames all the time, also out of the screen. In the test browser, the hero board became very slow: 3 parts took 10 seconds.
   - How Claude found it: the scroll test timed out, and a log showed the slow build.
   - The repair: `components/mascots-3d/stage.tsx` has a `paused` property, and `components/landing/mascot-band.tsx` pauses the scene while it is out of the screen.

5. Two bugs that Claude made in this branch and repaired before the push

   - The board started with all its parts, because the scroll position was not known at the first render. Now the count comes from the scroll position at each render.
   - Perch came alive only at the last pixel of the scroll. Now the last part goes in at 80% of the scroll.

6. Checks

   - `npm run typecheck`, `npx eslint app components lib/game/landing.ts tests/landing.test.ts`, `npm test` and `next build` pass.
   - In Chromium on the dev server (1280 x 800): the hero stays in its place; the hint shows Level 2, 4 and 5 and then "Perch is alive"; a scroll up goes back to Level 2; a scroll with no wire builds; reduced motion has no pin; the mascots show in the Projects section.
   - Not checked: a real phone, and a real GPU.
