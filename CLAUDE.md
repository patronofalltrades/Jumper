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

## Assignment rules (Solo App brief)

1. Each issue includes the user story for the feature, copied from `PLAN.md`.
2. Do not change the original text of `PLAN.md`. Add rows only to the "Plan vs. Reality" table at the end.
3. The pull request that adds a required test includes three items: a plain-English explanation of the test, a red screenshot and a green screenshot, and one sentence about a real change that makes the test fail.
4. If the agent makes a bug and I find it, the pull request description tells what occurred, how I found it, and how we repaired it.
5. After each merge to `main`, deploy the app. The live URL must show the current version.
6. Keep `schema.md` in the root of the repository. It lists each table, its columns and the relations. It compares the built schema with section 3 of `PLAN.md`.
7. By November 4, 2026: 9 or more merged pull requests, and 5 or more real entries of my data. No placeholder text.
8. I merge each pull request. Do not merge a pull request.

## Skills

Use these skills when you work on Jumper. They do not replace the house rules. If a skill and a house rule do not agree, the house rule applies.

| Skill | Source | Use it for |
| --- | --- | --- |
| Ponytail | [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) | Write the minimum code that works. Before you write code, check if the codebase, the standard library or the browser already does it. Add one small test for logic. |
| ECC | [affaan-m/ECC](https://github.com/affaan-m/ECC) | Agent workflows, commands and reviews for Claude Code. |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com/) | UI components (forms, dialogs, sheets, toasts) on Tailwind CSS. shadcn/ui adds packages that are not in the TRD (for example Radix UI). Ask me before you add the first component. |
| task-observer | [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) | Watch each session. Log corrections and repeated work as suggestions to improve or add skills. |
| frontend-design | `frontend-design@claude-plugins-official` | Make screens with high design quality. Use the design direction in the PRD (workbench look, Duolingo game feel) and the tokens from the prototype. |
| Matt Pocock skills | [mattpocock/skills](https://github.com/mattpocock/skills) | Small engineering skills for TypeScript work, for example planning, tests and refactors. |
| Superpowers | `superpowers@claude-plugins-official` | Brainstorm, plan, debug in steps, and write tests first (red, then green). |

**Install (Claude Code):**

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
npx ecc-universal setup
npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer
claude plugin install frontend-design@claude-plugins-official
claude plugin install mattpocock-skills@claude-plugins-official
claude plugin install superpowers@claude-plugins-official
npx shadcn@latest init        # only after I approve the shadcn/ui dependencies
```

**task-observer activation:** At the start of each session that uses a tool, load the task-observer skill before you plan or write code. If a session becomes multi-step work, or I correct how you work, load it at that moment, before the next write.
