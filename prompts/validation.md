# Prompt log: Validation (feature 7, issue #27)

1. "Work on this Feature Branch: https://github.com/patronofalltrades/Jumper/tree/Feature%2FValidation Read claude.md, readme.md, schema.md, and PLAN.md before touching anything"

   Claude read the 4 docs and the snapshot and level Check code. Claude found that the save form had no level field, and that the Check button showed only when all tasks were done. Claude asked 3 questions and the issue number.

2. "Isssue 27", then the answers:
   - Level: "Former option". The save form gets a level select that the learner must fill in, with its own message.
   - Empty board: "former". An explicit guard turns Check off when the learner placed no part, with a friendly note and a unit test.
   - Messages: "Yes". A message under each field, with the text in `content/ui/snapshots.json`, also in the edit form.

   Claude built:
   - `lib/snapshots/form.ts`: one Zod schema for the Save form (level, title, notes) and one for the edit form (title, notes). The messages come from `content/ui/snapshots.json`. `fieldErrors()` gives the first message for each wrong field. The forms and the server action use the same schemas. 9 tests in `tests/snapshot-form.test.ts`.
   - Save snapshot: a level select (empty at the start), and a message under each wrong field. The fields keep their values after a refused Save.
   - Edit snapshot: the same messages for the title and the notes.
   - `lib/circuit/check.ts`: `placedParts()` and `isEmptyBoard()`, pure, with 9 tests (one for each Perch level, so that Check can always turn on). The board store keeps the board that the level opened with (`base`), and the browser saves it. The Check button is off on an empty board, with the note from `content/ui/build.json`. 1 store test.

   Checks: 159 tests, typecheck, lint and build pass. Browser check of both forms on a scratchpad page.
