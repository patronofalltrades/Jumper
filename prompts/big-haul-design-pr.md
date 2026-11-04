**PR title:** Big Haul design: Emerald Sun theme, glass navigation, new landing page and lobby

**Base:** `main` · **Compare:** `Features/BigHaulDesign`

---

closes #152

## User story
As a new visitor, before I sign in I want to see a home page that tells me what Jumper is, shows the 3D breadboard and Perch, and has "Sign up" and "Log in" buttons, so that I know why I should make an account. Added: I want the home page to feel like a game that I want to play, like the Duolingo home page. (PLAN.md rows 2a and 14, Plan vs. Reality row 53)

## What changed
**Theme (`ba77291`)**
- `app/globals.css`: "Emerald Sun" tokens (near-black, emerald, sun yellow) in light and dark. The light green is #15803d, so green text on white has 4.5:1 contrast.
- `app/layout.tsx`: the Outfit font. `components/ui/button.tsx`: pill buttons, with new `secondary` and `ghost` variants.
- `components/backdrop.tsx`: a night background with two soft glows, behind the landing page and the logged-in pages, in both themes.
- `components/ui/glassmorphism-navigation.tsx`: the 21st.dev glass navigation, with real links and no theme toggle. New packages: framer-motion and lucide-react (approved by Hanif; in the TRD and CLAUDE.md).

**Landing page (`ba77291`, `8999db3`)**
- `app/page.tsx`, `content/ui/landing.json`: the glass navigation; a hero with the 3D board and two "where do I start" buttons; "Meet Volt" with a Wiring / Code switch (`components/landing/tutor-section.tsx`); project tabs with the real levels (`components/landing/course-tabs.tsx`); a "Real parts" row; a 4-step "Make your first light turn on" row with pictures from the app (`public/landing/`) and the Perch face (`components/art/perch-face.tsx`).

**Lobby (`9ff35d0`)**
- `components/lobby-header.tsx` (new): the glass navigation with Projects, My builds, the XP in sun yellow, the avatar and Log out. Phone: icons only.
- `components/lobby-cards.tsx`: the Continue card is a glass panel with two glows, the project name in emerald, a level badge and the emerald pill button. Project cards are dark panels: an emerald edge and "Play now · 5 levels" when you can play, a dashed edge and "Coming soon" when not. The dark cards (invites, builds, shared) use the same panel.
- `components/ui/surfaces.ts` (new): the glass, solid and button styles, used by the landing page and the lobby. `components/logo.tsx`: `GlassLogo`, used by both navigations.
- `components/card-row.tsx`: the active page dot is emerald. `content/ui/lobby.json` (new): the lobby text.

**Docs:** PRD section 10, TRD and CLAUDE.md stack, PLAN.md row 53, `prompts/big-haul-design.md`, this text, `ledger/LEDGER.md`.

## How it was tested
- Typecheck (`next typegen && tsc --noEmit`), lint, and Vitest: 59 files, 822 tests passed.
- `tests/landing.test.ts` checks the landing text in `content/ui/landing.json`.
- Browser, local only, with placeholder Supabase values: `/` and `/login` at 1280 × 800 in dark and light, and on an iPhone 13 profile. The lobby header and cards on a temporary public route with sample data (removed, not committed) at 1440 × 860 in dark and light, and at 390 × 844. No page errors.
- A bug found in the browser check and fixed: a server page cannot give lucide icon components to a client component, so `/` gave a 500. The navigation now takes a rendered icon element.
- Not checked: the real lobby with Supabase data, the My builds tab with real snapshots, the invite cards, build mode and the dashboard with the new tokens, and a real phone.

## Choices for Hanif
1. In the #152 form, Hanif chose the glass navigation for the "Hero page top bar only". The lobby now also uses it, because Hanif asked for the lobby to look like the hero. To put back the old Projects / My builds switch, change only `components/lobby-header.tsx`.
2. The landing copy uses the real game numbers (+10 XP a task, +50 XP a level, 3 hearts), not the numbers of the design canvas.

## After the merge
1. Wait for the Vercel deploy of `main`, then open the live URL logged out (landing page) and logged in (lobby).
2. Check the lobby, build mode and the dashboard with a real account in both themes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnMfiGwfapddateXaAo
