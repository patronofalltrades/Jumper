# Prompt log: Check links a fail to its task, with "Redo this step" (issue #91, branch `feature/check-redo-step`)

1. Hanif's words (the gripe, the reason for issue #91):

   > "the gripe that I have with the perch level is that it is pretty hard to see what I did wrong and try to understand how to fix it. ... when I finish a level and check, it says, 'Oh, something is wrong,' and then I don't really know how to fix it. The video is not really helpful because it does not indicate how to solve the problem."

2. Hanif's words (the plan for the work):

   > "Let's work on a session to fix this by spinning up four different sessions for 1-4"

3. Hanif's words (the start of this session, issue #91):

   > "opened them: ... Read the documentation before working. Check respective branches. Work on four different sessions. Use Haiku 5.5"

   Scope: issue #91, "Check: link a fail to its task, with "Redo this step"". The other sessions do #89 (new fail text), #90 (marks on the 3D board and "Show me") and #92 (a live list of all problems). This work does not do their parts.

## Claude notes (not Hanif's words)

- Read: `CLAUDE.md`, `PLAN.md`, `docs/PRD.md`, `docs/TRD.md`, `README.md`, issue #91, `lib/game/engine.ts`, `lib/game/board-store.ts`, `lib/circuit/check.ts`, `components/build/check.ts`, `components/build/popups.tsx`, `components/build/build-view.tsx`, `content/ui/build.json`, `content/projects/perch.json`, and the tests `tests/engine.test.ts`, `tests/board-store.test.ts`, `tests/check.test.ts`. Read the ledger notes for #63 and #72.
- Decisions taken by Claude, to be checked by Hanif: a redo gives no XP and no Mistake (the issue does not ask for a change to XP). A task counts once, as before. The match ignores the side of a button or a resistor (pins "1" and "2"). A fail that has no task of this level (a forbid rule, a rule of an earlier level) shows no button, as the issue says.
- The `task-observer` skill is not installed in this cloud session (the Skill tool reports it as unknown). The Jumper rules ask for it; this was noted in the ledger.
