# Prompt log: What's new, the visitor spotlights (issue #197)

1. Hanif's prompt (his words): "What features have we pushed in this sprint? I want to add a highlighter that shows \"what's new\" on Jumper"

2. Hanif's answers to Claude's questions (multiple-choice forms):
   - Where: "Spotlight on the UI" (a "New" badge on the new element itself).
   - Which items: "Learner-visible only (Recommended)" (the 6 changes of this sprint that a learner or a visitor can see).
   - Seen state: "Account (Supabase)".
   - Visitors (they have no account): "Account + browser" (the account for a logged-in learner, the browser for a visitor).

3. Hanif's prompt (his words): "Work on separate PRs for thus". His choice: "3 PRs: schema / visitor / learner". This pull request is the visitor part. It does not need the migration of the schema part.

4. What Claude built:
   - `content/news.json`: the 6 items (4 for visitors, 2 for learners), with the text in ASD-STE100. Each item shows from its release day to December 21, 2026.
   - `lib/game/news.ts`: the Zod schema, `isLive`, `unseen`, `newsItem`, and the seen list of a visitor in the browser (`jumper:news-seen`). A browser that blocks storage shows no spotlight, as the tours. Tests: `tests/news.test.ts`.
   - `components/new-spotlight.tsx`: a yellow "New" pill with a dot (no pulse with reduced motion). A click or Enter opens a card with the title, the text and "Got it". The pill shows only in the browser after the page loads.
   - The 4 visitor spotlights: the hero board and the scroll build on the home page, the Projects section (the mascots), and the practice wire of the onboarding (`/start`).
   - `PLAN.md`: row 74 of "Plan vs. Reality".
   - A local browser check (Playwright on `next dev`): 11 of 11 checks pass, with a video.
