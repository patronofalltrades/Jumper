# Prompt log: What's new, the seen spotlights on the account (issue #196)

1. Hanif's prompt (his words): "What features have we pushed in this sprint? I want to add a highlighter that shows \"what's new\" on Jumper"

2. Hanif's answers to Claude's questions (multiple-choice forms):
   - Where: "Spotlight on the UI" (a "New" badge on the new element itself).
   - Which items: "Learner-visible only (Recommended)" (the 6 changes of this sprint that a learner or a visitor can see).
   - Seen state: "Account (Supabase)".
   - Visitors (they have no account): "Account + browser" (the account for a logged-in learner, the browser for a visitor).

3. Hanif's prompt (his words): "Work on separate PRs for thus". His choice: "3 PRs: schema / visitor / learner". This pull request is the schema part.

4. What Claude built:
   - `supabase/migrations/20261121100000_whats_new_seen.sql`: `profiles.seen_news` (text[]) and the function `mark_news_seen(p_id)`. The function runs as its owner, writes only the row of `auth.uid()`, checks the id format, keeps each id one time and keeps the 100 newest ids. A learner still cannot write `seen_news`, `xp` or other columns directly.
   - `supabase/tests/whats_new_seen.sql`.
   - `schema.md`: the column, the function and the comparison with PLAN.md section 3.
