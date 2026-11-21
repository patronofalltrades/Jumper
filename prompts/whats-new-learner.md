# Prompt log: What's new, the learner spotlights (issue #198)

1. Hanif's prompt (his words): "What features have we pushed in this sprint? I want to add a highlighter that shows \"what's new\" on Jumper"

2. Hanif's answers to Claude's questions (multiple-choice forms):
   - Where: "Spotlight on the UI" (a "New" badge on the new element itself).
   - Which items: "Learner-visible only (Recommended)".
   - Seen state: "Account (Supabase)".
   - Visitors (they have no account): "Account + browser".

3. Hanif's prompt (his words): "Work on separate PRs for thus". His choice: "3 PRs: schema / visitor / learner". This pull request is the learner part. It starts from the visitor part and includes the schema part (merge), because it reads and writes `profiles.seen_news`.

4. What Claude built:
   - `app/actions/news.ts`: `loadSeenNews` (reads `profiles.seen_news` of the user of the session) and `markNewsSeen` (Zod checks the id, then the RPC `mark_news_seen`).
   - `components/new-spotlight.tsx`: the learner path. A learner spotlight reads the seen list when it shows first, and "Got it" closes it at once and saves the id on the account. There is no cache across spotlights, so a second user on the same tab never gets the list of the first user (PLAN.md row 26).
   - `lib/game/news.ts`: `newsIdSchema`, with a test.
   - The 2 learner spotlights: next to the datasheet button of the parts tray in build mode, and next to the Share button on a snapshot page.
   - `docs/TRD.md` section 9: the `markNewsSeen` row.
