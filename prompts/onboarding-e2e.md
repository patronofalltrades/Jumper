# Browser check for the onboarding (flow 6)

Issue: #180. Follows #178 (PR #179).

## Prompts (Hanif, November 18, 2026)

> cool. can we do an E2E test before we post

Hanif chose: a new onboarding E2E spec. It needs no account, so it can run against the live URL.

## What the check does

`e2e/flow6-onboarding.spec.ts` goes from the first question of `/start` to the sign-up screen, at phone size and laptop size. The scenarios (S6.1 to S6.4) and the results are in `prompts/browser-checks.md`, under Flow 6.

## How to run it

`npm run e2e -- flow6`. The run starts and ends with the check of the temporary accounts, so it needs `SUPABASE_SECRET_KEY`, as the other flows do. To check the live app, set `BASE_URL=https://jumper-inky-sigma.vercel.app`.
