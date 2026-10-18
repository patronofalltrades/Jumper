# Prompt log: lobby (feature 2a, issue #13)

1. "Issue #12 development: Open git fetch origin git checkout Feature/Lobby. Read Readme.md, Claude.md, Plan.md, Schema.md before touching anything and developing. Develop the lobby feature based on Issue"

   Claude read README.md, CLAUDE.md, PLAN.md, schema.md, the TRD routes and the open issue. #12 is the merged data model PR; the lobby issue is #13. Claude worked on Hanif's branch `Feature/Lobby`.

2. "yes you can" (to a temporary test account in Supabase for the lobby screenshots)

   Claude made the account, ran a Playwright test at 390 px in light and dark mode, and deleted the account.

3. "using https://github.com/morluto/rea, can you distill this user interface and experience, copy it for our jumper project?" (with a ToyCAD screenshot)

   REA inspects programs and websites, not images, so Claude broke the screenshot down by hand and mapped each part to the lobby. Claude asked 3 questions.

4. "1. A 2. Yes I will open it manually you just tell me what to do 3 Build both"

   Jumper colors with the ToyCAD layout; Hanif does the GitHub steps; build the lobby and the dock. The lobby branch already existed, so Claude gave Hanif checklist lines to add to #13.

5. "Do we want to work on a mascot in order to replicate the design?" / "Alright so we're using the things we will be working on as card heroes"

   No mascot. The card pictures show the Perch device and the boards.

6. "I added the new work on issue 13. Let's work on it"

   Claude built the design on `Feature/Lobby`.

7. "can you show me on local?" and the troubleshooting after it

   The session cannot reach Hanif's Mac. A read-only script found the Mac's Jumper folder (`~/jumper-auth`) on `Feature/auth`. Hanif switched it to `Feature/Lobby` and ran `npm run dev`.

8. "awesome! It's working. Some notes: 1. When it is in phone size, the cards should scroll downwards/vertically instead of horizontally 2. the navigation pane should be placed on the bottom of the phone screen 3. A script should be written to detect whether a user is opening the site on a laptop or a phone"

   Phone: one column of cards and a full-width bottom bar. `lib/device.ts` and `components/device-tag.tsx` detect phone or laptop.

