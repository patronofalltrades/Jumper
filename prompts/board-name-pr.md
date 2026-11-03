**PR title:** Build mode: show the board of the project in the header and the intro pop-up (#134)

**Base:** `main`
**Head:** `Features/Board-name`

**PR body:**

closes #134

## What this does

In build mode, the learner now sees which microcontroller board the project uses. The line above the level title shows "Perch · ESP32-S3 · Level 2". The level intro pop-up shows the same line. The board name comes from the `board` field of `content/projects/<slug>.json`. The words of the line are in `content/ui/build.json` (`header.eyebrow`).

## Required test (house rule 3)

- Test file: `tests/build-header.test.ts` (3 tests).
- Plain-English explanation: the test checks that the header line has the project name, the board name and the level number, in that order, with the separator "·". One test reads the real Perch content file and expects "Perch · ESP32-S3 · Level 2".
- Red: the red commit `c07c1f3` has the test only. The run failed on the missing module `@/lib/game/build-header`. Red screenshot: not made (see "Not checked").
- Green: commit `27516a4`. Green run: 3 of 3 pass.
- One real change that makes the test fail: if the header used one fixed board name (ESP32-S3) for every project, the "Arduino Foundations · Arduino Uno" test fails.

## Tests run

- `npx vitest run tests/build-header.test.ts`: 3 passed.
- `npm run typecheck`: passes.
- `npm run lint`: passes.
- `npm test`: 50 files, 667 tests pass.

## Not checked

- No browser check. The live Supabase project was not used, and no dev server was run with a learner account.
- Phone (390 x 844): the line uses the existing `truncate` class, so it does not wrap. The line is not seen on a real phone screen. Hanif should check the header on a phone.
- Red and green screenshots for the house rule 3: not made.
- The level intro pop-up: the code path is the same `eyebrow` prop as the header. It was not seen in a browser.

## Questions for Hanif

1. Does "Arduino Foundations · Arduino Uno · Level 1" fit on a phone? A long line ends with "…". Should the board name be shorter on a phone?
2. Is the project name before the colon right for every project (for example "Perch")? This is the same rule as before.
3. The board comes from the content file, not from the database. Is this the right source? (Minimal choice; see `prompts/board-name.md`, item 4.)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
