# Prompt log: plan additions (issue #30)

1. "can we add to the plan a couple of features: 1. Home page before sign in 2. Walkthrough Video 3. Mascot creation"

   Claude found that assignment rule 2 does not let the original text of `PLAN.md` change. Claude asked 3 questions. Hanif chose: rows in the "Plan vs. Reality" table; an in-app intro video; one fixed Jumper mascot. Claude added rows 14–16, each with a user story.

2. "walkthrough includes walkthrough of the levels"

   Claude added the levels to the user story of row 15.

3. "short clip for all levels", then the answer "One clip per level"

   Row 15 now has one intro video and one short clip at the start of each level (5 clips for Perch).

4. "is this under the claude/dazzling branch? let's not do that and use another name"

   The commits were on the default session branch. Rule 1a: Hanif makes the branches.

5. "Plan additions should be an issue with descirptions first. Then I'll create a branch where you can commit"

   Claude wrote the issue text. Hanif made issue #30 and the branch `Feature/Feature-Addition`. Claude moved the 3 commits onto that branch.

# Prompt log: Profile (issue #34)

1. "Work on this profile branch: https://github.com/patronofalltrades/Jumper/tree/Feature%2FProfile", "issue number: 34", "Read claude.md, readme.md, PLAN.md, Schema.md before continuing"

   Hanif wrote issue #34 with the user story and the decisions, and made the branch `Feature/Profile`. Claude read the four files and the issue. Claude added row 17 (Profile) to the "Plan vs. Reality" table of `PLAN.md`. The original plan text did not change.

2. "add one more feature push to your work: a set of characters that can be used as profile pictures. Provide 5 options to choose from. Use the attached picture as reference:" (a grid of 20 cartoon robots)

   Claude asked 2 questions. Hanif chose "Extend row 17" and "Plan + 5 drawn SVGs". Claude extended the row 17 user story, and drew 5 original robot characters (Volt, Diode, Pixel, Servo, Chip) in `public/avatars/`, with their names in `content/ui/avatars.json`.
