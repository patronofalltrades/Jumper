# Prompt log: Restore a run (issue #214)

1. Hanif's prompt (his words, November 22): "start building feature 3"

   This is part 3 of 3 of Circuit Change Replay. Part 1 is the run records (issue #212). Part 2 is Compare with last run (issue #213).

2. What Claude did in this part:
   - `lib/game/board-store.ts`: `restoreRun` puts the board and the sketch of a run record on the bench in one step. Before that, it puts the board and the sketch of now in `restoreBackup`, also the changes that were not run. `undoRestore` puts the backup back and empties it.
   - `lib/runs/record.ts`: the browser save of the run records also keeps the backup (`readBackup`, and a `backup` argument of `writeRuns`).
   - `components/build/use-runs.ts`, `components/build/run-compare.tsx`, `components/build/sketch-panel.tsx`: "Restore this run" on each run that is not on the bench, a note that asks for a new Run, and "Undo the restore". A `snapshot_restored` event goes out on a level with a lesson file.
   - `tests/restore.test.ts`: 11 tests.

3. Choices that Claude made:
   - A restore is one step of the Undo history of the parts. Undo takes back the board only. "Undo the restore" takes back the board and the sketch.
   - There is one backup. It stays after a new Run, so the learner can test the restored board and then go back. A new restore replaces it. Another level empties it.
   - The task engine reads a restored board as it reads "Put back the level build": no Mistake and no XP.
