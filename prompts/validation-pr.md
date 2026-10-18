# PR text for issue #27 (Hanif opens the PR)

**Title:** Validation: friendly form messages and no Check on an empty board

**Body:**

closes #27

As a learner, if I save a snapshot without a title or step, I want a friendly message telling me what's missing. I also can't press Check on an empty board.

## What changed

- **One Zod schema for the snapshot forms** (`lib/snapshots/form.ts`). The browser checks the form with it before it sends anything, and the server action checks the same input again with the same schema. Thus the learner gets the same message in the two places.
- **Save snapshot** has a **Level** select. It starts empty, so the learner must select a level. A message shows under each field that is missing or not correct:
  - no level: "Select the level of this board."
  - empty title (or only spaces): "Write a title. For example: Ears wired."
  - title longer than 80 characters: "The title is too long. Use 80 characters or fewer."
  - notes longer than 2000 characters: "The notes are too long. Use 2000 characters or fewer."
- The field with a problem gets a red border. The message is linked to the field for screen readers (`aria-invalid`, `aria-describedby`). A change to a field removes its message. After a refused Save, the fields keep what the learner wrote.
- **Edit snapshot** (on the snapshot page) shows the same messages for the title and the notes.
- **Check on an empty board:** the Check button is off when the learner placed no part in this level, with the note "Place a part on the board first. Check tests the parts that you place." The board store keeps the board that the level opened with, so a ready-made board from earlier levels does not count as "placed".
- All the text is in `content/ui/snapshots.json` and `content/ui/build.json`, in ASD-STE100.
- No new packages. No database change.

## Decisions (Hanif)

- The save form gets a level select that the learner must fill in, with its own message.
- An explicit guard turns Check off on an empty board, with a friendly note and a unit test.
- A message under each field, also in the edit form.

## Bug found during the work

- **What occurred:** after a Save that the form refused (for example, a title that was too long), the form became empty. The learner lost the title, the notes and the selected level.
- **How it was found:** Claude's browser check. The next Save showed "Select the level of this board." again and sent nothing.
- **Repair:** the forms used a React form `action`, and React 19 clears a form after its action. Both snapshot forms now use `onSubmit`, so the fields keep their values. The browser check then passed.

## Tests

- `tests/snapshot-form.test.ts` (9 new): a correct form passes; an empty title, a title of only spaces, a title of 81 characters, notes of 2001 characters and no level each give their message; 80 characters and 2000 characters pass; three wrong fields give three messages; the edit form does not ask for a level; an empty level select gives no level.
- `tests/check.test.ts` (9 new): the finished board of each of the 5 Perch levels has placed parts, so Check can turn on; a board with no placed part is empty; one new wire makes it not empty; a moved part counts as placed; removing a ready-made part does not count as placing a part.
- `tests/board-store.test.ts` (1 new): the store keeps the board that the level opened with.

## Checks

- `npm test`: 159 tests pass (19 new).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Browser check (Chromium, 420 px) on a scratchpad page with the real form components and stubbed server actions: empty Save, too-long title and notes, correct Save (the level, title and notes are sent), empty title in the edit form.
- Real routes (Chromium, 1280 px): `next start` on the real Supabase project, with a temporary test account. Hanif allowed it, and the account was deleted after the test (its profile, sessions, attempts and snapshots went with it). Results:
  - Log-in form → lobby.
  - Level 1 with all tasks done and no part placed: the Check button is off, with the note.
  - One wire placed: Check is on and fails with "3V3 (3.3 V power) does not connect to power rail (+)…" (attempt `wrong_pin`). "Fix the board" shows the Check button on the board.
  - The wire removed with the Remove tool: the Check button on the board goes off, with the note.
  - The finished Level 1 board: Check passes and Level complete opens.
  - Save snapshot from Level complete: an empty Save shows the level and title messages; a too-long title shows its message and the selected level stays; a correct Save adds the snapshot (`passed = true`).
  - Edit on the snapshot page: a title of only spaces shows the message; a correct title saves.
  - No page errors.
- The real-route check found one visual problem: the Check button on the board was see-through when off, because it used opacity. It now has a solid grey look.
- Not checked: the server action with wrong input sent around the form (the browser stops the request first). The unit tests cover the same schema.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DXFtA3smhH65eWL9D4kSES
