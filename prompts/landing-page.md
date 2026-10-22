# Prompt log: Landing page before sign in (feature 14, issue #46)

1. "Work on issue 46, branch is feature/LandingPage. https://github.com/patronofalltrades/Jumper/tree/Feature%2FLandingPage read all the documentation before implementation"

   Claude read issue #46, CLAUDE.md, AGENTS.md, README.md, PLAN.md (row 14 of "Plan vs. Reality"), the PRD, the TRD, `schema.md`, the ledger, the mascot prompt logs, the proxy, the log-in rules, the lobby, the build scene, Volt and `content/boards/perch.json`. Claude worked on `Feature/LandingPage`, the branch that Hanif made. No migration and no new package.

   Claude built:
   - `lib/auth/rules.ts`: `/` is a public path. `isAuthPage` is now `isVisitorPage`: the landing page and the account forms. The proxy sends a logged-in user on these pages to the lobby. The `/` → `/lobby` redirect in `next.config.ts` is gone.
   - `lib/game/landing.ts`: `wiringOrder()` (all the parts of the finished Perch board, level 1 to level 5, each in task order) and `landingParts()` (the parts on the board at a tick: one more part at each tick, then the finished board for a short time, then again from empty; with reduced motion, always the finished board).
   - Tests first (red), then the code (green): `tests/landing.test.ts` (7 tests) and new cases in `tests/auth.test.ts`.
   - `components/landing/landing-board.tsx`: the 3D bench of build mode, which wires itself. three.js loads after the text and the buttons. A link covers the canvas: a click or a tap opens `/signup`, and the visitor cannot wire on it.
   - `app/page.tsx`: the landing page. The pitch, Volt with a greeting, "Sign up" and "Log in", the 3D board, the 3 steps, and the 6 projects from `content/projects/` (Perch "Play now", the others "Coming soon").
   - Text in `content/ui/landing.json`.
   - `lib/content/load.ts` reads `content/projects/` from the repository root, because the Next.js build cannot use `import.meta.dirname`.
   - README step 5: the app opens on the landing page.

   Checks: 214 tests, the type check, lint and the build pass. Browser check on the real routes (`next start`, placeholder Supabase keys) at 390 px and 1280 px, in light and dark mode, and with reduced motion: no page errors, no sideways scroll, a click on the board opens `/signup`, and with reduced motion the board shows the finished wiring.
