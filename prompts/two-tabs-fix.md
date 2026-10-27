# Prompt log: the same level open in two tabs (issue #73)

1. Task from Hanif for issue #73 on `Bug/TwoLabsFix` (the "two tabs" fix): read the docs and the build-mode code; write the test scenarios first; commit the red tests, then the fix; do a browser check with two tabs; write the PR text. Do not open the PR.

## Choice

Claude picks "show the note and stop saving" (Hanif's recommendation). Loading the newer board would need a merge with the engine progress, the session counters and the session id of this tab. The note needs none of that.

The tab that saves first keeps the browser entry. A tab that gets a `storage` event for its own key shows the note and stops writing until a reload. A reload reads the newer board.

## Test scenarios (Given / When / Then)

Pure function: `isOtherTabSave(event, key)` in `lib/game/tab-save.ts`. A `storage` event fires only in the other tabs, never in the tab that wrote.

| # | Given | When | Then |
| --- | --- | --- | --- |
| 1 | User `u` has Perch level 2 open in tab A and tab B | Tab A saves `jumper:u:perch/2` | Tab B: other-tab save is true. B shows the note and stops saving |
| 2 | Same | Tab A saves another level, `jumper:u:perch/3` | Tab B: false. Nothing changes |
| 3 | Same | Tab A saves the same level of another project, `jumper:u:arduino-foundations/2` | Tab B: false |
| 4 | Same | A key of another user, `jumper:v:perch/2`, changes | Tab B: false |
| 5 | Same | The entry is removed (`newValue` is null) or the storage is cleared (`key` is null) | Tab B: false. There is no newer board to protect, and Tab B keeps saving |
| 6 | Tab B shows the note | The learner reloads Tab B | The level opens again, reads the board of Tab A, and saves again. (Browser check; the `useLevel` effect starts with no lock) |
| 7 | Private mode or blocked storage | A save fails | No `storage` event, no lock, the board still works in memory (as before). (Browser: same as before the fix) |
| 8 | Tab A presses Log out (issue #64 reset) | `reset()` empties the store | The store makes no save, so Tab B gets no event and no note. (Browser check) |
| 9 | A key that only contains the key of this level (`jumper:u:perch/20` against `jumper:u:perch/2`) | Event | False. The match is exact |
| 10 | An event for the same key with the same value as before | Event | Treated as a save (the tab does not compare values; a browser sends no event if the value did not change) |

Scenarios 1 to 5, 9 and 10 are Vitest tests (`tests/tab-save.test.ts`). 6, 7 and 8 are checked in the browser.
