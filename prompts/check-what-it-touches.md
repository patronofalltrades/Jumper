# Prompt log: Check says where the wrong wire goes now (issue #89)

1. Hanif, about the Perch level check (before this session):

   "the gripe that I have with the perch level is that it is pretty hard to see what I did wrong and try to understand how to fix it. ... when I finish a level and check, it says, 'Oh, something is wrong,' and then I don't really know how to fix it. The video is not really helpful because it does not indicate how to solve the problem."

2. Hanif, to plan the work:

   "Let's work on a session to fix this by spinning up four different sessions for 1-4"

3. Hanif, to open the sessions:

   "opened them: ... Read the documentation before working. Check respective branches. Work on four different sessions. Use Haiku 5.5"

   This session is session 1: issue #89, branch `feature/check-what-it-touches`. Sessions 2 to 4 work on #90 (marks on the 3D board and "Show me"), #91 ("Redo this step") and #92 (a live list of all problems).

Claude read CLAUDE.md, PLAN.md, docs/PRD.md, docs/TRD.md, README.md and issue #89. Issue #89 is the scope: a pure function in `lib/circuit` that says what the learner's wire end connects to now, and the text of the fail card for `wrong_pin` and `missing_ground`, with "From level N:" for a connection of an earlier level.
