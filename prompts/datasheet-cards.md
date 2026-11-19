# Prompt log: Datasheet cards (issue #182)

1. Hanif gave Claude two user interviews of November 18, 2026 (Student A and Lecturer B), and asked: "based on these two feedbacks, what issues do you see and what sort of JTBD we can add to our issue list to tackle?" Claude proposed eight jobs, J1 to J8. J3: "When I meet a new part, I want to read its pinout from a datasheet myself, so that I can wire parts that the app does not explain."
2. Hanif: "Let's start with J3, J6, and start a separate session to do a spike on J8."
3. Hanif's decisions: open J3 as a discovery issue, because its user story is not in `PLAN.md`; branch `feature/datasheet-cards`.
4. Claude's scope: a `datasheet` block (summary, power, real datasheet URL, one line for each pin name) in each module file in `content/parts/`; pure functions in `lib/circuit/datasheet.ts` with Vitest tests; a Datasheet button in the parts tray that opens the card. The two boards and "find the pin" tasks are not in this pull request.
