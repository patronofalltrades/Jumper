# Prompt log: A share link needs a log-in (issue #183)

1. Hanif gave Claude two user interviews of November 18, 2026 (Student A and Lecturer B), and asked: "based on these two feedbacks, what issues do you see and what sort of JTBD we can add to our issue list to tackle?" Claude proposed eight jobs, J1 to J8. J6: "When I am stuck, I want to send my board to a friend or a TA, so that they can see what I see."
2. Hanif: "Let's start with J3, J6, and start a separate session to do a spike on J8."
3. Hanif's decisions:
   - Open J3 and J6 as discovery issues, because their user stories are not in `PLAN.md`.
   - Branches `feature/datasheet-cards` (J3) and `feature/share-snapshot` (J6), one feature for each branch.
   - Claude found that issue #87 (PR #93) already gives a share link with no log-in, and issue #88 (PR #95) gives Collaborate. Hanif chose: "Require login for share links."
4. Claude's scope: a migration removes the `execute` right of `anon` on `get_shared_snapshot`; `/s/<id>` is not a public path; the log-in page keeps `next`, so the log-in goes back to the shared build; the share sheet text changes; the SQL test, the Vitest tests, `schema.md` and row 70 of "Plan vs. Reality" change. Not done: `next` through the sign-up and onboarding flow.
