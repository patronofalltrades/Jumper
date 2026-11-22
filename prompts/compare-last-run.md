# Prompt log: Compare with last run (issue #213)

1. Hanif's prompt (his words, November 22): "start building feature 3"

   This is part 2 of 3 of Circuit Change Replay. Part 1 is the run records (issue #212). Part 3 is Restore a run (issue #214).

2. What Claude did in this part:
   - `lib/runs/diff.ts`: `diffLines` gives the lines of the sketch that were removed and added, with their numbers. `runTerminals` gives the named points of a board (the pins of the main board, the open rails and the pins of the parts). `diffRuns` gives what changed between two runs: connections that were added, removed or moved, parts that were added or removed, and the lines of the sketch.
   - `components/build/run-compare.tsx`: the panel. It shows the two latest runs with their labels, times and results, and each change in text. A moved connection has the buttons "Show the old end" and "Show the new end". The panel says that each change is a possible cause, and it does not name one cause.
   - `components/build/sketch-panel.tsx`: the "Compare with last run" button, after the first run. With one run, the panel says that another run is necessary. A `snapshot_compared` event goes out on a level with a lesson file.
   - `content/ui/runs.json`: the text.
   - `tests/run-diff.test.ts`: 11 tests.

3. A choice that Claude made: the comparison uses the pins and the rails of the board and the pins of the parts as its named points, not the map of a lesson file. Thus it works on each level that has a code step, also a level with no lesson file.
