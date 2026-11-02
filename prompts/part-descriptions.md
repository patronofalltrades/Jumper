# Prompt log: Part and tool descriptions (issue #136)

1. Hanif's words, from the brief for this batch:

   "build 3, 5 and 6, write the issue text. Open Issues for each stories"

   "branches are created, start the agents"

   Issue C (Build mode: a short description of each part and tool) comes from the pilot feedback of Nov 2, 2026 (request 6): "Add component information to the library: what each component is and what it does."

Claude's work for #136 (not Hanif's words):

- Red first: `tests/part-descriptions.test.ts` checks that each tool (wire, resistor, LED, remove) and each tray part (button, mic, amp, speaker, screen) has a description of at most 180 characters. Run: 2 of 3 tests failed (commit `0d612bb`).
- Green: the text is in `content/ui/build.json` under `about`. The UI shows the description of the picked tool in one line under the tray row (two lines on a phone), and as the hover title of each tool and tray button (commit `4761d55`).
- Choices are listed in `prompts/part-descriptions-pr.md` under "Questions for Hanif".
