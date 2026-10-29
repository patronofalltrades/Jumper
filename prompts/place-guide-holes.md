# Prompt log: guide holes for the resistor and the LED (issue #101)

1. Hanif's report of the problem (his words):

   "I have a hard time with level two. I always mess up putting the LED. This is because the fact that the steps and the guides are very hard to understand, especially when putting components on the board. For example, when the prompt says to put it on board A, I don't even understand where board A is. Another example is the guides that show you where to put it, but it still produces an error. The clip shown already has wires and is not from a clean slate, which further confuses users. Can you help fix this issue? Do your due diligence and the issues we need to open, issue body and title, I will open branches with titles that you generate, and then we can work on these by spinning up Opus 5.5 agents"

2. Hanif's permission to open the issues and the pull requests (his words):

   "can we break our rules for this one and open issues and PRs automatically? Use best practices from prior branch and PR naming and commenting"

Claude's work for #101 (not Hanif's words): an engine run of Perch level 2 found that the resistor and LED tasks had no glowing holes and no tap, and pointed at A-f15, a line with pin GPIO37. Claude wrote a red test first (a learner who taps only the arrow holes), then the fix in `taskSpot`. See the ledger for the details.
