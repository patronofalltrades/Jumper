# Prompt log: beginner guidance (feature 18, branch `Feature/Beginner`)

1. "Right now, the whole of Jumper's instruction is still using technical language that is hard for me to follow. The goal is to dumb down the content. Make it like ELI5 or ELI a goldfish. We want to explain the easiest, simple terms possible. For example "connect hole 1 to hole 5" and then after successfully connecting two holes, explain what happened"

   Claude rewrote the Perch level text and the build-mode words in very simple words. Each Place or Wire task now shows what to do first. After the learner does it, a "Nice! Here is what happened" pop-up tells what the new wire or part does.

2. "for example: I am not able to go through the first step because I don't know what a breadboard is and I don't know what to do with the board. I think we would benefit with a cue that shows areas where we have to press and interact with for example"

   Claude added a bouncing arrow on the next hole to tap, and a blinking line around a part that is already on the table. The first steps say what to look at and to press Got it.

3. "which branch is this? we can't work on a random branch, every feature needs to be documented and worked in a formal way", then "okay, I'll add that issue and make a branch, do not work on anything until I do it", then "https://github.com/patronofalltrades/Jumper/tree/Feature%2FBeginner" and "go to claude.md, readme.md, agents.md before building"

   Claude stopped and wrote the issue text. Hanif made `Feature/Beginner`. Claude read CLAUDE.md, README.md and AGENTS.md, and moved the work to this branch.
