# PR text: level path and onboarding (issue #152)

**Title:** Level path from the design canvas, and the /start onboarding on main (#152)

**Body:**

closes #152

User story (PLAN.md rows 2a and 14): As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account.

## What changed

1. **Onboarding on main.** This branch merges `Features/BigHaulDesign`: the `/start` onboarding (`7538abb`) and the 3D mascot band (`040f882`). PR #153 merged that branch before these commits, so they were not on `main`. Conflicts: `app/page.tsx` imports (the hero track from `main`, the mascot band from the branch), `content/ui/landing.json` and the ledger.
2. **Level page (`/p/[project]`) from the canvas.** Square tiles joined by a path on a dotted board, after the Mimo reference. A passed level is an emerald tile with a check. The level to play now is a sun-yellow tile with a "Start" bubble and the mascot next to it. A locked level is a dark tile with a lock. A Finish tile ends the path. The top pill shows the project, the board, "Level n of m", the Watch button of that level and a progress ring. Each level still has its Watch button (issue #48). The pass animation of issue #125 still plays (the tiles change, the new path part fades in, the ring and the XP count up).
3. The layout is pure TypeScript in `lib/game/path.ts`, with tests in `tests/level-path.test.ts`. The text is in `content/ui/build.json` (`map`).

## Checks

- Typecheck, lint, 847 Vitest tests (5 new; red first: no module, then green).
- Chromium with a temporary preview page and sample data (not committed): iPhone 13 dark, 1280 × 1100 dark and light, all levels passed. No page errors, no side scroll.
- Not checked: the real page with Supabase and a logged-in learner, a real phone, Safari.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnM1xRX3tVq1TgDjQ2g
