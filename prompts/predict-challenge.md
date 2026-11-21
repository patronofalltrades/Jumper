# Prompt log: Predict, Build, Explain (issue #203)

1. Hanif's prompt (his words, November 21): "Can you check these two main features I am completing for my class tomorrow? Deadline is at 6AM and I need you to finish developing these two features accordingly and push to the repo, then merge them"

   The two features are Compare views (issue #202) and Predict, Build, Explain (issue #203). This file is for issue #203. A second Claude session built issue #202 at the same time.

2. The task of this session came from the planning session as a task text, not as a message that Hanif typed here: build issue #203 and TRD addendum section 6.4, with no new dependency; put the text in `content/`; keep the pure logic in `lib/` with Vitest tests; save the records with the actions of PR #193, and let a failed save never stop the learner; no hearts and no XP change (decision D6); check the flow in a real browser with a local harness that is not committed.

3. Hanif's later request (through the planning session): before and after screenshots, and a GIF of the browser check.

4. What Claude built:
   - 3 challenges in `content/lessons/af-led.json` (open loop, LED polarity, series order), each with a variation in a different layout. The text of the panel is in `content/ui/challenge.json`.
   - `lib/challenge/machine.ts` (state machine and grades) and `lib/challenge/run.ts` (one run), with `tests/challenge.test.ts`.
   - A sandbox in the board store (`startChallenge`, `endChallenge`): the learner's level is put away and comes back.
   - `components/challenge/challenge.tsx`: the Challenge button and its panel.
   - `saveReflection` in `app/actions/journey.ts`.

5. Decisions that Claude made (Hanif did not decide these):
   - A challenge uses the reference circuit in a sandbox, and not the learner's own board. Reason: the learner's board, mistakes, hearts and progress then cannot change.
   - The level panels (task list, connection list, Check) hide in a challenge.
   - The answers and the explanations are a draft. A lecturer must review them (item R1 of the plan).
