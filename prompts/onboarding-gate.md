# Prompt log: onboarding for each new user (issue #168)

1. Hanif's prompt (his words): "Anytime a new user signs up, you must show them the onboarding flow"

   Claude notes: The onboarding (`/start`) comes before sign-up, and its last screen links to `/signup`. But a visitor could open `/signup` directly, or click "Create an account" on the log-in page, and not see the onboarding.

2. Claude's steps

   - `lib/game/onboarding.ts`: `needsOnboarding` is true when the visitor has no start cookie. The questions set this cookie, so no cookie means no onboarding.
   - `app/(auth)/signup/page.tsx`: a visitor with no start cookie goes to `/start` first.
   - `components/auth/auth-form.tsx`: "Create an account" on the log-in page opens `/start`, not `/signup`.
   - `tests/onboarding.test.ts`: 2 tests for `needsOnboarding` (red before the change, green after).
   - Checks: `npm run typecheck` and `npm test` (65 files, 858 tests) pass. With `curl` on the dev server: `/signup` with no cookie gives 307 to `/start`; with `jumper_start=perch` it gives 200.

3. Decisions made by Claude (minimal choices)

   - The start cookie is the sign that the onboarding is done. No database change.
   - A visitor who did the onboarding in one browser and signs up in a different browser sees the onboarding again.
