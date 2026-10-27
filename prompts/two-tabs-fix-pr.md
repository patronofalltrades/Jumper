# PR text for issue #73 (Hanif opens the PR)

**Title:** Two tabs on one level: the second tab stops saving and shows a note

**Body:**

closes #73

As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

## What occurred

A learner opens Perch Level 2 in tab A and tab B. The learner puts 3 wires in tab A. Then the learner changes the board in tab B. Tab B writes its older board to the same browser entry (`jumper:<user>:perch/2`). After a reload, the 3 wires of tab A are gone. Each tab keeps its board in memory, and `components/build/autosave.ts` writes it to localStorage. The tab that saves last wins, and no tab listened for a save from another tab.

## How it was found

During the work on #64 ("same level open in two tabs of one user" was left out of that issue). Hanif made this issue. Claude found no bug of its own in this change; the browser check made the old error visible again (see below).

## How it was repaired

Claude chose "show the note and stop saving" (Hanif's recommendation). The tab that saves first keeps the entry. When another tab saves the same key, this tab stops: it writes nothing, sends no session counters, and shows the note. A reload opens the newest board and saves again. Loading the newer board was not chosen: it would need the progress, the base board, the sketch, the `done` flag, the session id and the sent counters of two tabs to agree. The note needs none of that.

- `lib/game/tab-save.ts` (new, pure): `isOtherTabSave(change, key)` is true when the event key is exactly this level's key and the new value is not null. A removed entry or a cleared storage is not a save.
- `lib/game/level-key.ts`: `saveKey()` builds the same browser key as before.
- `components/build/autosave.ts`: `useLevel` listens for the `storage` event; the level goes into a `taken` set; `put()` and the counter sync skip a taken level; opening the level clears it. The #62 session logic (`freshSession`, `markCompleting`, `done`) and the #64 per-user key do not change.
- `components/build/build-view.tsx` shows the note. Text in `content/ui/build.json` (`play.otherTab`): "This level is open in another tab. This tab stops saving. Reload this page to see the newest board."

No migration, no content change, no change to the saved-board format. Boards that are saved already still load.

## Testing scenarios and results

| Scenario | Result |
| --- | --- |
| Same user, same level in two tabs: tab A saves | Tab B gets the note and stops saving (unit test; browser) |
| Other tab saves another level | No note (unit test; browser) |
| Other tab saves another project | No note (unit test) |
| Other user's key | No note (unit test; browser) |
| `storage` event with a null value, or storage cleared | Not a save (unit test) |
| Key that only starts like this one (`perch/20` and `perch/2`) | Not a save (unit test) |
| Tab B changes its older board after the note | Browser save keeps the 7 parts of tab A (browser) |
| Reload after the note | No note; board of tab A is shown; saves again (browser) |
| Blocked storage (`setItem` throws) | Board works in memory, no note (browser) |
| Log out in the other tab (`reset()`, #64) | No save, so no note (browser) |

Counts: 5 new unit tests in `tests/tab-save.test.ts`; 391 tests pass in 28 files. Type check, lint and `npm run build` pass.

**Browser check.** Chromium, 1280 x 800, two pages of one user in one context, on a temporary route that rendered `BuildView` with Perch Level 2 and placeholder Supabase values (not committed). 12 of 12 checks pass. Tab A saved 3 new wires (7 parts); tab B showed the note; B's change did not change the saved 7 parts; after a reload B showed 7 parts and saved again. The same script on the old code fails 4 checks (tab B overwrote the board, a reload showed 5 parts). The wires were put in with `tapHole`, the store call that the board clicks use. The issue asks for a temporary account; Claude did not use one and did not touch the live Supabase project. Not checked: a phone size, and the Log out button itself.

## The test

**Plain-English explanation.** `tests/tab-save.test.ts` checks the one question "did another tab just save my level?". It is yes only for the same user, project and level.

**Red** (tests committed before the fix):

```
 FAIL  tests/tab-save.test.ts [ tests/tab-save.test.ts ]
Error: Cannot find package '@/lib/game/tab-save' imported from tests/tab-save.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

**Green:** `Test Files 28 passed (28), Tests 391 passed (391)`. (Hanif adds the two screenshots; the browser screenshots are in `prompts/two-tabs-fix-screens/`.)

**A real change that makes the test fail:** if `isOtherTabSave` compares only the start of the key (`key.startsWith(mine)`), a save of level 20 locks a tab on level 2, and the test "matches the whole key" fails.

## Limits

- A Check that passes in the locked tab still reaches the server; the server stays the source of truth for XP.
- Two devices at the same time, and sessions in the database, are not in this issue.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNLqkHqd8EdsC5nj2C
