# Prompt log: More mascots for Jumper (feature/mascots)

1. Hanif's request (his words):

   "For the tour, I am thinking of upgrading/changing mascots in order for us to have more variety. What do you think? Can we spin at least 2-3 more mascots?"

   Claude's answer (not Hanif's words): three concepts (Bulb, Coil, Knob) in Volt's style, and a plan. The plan: reuse the existing robot avatars for profile pictures, and give each project its own mascot with four poses.

2. Hanif's answers to Claude's questions (his words):

   "1. Let's do that
   2. Step 2
   3. Each project should have their own mascot"

   "1. Yes
   2. Agreed
   3. Draw them to include it to what we have right now"

3. Hanif's answer about the branch (his words):

   "1, create feature/mascot and move the mascot work there"

   Hanif made the branch `feature/mascots` from `main` at `43eb02c`. Claude did not create it.

4. Hanif's answers to the three questions after the concepts (his words):

   "1. All three
   2. you decide
   3. Yes"

   Question 1: which mascots to build. Question 2: where they appear. Question 3: whether Volt stays the main guide for Perch.

5. Hanif's message about the branch (his words):

   "feature/Mascot is available (capslock sensitive)"

   Hanif then created `feature/mascots` from `main`, which the parent session confirmed. Claude works on that branch.

## Decisions (Claude, for "you decide")

- Each project names its mascot in its content file (`mascot`). Perch: Volt. Arduino Foundations: Bulb. Desk Weather Station: Knob. Plant Watering Monitor: Coil. The project files for Focus Timer and Line-Following Robot have no mascot, so they show Volt. Pixel and Servo have no poses yet, so they are not used.
- The mascot shows in the build pop-ups (the task, "what happened" and mistake pop-ups, on a phone and in the pinned card on a laptop), on the level map (the mascot that stands on the level to play now) and on the Level complete screen.
- Not changed: the tour (it is on `feature/first-visit-tour`, which is not merged, so it shows Volt for now). The walkthrough clip player and the landing page keep Volt.
- Not added: Bulb, Coil and Knob as profile characters. The database checks the avatar ids (`supabase/migrations/20261019000000_profile.sql`), so new ids need a migration. This needs Hanif's decision.
- No database change. The mascot is read from the content file on the server (`lib/content/mascot.ts`).

## Ledger notes (Claude)

- Work on this branch: three concept SVGs in `prompts/mascot-concepts/`, with a README (one line per mascot, and a recommendation on the existing avatars). No app code, no file in `public/` or `components/`.
- Agreed mapping (for the next step, not built yet): Perch: Volt. Arduino Foundations: Bulb. Desk Weather Station: Knob. Plant Watering Monitor: Coil. Focus Timer: Pixel (needs poses). Line-Following Robot: Servo (needs poses). Diode and Chip: profile pictures only.
- The pose files for Bulb, Coil and Knob are in `public/mascots/` (12 SVG files, four poses each). The Pixel and Servo poses are not built.
- Checked in Chromium (a temporary route, removed): the Arduino Foundations level 1 build page at 1280 x 800 and 390 x 844 shows the Bulb idle image in the task pop-up (`prompts/mascots-screens/`). The image loads, with its screen reader label.
- Not checked: the level map and the Level complete screen for the new mascots (they need a log-in); the Coil and Knob images in the app; the profile page.
- The tour branch (`feature/first-visit-tour`) is unchanged by this step, and the tour still uses Volt.
