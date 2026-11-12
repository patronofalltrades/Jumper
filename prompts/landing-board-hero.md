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

6. Hanif's prompt (his words): "This does not look good. Can you re-do the apperance to be more like the example that I showed you earlier. I think like I want to have it like simpler, and also I want to have it more premium while also retaining the overall theme, which we already have implemented on the homepage."

   Hanif's correction: the first hero (the board in a glass panel on the left, a glass card with the text on the right) did not look good. He wants a simpler and more premium look, with the same theme.

   Claude notes: Claude still could not open the Mobbin page, so the new look comes from Hanif's words, not from the reference.

   Claude's steps

   - `app/page.tsx`: the hero has no glass panels. The headline is in the center and is larger. A small green line of text replaces the green badge. The two path buttons are one line of text each, side by side. The board is below them, with no frame, on the night background with a green glow.
   - The "I already have an account" link is not in the hero. The navigation has "Log in", and the end of the page has the link.
   - `components/landing/landing-board.tsx`: no "Tap the board to start" label. The still picture has a clear background.
   - Checks: `npm run typecheck`, `npx eslint app components/landing` and `npm test` (65 files, 865 tests) pass. Screenshots from the dev server at 1440 px and 390 px.

7. Hanif's prompt (his words): "https://money.x.com/en Oh, so that's why you did not do as I said. I have actually pasted the reference webpage from Mobin. You can see the link in this prompt. Go through it, look into the components and also the overall layout, and make a very specific focus on the animation that happens on the hero image. Use that as inspiration for the current jumper website homepage / landing page without actually making any changes to the themes, to the fonts, etc."

   Hanif's correction: the reference is the page money.x.com. The hero must follow its layout and its animation. The theme and the fonts of Jumper do not change.

   What Claude saw on the reference (in Chromium, frame by frame)

   - The hero is one screen: a short headline in the center (its words come in one after the other), one small 3D object in the middle, then a small line of text and one small button.
   - The object shows itself one time, in about 4 seconds: a closed box turns, opens, and shows the card. The text and the button below come in only after that. Then a 3D canvas takes the place of the video.
   - The rest of the page: a small label and a heading in two tones for each section, thin lines between the sections, grey tiles with small pictures, features with numbers 01 to 06, a list of questions, and a footer with a very large name. These are for issue #172.

   Claude's steps

   - `app/page.tsx`: the hero is one screen. The headline is shorter in size, and each word comes in with the `rise-in` animation that the app already has. The board is in the middle, smaller. The text and the two buttons come in after the board is finished.
   - `components/landing/landing-board.tsx`: the board comes in (fade and scale), its parts go in one time at 90 ms each, and the timer stops. With a mouse, the board turns up to 5 degrees to follow the pointer (`framer-motion`). With reduced motion, the board is finished and nothing moves.
   - `lib/game/landing.ts`: `REVEAL_TICK_MS` and `revealMs`, with a test in `tests/landing.test.ts`.
   - The still picture is gone: a finished board before an empty board does not agree with the reveal.
   - Checks: `npm run typecheck`, `npx eslint app components/landing lib/game/landing.ts` and `npm test` pass. A sheet of 9 screenshots from the dev server shows the sequence.

8. Hanif's prompt (his words): "tie the buttons to the end of the wiring"

   Hanif's decision: the text and the two buttons of the hero come in when the last part is on the board, not on a timer.

   Claude notes: Hanif saw a recording in which the buttons showed before the board was finished. The cause: the buttons used a CSS timer from the page load, and the board starts only after the 3D code loads.

   Claude's steps

   - `components/landing/landing-board.tsx`: new `HeroReveal`. The board tells it when the last part is in, and then the text and the buttons come in. With reduced motion, or with the recorded clip, they show at once.
   - If the board does not finish, they show 5 seconds after the time that the board needs.
   - With no JavaScript, a `<noscript>` rule in `app/page.tsx` shows them, and the links work.
   - Checks in Chromium on the dev server: the buttons show after the last part; with reduced motion they show at once; with JavaScript off they show and a click on the first button opens `/start`.

