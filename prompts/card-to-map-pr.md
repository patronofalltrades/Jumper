closes #122

## User story
As a learner, after I log in I want to land in a lobby that shows the project catalog as cards, my XP, and a "Continue Perch" button that takes me back to the level I was on. Perch opens; the other projects and features show a "Coming soon" badge and can't be started. (PLAN.md row 2a)

As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection. (PLAN.md row 5)

Changed: When I tap the Perch card in the lobby, I want to go to the level map first, so that I see where I am on the path before I build.

## What changed
- `lib/game/featured.ts`: new function `featuredHrefs(slug, level)` gives `mapHref` (`/p/<slug>`) and `href` (`/p/<slug>/<level>`). The `Featured` type has both. `loadCatalog` uses the function.
- `components/lobby-cards.tsx`: `ContinueCard` is an `article`. The card body is one link to the map. The link covers the card (stretched link). The round ▶ button is a separate link to the current level, above the body link. No link is inside a link. The sr-only text stays on the ▶ link. The picture has `pointer-events-none`.
- `app/play/route.ts`: the dock's Build button redirects to the map (`mapHref`), not to the level.
- `app/p/[project]/page.tsx`: the level to play now pulses (`motion-safe:animate-pulse`, so reduced motion shows no pulse). A hidden marker scrolls that row into view when the map opens.
- `components/map/scroll-here.tsx` (new): the client component with the marker.
- `tests/continue.test.ts`: 2 tests for the two hrefs. The red commit (`d4c71a2`) came before the change.
- `prompts/card-to-map.md`, `prompts/card-to-map-pr.md`, `prompts/card-to-map-screens/`: prompt log, this text, and screenshots.

## How it was tested
Plain English: the tests check the two links of the Perch card. The card body must go to the level map, and the round ▶ button must go to the current level. The first test fails before the change, because the helper that makes the links does not exist yet.

- Red (`d4c71a2`): `npx vitest run tests/continue.test.ts`: 2 failed, 5 passed. Both failures: `TypeError: featuredHrefs is not a function`.
- Green (`2f5d942`): `npx vitest run tests/continue.test.ts`: 7 passed (7). `npm test`: 46 files, 631 tests passed.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only: temporary routes with mock data (removed before the commit), in Chromium at 1280 x 800 and 390 x 844. Each card: the body link and the ▶ link are both found; `nested links: 0`. `elementFromPoint` on the title, the empty area, and the Perch picture returns `/p/perch`. On the ▶ button it returns `/p/perch/2` (started) or `/p/perch/1` (new). No page errors. The map check (temporary page with the same `ScrollHere` component): the level 4 row scrolled into view (level 4 at 382 px from the top on a 844 px screen). Level 4 has the pulse animation; with reduced motion, no level has it. Screenshots: `prompts/card-to-map-screens/`.
- A real change that makes the test fail: if `featuredHrefs` returns the level link as `mapHref` (`/p/perch/2` instead of `/p/perch`), the body test fails.

## Choices for Hanif
1. The card uses a stretched link: one link for the body, and a separate ▶ link on top. Is this OK, or do you want a different pattern?
2. The current level pulses with `animate-pulse` (opacity). Do you want a different pulse, for example a scale pulse?
3. On load, the map scrolls the current level to the centre of the screen. Is that the right position?
4. The card's `group` is now the `article`, not the link. Pressing the card still moves the ▶ button, as before.

## Not checked
- The lobby and the level map with a real log-in and real data. The live app was not used, and no account was made.
- The dock's Build redirect in a browser. It needs a log-in. It is checked by typecheck and by reading only.
- Dark mode, touch on a real phone, and screen reader output.
- The Playwright end-to-end tests (`e2e/`) were not run.
- The map check used a temporary page with the same `ScrollHere` component, not the real map page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
