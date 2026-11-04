**Base:** `main`
**Head:** `Features/Onboard-Tour-For-New-Users`

**Issue:** #168, "Show the onboarding to each new user before sign-up"

---

**PR title:** Show the onboarding to each new user before sign-up

**PR body:**

closes #168

User story (PLAN.md row 1): As a new visitor, I want to create an account, log in and log out, so that my builds are mine. Added: each new user does the onboarding (`/start`) before sign-up.

## What changed

- `proxy.ts`: a visitor with no start cookie (`jumper_start`) who opens `/signup` goes to `/start` (the onboarding) first.
- "Create an account" on the log-in page opens `/start`.
- New pure function `needsOnboarding` in `lib/game/onboarding.ts`.
- `PLAN.md`: row 64 in the "Plan vs. Reality" table.
- `prompts/onboarding-gate.md`: the prompt log.

## The test

- Plain English: the test checks that a visitor with no start cookie must do the onboarding, and that a visitor with the cookie can open the sign-up form.
- Red screenshot: <paste>
- Green screenshot: <paste>
- A real change that makes the test fail: if `needsOnboarding` always returns false, a new visitor can open `/signup` with no onboarding, and the test fails.

## Bug that the agent made

- What occurred: the first version read `cookies()` in the sign-up page. The app uses Cache Components, so the Vercel build stopped on `/signup` ("uncached or runtime data during prerendering").
- How Hanif found it: the Vercel check on this PR failed.
- How we repaired it: the check moved to `proxy.ts`, with the other log-in redirects. The sign-up page is static again, and `next build` passes.

## Checks

- `npm run typecheck`, `npx eslint .`, `npm test` and `npx next build` pass.
- On `next start`: `/signup` with no cookie gives a 307 redirect to `/start`. With `jumper_start=perch`, it gives 200 and the form.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnPZq7srYV3CDkMZecd
