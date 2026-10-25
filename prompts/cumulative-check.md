# Prompt log: Check tests the parts of earlier levels (issue #65)

1. "Open separate sessions to work on each issues (61-65) on their respective branches. Read documentation before touching any code."

   Claude read CLAUDE.md, AGENTS.md, PLAN.md, the PRD, the TRD, `schema.md`, the ledger and issue #65. It then read `lib/circuit/check.ts`, the level page, `build-view.tsx` and the Perch and Arduino Foundations rules.

   Claude asked 1 question. Arduino Foundations level 3 starts with the board of level 1 only. If Check joined the rules of levels 1 to 3, the finished board of level 3 could not pass. Answer: "Use start levels". Check joins the rules of the levels that the board starts with, and the rules of the open level.

   Claude wrote the failing tests first (red), then `joinRules` in `lib/circuit/check.ts` (green), then the level page.
