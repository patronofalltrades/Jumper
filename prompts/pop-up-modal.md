# Prompt log: Level complete pop-up (issue #20)

1. "use the morluto/rea skill to reverse engineer this pop up when someone finishes a level on duolingo. I want to use this for Jumper" (with a screenshot of the Duolingo "High scorer!" screen)

   Claude got the REA skill (`reverse-engineer-anything`) from github.com/morluto/rea. REA reads shipped programs (app files, JavaScript bundles, live browser pages), not images, so Claude broke the screen down by hand:
   - dark plain background; an animated mascot in the top 40 %;
   - a yellow title that changes with the score ("High scorer!"), and a subtitle that says the XP again in words;
   - 3 stat cards with a colored outline and a label strip that praises ("TOTAL XP", "GOOD", "QUICK"), an icon and a value in the same color;
   - a small share button and a wide press-down main button ("CLAIM XP").

   Claude mapped each part to Jumper and asked 3 questions.

2. "let's do it. what do I need to answer in order for you to develop this?"

   Claude found that no level check, session saving or snapshot saving exists yet, and asked 6 questions: scope, the Save snapshot button, the time card color, the text, the mascot, and the issue and branch. Claude wrote the issue title and body.

3. "1. Screen Only 2. Coming Soon 3. Use Existing Color 4. Continue with your suggestion 5. Perch device waking up 6. done. Issue is up and branch is here: git fetch origin / git checkout Feature/Pop-up-Modal"

   Claude worked on Hanif's branch `Feature/Pop-up-Modal` (issue #20) and built:
   - `lib/stats/level-summary.ts`: `accuracy()`, `titleTier()`, `accuracyTier()`, `formatDuration()`. Tests first (red), then the code (green): `tests/level-summary.test.ts`, 8 tests.
   - `content/ui/complete.json`: titles ("Clean build!", "Solid build!", "Level complete!"), card labels (TOTAL XP; PERFECT, GREAT or GOOD; TIME), buttons and the "coming soon" note, in ASD-STE100.
   - `components/art/perch-wake.tsx` and CSS in `app/globals.css`: the Perch device pops up, the screen lights, the eyes open, the smile draws, the status light blinks, then the device hops 2 times. With reduced motion, the device shows awake at once.
   - `components/build/level-complete.tsx`: a full-screen dialog (Radix, already in the app). XP and accuracy count up; the title and cards come in one after the other. Save snapshot shows the "coming soon" note. Continue goes to the next level, or to the lobby after the last level, and has the focus.
   - `app/p/[project]/[level]/complete/page.tsx`: shows the user's latest completed session of the level. In development only, `?preview` shows sample numbers.

   Checks: 91 tests, typecheck, lint and build pass. Chromium on Claude's scratchpad page: 390 × 844 (light and dark), 1280 × 800 (dark), reduced motion, the wake-up at 0.35 s (eyes still closed), Esc does not close it, the focus is on Continue, no console errors.
