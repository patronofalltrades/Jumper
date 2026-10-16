# CLAUDE.md — Jumper

Jumper is a web app where you learn hardware engineering. You connect real boards on a 3D breadboard, and the app guides you like a game.
The first project that you can play is **Perch**: a desk device for an AI agent, on an ESP32-S3 board, in 5 levels.
Each project uses the same build mode. A new project adds data (levels, tasks, pop-ups), not new game code.

- Plan: [PLAN.md](PLAN.md)
- Product requirements: [docs/PRD.md](docs/PRD.md)
- Technical requirements: [docs/TRD.md](docs/TRD.md)
- Look and interaction reference: [reference/breadboard-prototype.html](reference/breadboard-prototype.html)

## Stack (from the TRD)

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) with TypeScript |
| 3D | three.js through React Three Fiber, with drei |
| Game state | Zustand |
| Styles | Tailwind CSS, with design tokens from the prototype |
| Charts | Recharts |
| Validation | Zod |
| Authentication | Supabase Auth (email and password) |
| Database | Supabase Postgres with row-level security |
| Hosting | Vercel |
| Tests | Vitest (unit and integration), Playwright (optional end-to-end) |
| CI | GitHub Actions (type check, lint, Vitest on each pull request) |
| Browser APIs | Web Audio, Speech Synthesis, Vibration |

## House rules

1. Never commit to `main`. All changes go through a pull request.
2. One feature per branch. Name the branch `feature/<name>`.
3. Each pull request body includes `closes #N` for its issue.
4. Save my key prompts in `prompts/<feature>.md`, on the same branch as the feature.
5. Write all docs in ASD-STE100 Simplified Technical English.
6. `lib/circuit` and `lib/stats` are pure TypeScript: no React, no 3D code, no database code. Each function has Vitest unit tests.
7. Levels, tasks and pop-up text live in `content/` as JSON. Do not write them in code.
8. Ask me before you add a dependency that is not in the TRD.

## Skills

Use these skills when you work on Jumper. They do not replace the house rules. If a skill and a house rule do not agree, the house rule applies.

| Skill | Source | Use it for |
| --- | --- | --- |
| Ponytail | [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) | Write the minimum code that works. Before you write code, check if the codebase, the standard library or the browser already does it. Add one small test for logic. |
| ECC | [affaan-m/ECC](https://github.com/affaan-m/ECC) | Agent workflows, commands and reviews for Claude Code. |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com/) | UI components (forms, dialogs, sheets, toasts) on Tailwind CSS. shadcn/ui adds packages that are not in the TRD (for example Radix UI). Ask me before you add the first component. |
| task-observer | [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) | Watch each session. Log corrections and repeated work as suggestions to improve or add skills. |

**Install (Claude Code):**

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
npx ecc-universal setup
npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer
npx shadcn@latest init        # only after I approve the shadcn/ui dependencies
```

**task-observer activation:** At the start of each session that uses a tool, load the task-observer skill before you plan or write code. If a session becomes multi-step work, or I correct how you work, load it at that moment, before the next write.
