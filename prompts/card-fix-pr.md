# PR text for issue #51 (Hanif opens the PR)

**Title:** Continue card: show the full level name

**Body:**

closes #51

As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. Perch opens; the other projects and features show a "Coming soon" badge and can't be started.

## What changed

- **The level line is in front of the Perch picture.** Before, a long level name ("Level 2 · Talk button and status light") went under the picture.
- **On a laptop, the level line wraps before the picture**, in two lines of the same length. On a phone, it stays on one line, as before.
- **The picture is a bit smaller on a laptop** (16 rem, was 20 rem). The class list had two laptop widths; now it has one.
- One file: `components/lobby-cards.tsx`. No new package. No database change.

## How we checked it

- The card for each of the 5 Perch levels, at 390 px and 1280 px wide, in light and dark mode, before and after the change. After the change, the full level name shows for each level.
- 242 tests, the type check, lint and the build pass.

This PR adds no required test, so it has no red and green screenshots.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01UAqLP1a2qjxAGzoLUpPptA
