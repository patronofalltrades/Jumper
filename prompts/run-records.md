# Prompt log: Run records (issue #212)

1. Hanif's prompt (his words, November 22): "start building feature 3"

   Feature 3 is Circuit Change Replay, from the product requirements of November 20. Claude made three issues, one for each part: run records (#212), Compare with last run (#213) and Restore a run (#214). Each part has its branch and its pull request.

2. What Claude did in this part:
   - `lib/runs/record.ts`: `captureRun` makes a record of the board, the sketch and the result at a press of Run. The result comes from the board and the sketch of the record. `keepLatest` keeps three records. `isStale` tells when the board or the sketch is different from a record. `readRuns` and `writeRuns` keep the records in the browser.
   - `lib/sketch/run.ts`: the constant `RUNTIME` ("sketch-1"), which each record keeps.
   - `components/build/use-runs.ts` and `components/build/sketch-panel.tsx`: Run makes the record first, and the result in the panel comes from the record. The LED animation follows the board, as before. The panel shows "Changed since this run" when the board or the sketch is different from the record. A `run_completed` event goes out on a level with a lesson file.
   - `content/ui/runs.json`: the text.
   - `tests/run-record.test.ts`: 14 tests.
