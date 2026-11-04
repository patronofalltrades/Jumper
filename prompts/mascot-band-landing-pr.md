# PR text: bigger, brighter mascot band

**Title:** Bigger, brighter 3D mascot band in the hero (#152)

**Base:** `main` · **Compare:** `Features/BigHaulDesign`

**Body:**

```markdown
closes #152

## User story
As a visitor, when I open the landing page, I see the Jumper mascots in 3D, so that I want to start a project.

## What changed
- The 3D mascot band in the hero is bigger: the camera is closer, so the band fills the hero panel.
- The mascots are brighter: stronger lights, a front light and more exposure.
- The stage disc is a flat near-black with the green edge (with more light, the old disc looked brown).

The band itself (Volt, Bulb, Knob and Coil; drop-in, cheer, turns, soft blinking eyes) is already on `main` from PR #157. This PR changes only `components/mascots-3d/stage.tsx` and the ledger.

## Checks
- Typecheck, lint and 853 Vitest tests pass.
- Screenshots of `/` at 1440 × 900 and on an iPhone 13 profile: no page errors, no side scroll.
- Not checked: a real phone and the live app.

## Notes
- The Vercel preview of this branch gave "Internal Server Error". A local build with no `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` gives the same error, so the Preview environment in Vercel most likely does not have these two variables. The mascot code is not the cause.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnNdFUTShHmUKNKyHvu
```
