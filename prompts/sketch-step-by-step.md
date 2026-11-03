# Prompt log: Step by step mode for the sketch (issue #144)

1. Hanif's words and decisions, from the planning session of Nov 3, 2026 (given to Claude in the task for this branch):

   Learners find the sketch levels hard without C++. The work must be about learning to code, not a magic experience. Three features: #143 code glossary, #144 Step by step mode, #145 "Write it for me".

   For #144: Jumper shows the goal of one line in simple words (for example "Turn the LED off."), the learner types the line, Jumper checks it and opens the next line. Jumper does not show the code first. Step by step gives the full code XP.

   For #145: a sketch that the learner writes (Free or Step by step) gives +20 code XP; "Write it for me" gives 0. #145 adds that XP, not #144.

2. Hanif's answers to Claude's four questions (dialog choices, Nov 3):

   - Line check: "Spaces + own names (Recommended)"
   - Switch back to Free in the middle: "Yes, keep lines (Recommended)"
   - Frame lines (`void setup() {`, `}`): "Type every line (Recommended)"
   - A learner who cannot get a line right: "Message + hint (Recommended)"

Claude's work for #144 (not Hanif's words):

- Red first: `tests/sketch-steps.test.ts` failed because `lib/sketch/steps` did not exist ("Cannot find package '@/lib/sketch/steps'").
- Green: `lib/sketch/steps.ts` (`checkLine`, `stepSketch`), the `steps` of levels 2, 3 and 4 in `content/sketches/arduino-foundations.json`, the text in `content/ui/sketch.json` (`steps`), the Free / Step by step switch and the step card in `components/build/sketch-panel.tsx`, and a read-only mode in `components/build/code-editor.tsx`. 17 of 17 new tests pass; 714 of 714 Vitest tests pass.
- Browser check on a temporary page (deleted): screenshots in `prompts/sketch-step-by-step-screens/`.
