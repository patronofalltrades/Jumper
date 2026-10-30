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

## Ledger notes (Claude)

- Work on this branch: three concept SVGs in `prompts/mascot-concepts/`, with a README (one line per mascot, and a recommendation on the existing avatars). No app code, no file in `public/` or `components/`.
- Agreed mapping (for the next step, not built yet): Perch: Volt. Arduino Foundations: Bulb. Desk Weather Station: Knob. Plant Watering Monitor: Coil. Focus Timer: Pixel (needs poses). Line-Following Robot: Servo (needs poses). Diode and Chip: profile pictures only.
- Pose sheets (idle, happy, oops, cheer) for Bulb, Coil, Knob, Pixel and Servo are in the session scratchpad only, not committed. The next step is to commit them after Hanif answers the questions.
- Not checked: the concept SVGs in a browser at phone size; the profile page and the lobby with a new mascot; the tour and pop-ups with a new mascot.
- The tour branch (`feature/first-visit-tour`) is unchanged by this step, and the tour still uses Volt.
