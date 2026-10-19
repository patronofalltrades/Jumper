# Prompt log: profile page (feature 17)

1. "do that in this branch instead. is that possible?", then "https://github.com/patronofalltrades/Jumper/tree/Feature/Profile"

   "That" is the profile page from row 17 of `PLAN.md`. PR #35 (the plan row and the 5 characters) was already merged, so Claude moved `Feature/Profile` forward to `main`. Claude asked 3 questions. Hanif chose: the character shows on the profile page and in the lobby header; the migration locks XP; the password change has a new and a confirm field.

   Claude built `/profile`, the server actions, the profile rules with tests, the migration, and the `schema.md` rows. Claude tested the migration on a local Postgres.
