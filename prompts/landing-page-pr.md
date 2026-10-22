# PR text for issue #46 (Hanif opens the PR)

**Title:** Landing page: what Jumper is, a 3D Perch board that wires itself, and Sign up / Log in

**Body:**

closes #46

As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account.

## What changed

- **A landing page at `/`.** A visitor who is not logged in sees it. Before, `/` sent the visitor to `/login`. A logged-in user goes to the lobby, the same as on the log-in page.
- **A short pitch** of what Jumper is, in simple words.
- **The 3D breadboard wires itself.** The ESP32-S3 sits on the two breadboards, and the wires and parts of Perch come in one at a time, level 1 to level 5, in task order. Then the board starts again. The visitor cannot wire on it. A click or a tap on the board opens the sign-up page.
- **Volt greets the visitor.**
- **How Jumper works, in 3 steps:** pick a project, wire it with guided pop-ups, see it come alive.
- **"Sign up" and "Log in"** at the top, in the pitch and at the end. On a phone, they are full width and 44 px high.
- **The projects** from `content/projects/`: Perch ("Play now · 5 levels") and the 5 "Coming soon" projects.
- **Reduced motion:** the board shows the finished wiring and does not change.
- **Load size:** three.js loads after the text and the buttons. This is a new exception to TRD 12.1, as the issue says.
- **Text** in `content/ui/landing.json`.
- `isAuthPage` is now `isVisitorPage`, because it also covers `/`. The `/` → `/lobby` redirect in `next.config.ts` is gone.
- `lib/content/load.ts` now reads `content/projects/` from the repository root. The Next.js build cannot use `import.meta.dirname`.
- No new package. No database change.

## Tests

- `tests/auth.test.ts`: a visitor opens `/` without a log-in, and a logged-in user on `/` goes to the lobby.
- `tests/landing.test.ts` (7 tests): the order in which the board adds the parts and wires, the loop, reduced motion, and the landing text.

These are not one of the two required tests in PLAN.md section 4, so this PR has no red and green screenshots.

214 tests, the type check, lint and the build pass.

## Not in this PR

- The walkthrough video (feature 15).
- TRD sections 4 and 12.1 do not list the landing page yet.

## How to check

1. Log out. Open `/`. The landing page shows, and the board wires itself.
2. Click or tap the board. The sign-up page opens.
3. Log in. Open `/`. The lobby opens.
4. Turn on reduced motion. Open `/` again. The board shows the finished wiring.
5. Check a phone and a laptop, in light and dark mode.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SGbCYS5rciCgUtm8g3XvYt
