# Prompt log: Check fails a part on a board pin that the level does not use (issue #104)

1. Hanif's reason for the batch of issues #100 to #104 (his words):

   "I have a hard time with level two. I always mess up putting the LED. This is because the fact that the steps and the guides are very hard to understand, especially when putting components on the board. For example, when the prompt says to put it on board A, I don't even understand where board A is. Another example is the guides that show you where to put it, but it still produces an error. The clip shown already has wires and is not from a clean slate, which further confuses users. Can you help fix this issue? Do your due diligence and the issues we need to open, issue body and title, I will open branches with titles that you generate, and then we can work on these by spinning up Opus 5.5 agents"

2. Hanif's instruction for the GitHub steps (his words):

   "can we break our rules for this one and open issues and PRs automatically? Use best practices from prior branch and PR naming and commenting"

Claude's investigation (not Hanif's words): an engine run in Vitest of Perch level 2 found the facts written in the issues (#100 to #104). For #104: a board with the resistor and the LED in the lines of GPIO37, GPIO35 and GPIO0 passed the Check. Claude's work for #104: a red test first, then a `stray_pin` reason in `checkLevel`. See the ledger for the details.

3. Hanif's answer comment on PR #106, to the "Questions for Hanif" (his words):

   > 1. Yes
   > 2 Yes, but make it simple and easy to understand
   > 3. Yes
   > 4. Yes

Claude's change (not Hanif's words): the fail card and the connection list row now name only the part, in plain lower-case words, and the pin ("The resistor touches GPIO 37 on the board …", "The resistor must not touch GPIO 37"). Answers 1, 3 and 4 needed no change.
