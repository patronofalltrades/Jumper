# Prompt log: The lobby card opens the level map (issue #122)

1. Hanif's request (his words):

   "start working on #122 to #127 in different subsessions using haiku 5.5"

   This session does #122 only. The issues #123 to #127 are other sessions.

2. Claude's work for #122 (not Hanif's words):

   - Red test first: `tests/continue.test.ts`, `featuredHrefs` (commit `d4c71a2`).
   - Change that makes it green (commit `2f5d942`): the card body opens the map, the play button opens the level, the dock's Build button opens the map, and the level map scrolls to and pulses the current level.

## Ledger notes

How it works:

- `lib/game/featured.ts`: `featuredHrefs(slug, level)` returns `mapHref` (`/p/<slug>`) and `href` (`/p/<slug>/<level>`). `loadCatalog` puts both on `Featured`.
- `components/lobby-cards.tsx`, `ContinueCard`: the card is an `article`. The body is one `Link` to `mapHref`. Its `::after` covers the card (stretched link). The round play button is a second `Link` to `href`, with `relative z-10`, so it sits above the body link. No link is inside a link. The picture has `pointer-events-none`, so a tap on it reaches the body link.
- `app/play/route.ts`: the dock's Build button redirects to `featured.mapHref`.
- `app/p/[project]/page.tsx`: the level to play now (`here`) gets `motion-safe:animate-pulse` on its circle, and a hidden `ScrollHere` marker. The marker's parent row calls `scrollIntoView({ block: "center" })` when the map opens. `components/map/scroll-here.tsx` is new.
- No new text. No `content/` change. No dependency. No migration. No `localStorage`.

Choices made:

- A stretched link, not a nested link (the issue said not to nest).
- `motion-safe:` for the pulse, so reduced motion shows no pulse.
- `scrollIntoView` with the default (instant) behavior, so reduced motion is respected without extra code.

Not checked:

- The lobby and the level map with a real log-in and real data (the live project was not used).
- The dock's Build redirect in a browser (it needs a log-in). It is checked by typecheck and by reading only.
- Dark mode, touch on a real phone, and screen reader output.
- The Playwright end-to-end tests (`e2e/`) were not run.
- The browser check used temporary routes with mock data. `proxy.ts` was moved aside for the check and put back. The temporary routes were removed before the commit.
