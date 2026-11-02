Show a short description of each part and tool (#136)

closes #136

## User story
As a learner, I want to drop multi-pin modules (button, mic, amplifier, screen) onto the board, so that I can build the full device. (PLAN.md row 4)

## What changed (plain English)
- When the learner picks a tool or a part from the tray, a short line under the tray row says what it is and what it does. On a laptop, the same text shows as the hover title of the button. On a phone, the line takes two lines of text, and it does not cover the board.
- The text is in `content/ui/build.json` under `about`. Each entry is one or two short sentences. The part models match `content/parts/*.json` and the terms in `content/terms/*.json` (for example: "INMP441: a digital microphone. It sends sound to the board on 3 wires (I²S).").
- `components/build/build-view.tsx`: a `ABOUT` lookup, one `<p>` line under the tray row, a `title` on the tool buttons and the tray chips, and an optional `about` prop on `ToolButton`.
- `tests/part-descriptions.test.ts` (new): red first, then green. It checks that each tool and each tray part has a description, and that each description is at most 180 characters.
- `PLAN.md`: row 46 added at the end of "Plan vs. Reality". No other line changed.
- `ledger/LEDGER.md`: one timeline row. `prompts/part-descriptions.md`: prompt log.

## Commits
- `0d612bb` Add red test for part descriptions (issue #136)
- `4761d55` Show a short description of each part and tool (issue #136)
- Docs commit: prompt logs, PLAN row 46, ledger row.

## How it was tested
- What the test checks, in plain words: every tool that the learner can pick (wire, resistor, LED, remove) and every part in the parts tray (button, mic, amp, speaker, screen) has a short text that says what it is. The test fails if a text is missing or empty, or if it is too long to read in one glance.
- Red (`0d612bb`): `npx vitest run tests/part-descriptions.test.ts`: 2 of 3 tests failed ("pushbutton: expected undefined to be truthy").
- Green (`4761d55`): the same file: 3 passed. Full suite `npm test`: 50 files, 667 tests passed.
- `npm run typecheck`: exit 0. `npm run lint`: exit 0.
- A real change that makes the test fail: if someone removes the `inmp441` entry from `about`, the "tray part" test fails with "inmp441: expected undefined to be truthy".

## Not checked
- The red and green screenshots that the assignment rules ask for: not taken yet. The test is a Vitest unit test. Hanif or the next step must add the screenshots if the rule applies to this test.
- A browser check at 1280 x 800 and at 390 x 844 (the new line and the two-line text on a phone): not done in this session. The layout must be seen before merge.
- The hover title on a laptop: not seen in a browser.
- The live app: not used. No change to the Supabase project.

## Questions for Hanif
1. "Remove" has a short line too ("Takes a part or a wire off the board. Click or tap it."). The test asks for every tool except "parts", so I added one. Keep it, or remove the line and the test entry?
2. The line under the tray row always takes space (fixed height), so the board does not move when the tool changes. On a phone it takes two lines. Is that the right trade-off, or should it be one line that truncates?
3. Wire: the line appears for the wire too, next to the wire colors. Keep it?
4. The text is my first draft in ASD-STE100. Please check the model names and the wording (for example "a 1.54-inch screen with 240 × 240 tiny dots").

🤖 Generated with [Claude Code](https://claude.com/claude-code)
