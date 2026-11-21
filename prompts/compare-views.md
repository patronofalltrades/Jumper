# Prompt log: Compare views (issue #202)

1. Hanif's prompt (his words, November 21): "Can you check these two main features I am completing for my class tomorrow? Deadline is at 6AM and I need you to finish developing these two features accordingly and push to the repo, then merge them"

   The two features are Same Circuit, Three Worlds (this issue) and Predict, Build, Explain (issue #203). The scope of this issue is work package 4 of `docs/PLAN-learning-journey.md` and section 6.5 of `docs/TRD-learning-journey.md`.

2. Claude told Hanif before the build: the real photos and the fault clip do not exist, so the comparison screen ships with the schematic and the 3D board. The photo view, the fault clip and the transfer question show when the media is in the lesson file. No placeholder photos (assignment rule 7).

3. Hanif's extra request during the build (through the coordinator session): take "before" screenshots from `main` and "after" screenshots of the same screens and of the new states, and make a GIF of the browser check.

4. What Claude built:
   - A "Compare views" button in build mode of Arduino Foundations level 2 (a level with a lesson file).
   - A panel beside the 3D board (a bottom sheet with three tabs on a phone) with a schematic of the LED circuit, a list of the points and connections, and the difference between the learner's board and the reference.
   - One selection in each view: schematic, list and 3D board. The keyboard can do each selection.
   - The photo view, the fault clip with captions, and the question card with its records. They read the optional `media` and `questions` fields of the lesson file, which are empty now.
   - Pure logic in `lib/journey/` with Vitest tests in `tests/compare-views.test.ts`. Text in `content/ui/journey.json`.

5. Browser check: Supabase is not available in the build container, so Claude used a local route that was not committed. It showed build mode of level 2 with the finished board and no log-in. Playwright did 26 checks on it (laptop and phone), and all passed. The first run found three defects, and Claude repaired them: a point selected from the list changed to its connection, the panel covered the breadboard, and the schematic used color names that the app does not have (no lines showed).
