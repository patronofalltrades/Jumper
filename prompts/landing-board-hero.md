# Prompt log: the 3D breadboard is the hero of the home page (issue #171)

1. Hanif's prompt (his words): "Scope total improvements for the landing page of this website. Use https://mobbin.com/sites/x-money-a5fa98d1-384d-47fa-8e56-1dc7e536a6a4/1d6cae10-9bfe-4fd5-bff7-36805ba23de0/preview as reference. make the bread board the main start of the landing page"

   Claude notes: Claude could not open the Mobbin page (HTTP 403), so the scope came from the code. Claude found that the self-wiring board of issue #46 was deleted in issue #152, and that `lib/game/landing.ts` and its tests were still in the repository, not in use. Claude gave a scope in three parts and asked five questions.

2. Hanif's prompt (his words): "1. passive 2. Move to projects 3. Keep lower 4. Keep both 5. Yes do three"

   Hanif's decisions

   - The hero board is passive: it wires itself, and a click opens `/start`.
   - The mascots move to the Projects section (issue #172).
   - The task-card track stays, lower on the page.
   - The two path buttons stay in the hero.
   - Three pull requests: board hero (#171), sections (#172), scroll-driven build (#173).

3. Hanif's prompt (his words): "allow everything"

   Claude notes: Claude read this as "do all the steps that Claude offered": open the issues, create the branch and build issue #171.

4. Claude's steps

   - `components/landing/landing-board.tsx`: the 3D bench of Perch on `BuildScene`, with its own board store. `landingParts` adds one part each 700 ms. A link covers the board and opens `/start`.
   - Reduced motion: the finished board. A slow device or no WebGL: the recorded intro clip. Until three.js loads: the still picture `public/landing/board.webp`.
   - `app/page.tsx`: the board is in the hero, in a wider column. The mascot band is not on the page until issue #172.
   - `content/ui/landing.json`: the `board` text, project and still picture.
   - `tests/landing.test.ts`: the project of the hero board is in the catalog, and the still picture is in `public/`.
   - `PLAN.md` row 65, `docs/PRD.md` and `docs/TRD.md` 12.1.
   - Checks: `npm run typecheck`, `npx eslint app components/landing` and `npm test` (65 files, 865 tests) pass. On the dev server, in Chromium: the canvas shows on a laptop screen (1440 px) and a phone screen (390 px), with and without reduced motion.

5. Decisions made by Claude (minimal choices)

   - The layout keeps two columns on a laptop: the board on the left (wider than before), the text and buttons on the right. On a phone the board is first.
   - The still picture is a screenshot of the finished 3D board from the dev server.
   - The camera of `BuildScene` is not changed. On a laptop, the two front corners of the breadboard go a small distance out of the panel.
