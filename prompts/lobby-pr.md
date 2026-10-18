# PR text: lobby (feature 2a)

**Branch:** `Feature/Lobby` → `main`
**Title:** Lobby: project catalog, XP and Continue button

## Body (paste into the PR)

closes #13

**User story:** As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. Perch opens; the other projects and features show a "Coming soon" badge and can't be started.

### What changed

- `app/lobby/page.tsx`: the lobby.
  - Greets the user by `profiles.display_name` and shows `profiles.xp`.
  - One card for each row of `projects`, in `position` order: board, title, tagline. The 5 `coming_soon` projects have a "Coming soon" badge and a lock, and cannot be started.
  - Two disabled tiles with a "Coming soon" badge: "Share builds with friends" and "Collaborate on a project". Their text is in `content/features.json` (house rule 7).
  - The Continue button reads the latest Perch session of the user. A new user sees **Start Perch**.
  - **Log out** stays in the header.
  - Perch is the large Continue card; there is no separate **Open** button now (see "Design").
- `lib/game/continue.ts`: `continueTarget()`, the pure Continue rule. No session → level 1. In progress or abandoned → the same level. Completed → the next level. Last level completed → the last level.
- `app/p/[project]/[level]/page.tsx`: placeholder that shows the level title and goal, until build mode (feature 5). A "Coming soon" project, an unknown project or a bad level number gives "not found".
- `components/logo.tsx` (shared by the account forms and the lobby), `components/ui/badge.tsx`, and a `probe` (amber) color token for the badge and the XP pill.
- `tests/continue.test.ts`: 5 Vitest tests for the Continue rule.

### Design (ToyCAD reference, added to #13 on Oct 18)

Hanif chose the layout and feel of the ToyCAD home screen, with the Jumper colors from PRD section 10. No new packages.

- `components/backdrop.tsx`: large flat shapes in near-black, PCB green and amber behind the logged-in pages.
- Top bar: logo, a **Projects / My builds** switch (`?tab=builds`), XP and **Log out**.
- `components/card-row.tsx`: the cards in a row that scrolls sideways (CSS scroll snap), with page dots that follow the scroll.
- `components/lobby-cards.tsx`:
  - A large **Continue** card: "Hi, name", "Continue Perch", the level number and title, and a round play button.
  - The other projects as small cards, two to a column, with a lock and a "Coming soon" badge.
  - Dark cards for the 2 "Coming soon" features, and for the user's snapshots on **My builds** (an empty card until feature 6 saves snapshots).
- Card pictures show the thing you build, not a mascot: `components/art/perch-art.tsx` (the Perch device with its face) and `components/art/board-art.tsx` (Arduino Uno, ESP32 DevKit V1, ESP32-C3, ESP32-S3), as SVG.
- `components/dock.tsx`: a bottom dock on the lobby, the level page and the "Coming soon" pages: Lobby, Builds, a centered **Build** button, Dashboard, Profile.
  - **Build** goes to `/play`, which opens the level that Continue opens.
  - Dashboard and Profile go to `/soon/dashboard` and `/soon/profile` ("Coming soon"). Profile also has **Log out**.
- `lib/game/featured.ts`: the catalog query and the Continue level, shared by the lobby and `/play`.

### Checks

- `npm run typecheck`, `npm run lint`, `npm test` (27 tests), `npm run build`: pass.
- Red check: the Continue tests failed before `lib/game/continue.ts` existed, then passed.
- End-to-end test (Oct 18) with Playwright on `npm start`, against the real Supabase project, with a temporary test account (deleted after the test):
  - Logged out, `/lobby` goes to `/login`.
  - New user: "Hi, Lobby Tester", 0 XP, **Start Perch**.
  - 6 project cards in position order; 7 "Coming soon" badges (5 projects and 2 feature tiles); 5 disabled **Start** buttons.
  - After a completed Level 2 session and 120 XP: 120 XP and **Continue Perch · Level 3**. The button opens `/p/perch/3` ("Ears").
  - `/p/arduino-foundations/1`, `/p/perch/9` and `/p/perch/abc` show "not found".
  - At 390 px wide there is no horizontal scroll. Light and dark mode screenshots are correct.
  - **Log out** goes to `/login`.
- Design check (Oct 18), with sample data on a temporary page that was deleted before the commit: light and dark mode at 1440 × 900 and 390 × 844; no horizontal page scroll; the page dots follow the scroll and a click on a dot moves the row. The design is not yet tested end to end with a real account.

### Known limits

- An abandoned session sends the user back to the same level, because that level did not pass.
- When all 5 levels are complete, Continue opens Level 5. The level map (`/p/[project]`) is not built yet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01237SeyGMNTL9J6e6J4nWYv
