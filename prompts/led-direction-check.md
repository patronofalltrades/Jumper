# Prompt log: LED direction check (issue #102)

1. Hanif's report about level 2 (his words):

   "I have a hard time with level two. I always mess up putting the LED. This is because the fact that the steps and the guides are very hard to understand, especially when putting components on the board. For example, when the prompt says to put it on board A, I don't even understand where board A is. Another example is the guides that show you where to put it, but it still produces an error. The clip shown already has wires and is not from a clean slate, which further confuses users. Can you help fix this issue? Do your due diligence and the issues we need to open, issue body and title, I will open branches with titles that you generate, and then we can work on these by spinning up Opus 5.5 agents"

2. Hanif's permission for this batch (his words):

   "can we break our rules for this one and open issues and PRs automatically? Use best practices from prior branch and PR naming and commenting"

Claude's work for #102 (not Hanif's words): an engine run in Vitest of Perch level 2 found that the LED place task accepts the LED in any direction, and that the error shows 3 tasks later. Red tests first (`tests/led-direction.test.ts`), then the check in `lib/game/engine.ts`, the `led_shorted` rule and the texts in `content/`, and a − badge on the 3D LED. See the ledger for the details.

3. Hanif's answers to the questions on PR #108 (his words):

   "1. OK
   2. OK
   3. OK
   4. It should explain what a short leg is and where to put it"

Claude's change for answer 4 (not Hanif's words): the `reversed_led` text explains the short leg and where it goes.
