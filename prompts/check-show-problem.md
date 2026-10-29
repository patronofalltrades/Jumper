# Prompt log: Check keeps the problem on the board, and "Show me" (issue #90)

1. Hanif's gripe, from the session that opened issue #90:

   "the gripe that I have with the perch level is that it is pretty hard to see what I did wrong and try to understand how to fix it. ... when I finish a level and check, it says, 'Oh, something is wrong,' and then I don't really know how to fix it. The video is not really helpful because it does not indicate how to solve the problem."

2. "Let's work on a session to fix this by spinning up four different sessions for 1-4"

3. "opened them: ... Read the documentation before working. Check respective branches. Work on four different sessions. Use [model name omitted]"

   The model name is left out of this file, by the rule that no model name goes in the repository.

Claude read the house rules, PLAN.md, the PRD, the TRD, issue #90 and the build-mode code. The change:

- After a failed Check, the two ends of the failed connection keep a red ring. A dashed ghost wire joins them. The marks clear when the connection is right, or when a new Check names another problem.
- "Show me" on the fail card closes the card and moves the camera to the two ends.
- Pure logic in `lib/circuit/problem.ts` and `lib/game/focus.ts`, with Vitest tests written first (red, then green).
- New text in `content/ui/build.json`: the key `play.check.show`.
