closes #N

## User story
As a learner, I want a mascot that fits the project I am building, so that each project feels like its own game and I see more variety than Volt alone.

## What changed
- `lib/game/project-mascot.ts` (new): the four mascots (Volt, Bulb, Coil, Knob) and the rule that gives a project its mascot. A project with no mascot, or an unknown one, has Volt.
- `components/art/mascot.tsx` (new): one `Mascot` component. Volt is drawn in code. The other mascots are SVG files, with the same motion as Volt.
- `public/mascots/` (new): 12 SVG files, four poses (idle, happy, oops, cheer) for Bulb, Coil and Knob.
- `public/avatars/bulb.svg`, `coil.svg`, `knob.svg` (new): profile pictures (the idle pose on a light square).
- `content/projects/*.json`: a `mascot` field. Perch: Volt. Arduino Foundations: Bulb. Desk Weather Station: Knob. Plant Watering Monitor: Coil. Focus Timer and Line-Following Robot have no field, so they show Volt.
- `content/ui/mascot.json`, `content/ui/avatars.json`: names and pose texts for the new mascots; the three new profile characters.
- `lib/content/schema.ts`: the optional `mascot` field of a project.
- `lib/content/mascot.ts` (new): reads the mascot of a project on the server.
- Pages and components: the build page passes the mascot to the build view. The pop-ups (including the pinned card on a laptop, which needs the mascot passed in as a prop) show it. The level map and the Level complete screen show it.
- `app/globals.css`: the motion of the mascot files.
- `supabase/migrations/20261030000000_mascot_avatars.sql` (new): widens the avatar check to the three new ids. Already applied to the live database (confirmed by a read-only query).
- `tests/mascots.test.ts` (new), `tests/content.test.ts`: the avatar count is now 8.
- `prompts/mascots.md`, `prompts/mascot-concepts/`, `prompts/mascots-screens/`: prompt log, concept files and screenshots.

## How it was tested
Plain English: the tests check that each project has the right mascot, that each mascot has four pose files and names, and that no pose file has a script. The avatar test checks that there are 8 profile characters.

- Red (`730df4c`): `vitest run tests/mascots.test.ts`: the module did not load. No test ran.
- Green (`3651adc`): `vitest run tests/mascots.test.ts`: 8 passed (with the content test: 16 passed in both files).
- Profile commit (`2facbf8`): `vitest run tests/content.test.ts`: 13 passed.
- Full suite: 47 files, 637 tests passed.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- End-to-end (`npm run e2e`, production build, live Supabase project): 18 passed (phone and laptop, light and dark), 0 temporary accounts left. The run regenerated the browser-check screenshots, which were restored and not committed.
- Browser, local only: Arduino Foundations level 1 showed the Bulb idle image in the task pop-up at 1280 x 800 and 390 x 844 (`prompts/mascots-screens/`). The image loaded, with its label. The first run showed Volt in the pinned laptop card; the fix passed the mascot in as a prop.
- Migration: read-only check of `profiles_avatar_check` on the live project: the three new ids are accepted.

## Choices for Hanif
1. Should the tour use the project's mascot? The tour is in PR #123, which is not merged. Once #123 merges, the tour can use the mascot of the project. Yes (agreed), but only after #123 merges.
2. Focus Timer and Line-Following Robot show Volt (agreed). Pixel and Servo have no poses yet.

## Not checked
- The level map and the Level complete screen for Bulb, Coil and Knob, in a browser (they need a log-in). The e2e run passed, but it used Volt only.
- The Coil and Knob images in the app.
- The profile page with a new character, in a browser.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
