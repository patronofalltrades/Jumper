# Jumper project ledger

This ledger is source material for Hanif's reflection. Hanif writes the reflection in Hanif's own voice. Claude does not write it.

## How the ledger works

- **Raw log (automatic).** A hook (`.claude/hooks/ledger.py`) records each prompt from Hanif, each commit by Claude, and each GitHub comment by Claude. The entries wait in `.git/jumper-ledger-pending.md` and move to `ledger/raw/<date>-<session>.md` with Claude's next commit. Do not edit these files. Entries that have not been committed are lost if the cloud session ends first.
- **This file (curated).** Claude adds an entry after each work step: the prompt, the change, the link, and Hanif's decisions, corrections and observations.
- **Two voices are kept apart.** "Hanif said / decided" is only what Hanif wrote. "Claude note" is Claude's view, marked as such. Use only the first for quotes in the reflection.
- Commit ledger files on the current branch, with the work they describe.

## Timeline

| Date (2026) | Prompt from Hanif (short) | What changed | Link |
| --- | --- | --- | --- |
| Oct 15 | Plan, PRD and TRD prompts (see `prompts/plan.md`, `prompts/prd.md`, `prompts/trd.md`) | PLAN.md, docs/PRD.md, docs/TRD.md merged | [#4](https://github.com/patronofalltrades/Jumper/pull/4), [#5](https://github.com/patronofalltrades/Jumper/pull/5), [#6](https://github.com/patronofalltrades/Jumper/pull/6) |
| Oct 16 | "Prompt 1": add CLAUDE.md and README, issue + branch `docs/claude-readme`, PR with "closes #N", do not merge | Issue #7. CLAUDE.md (summary, stack, 8 house rules), README in ASD-STE100, prompt log | [#7](https://github.com/patronofalltrades/Jumper/issues/7), [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 16 | Add skills: Ponytail, ECC, shadcn/ui, one-skill-to-rule-them-all | Skills section in CLAUDE.md with install commands | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 16 | Add frontend-design, mattpocock/skills, Superpowers | 3 more skills in CLAUDE.md | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 17 | "Before moving on, read the prompt first" (Solo App Assignment brief) | Claude compared the brief with the repo and listed 7 gaps | — |
| Oct 18 | "Let's pick up where we left" | "Assignment rules" section added to CLAUDE.md | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | Put a hook in this chat and project: no push to main, no approve or merge; flag PR comments; ask when unsure; keep a ledger for the reflection | `.claude/settings.json` hooks, `.claude/hooks/guard.py`, `.claude/hooks/ledger.py`, this ledger, "Agent hooks" section in CLAUDE.md | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | "This is wrong, add shadcn ui into the packages. This is not a skill. Rewrite this" | shadcn/ui moved from Skills to the Stack table in CLAUDE.md; added to README tools | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | "Yes" to adding shadcn/ui to the TRD; asked "Do we need to add a supabase key?" | shadcn/ui row added to the TRD stack table. Claude explained the Supabase keys. | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | Pasted the Supabase connect steps (package, env vars, optional skill) | No package installed yet. Ledger hook now redacts keys. Claude asked which package and env names to use. | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | Chose supabase-js + ssr, NEXT_PUBLIC_ variable names, and to add the Supabase Server skill | TRD and CLAUDE.md name the packages and variables; skill added to CLAUDE.md | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | "Do not merge PRs, do not open branches, do not start issues. All of these have to be done by me." | Rule 1a in CLAUDE.md; guard now blocks branch, issue and PR creation | [#8](https://github.com/patronofalltrades/Jumper/pull/8) |
| Oct 18 | "Start feature one, look into issue #8" (then stopped Claude) | Claude only read files | — |
| Oct 18 | "Start feature one, look into issue #8, read claude.md and read.me before taking action on anything" | Claude read the docs. #8 is the merged PR; feature 1 is issue #9. Claude asked 4 questions. | [#9](https://github.com/patronofalltrades/Jumper/issues/9) |
| Oct 18 | "no, work on the feature/auth branch/ yes I have a supabase key" | Feature 1 on branch `Feature/auth`: Next.js 16 app, Supabase email and password sign-up, log-in and log-out, proxy that sends visitors to /login, shadcn/ui-style form parts, 7 Vitest tests | [#9](https://github.com/patronofalltrades/Jumper/issues/9) |
| Oct 18 | "completely test the flow first before moving on…" | Cloud session cannot reach Supabase. Test moved to Hanif's Mac; Claude gave the steps. | — |
| Oct 18 | Pasted the `npm run dev` log: sign-up, confirmation link, log-in work; `Date.now()` error on /lobby | Fix: `await connection()` in the Supabase server client | `b9ed7d1` |
| Oct 18 | "also add a forget password feature because I forgot my password" | `/forgot-password` and `/reset-password`, "Forgot password?" link on Log in, safe `next` path in `/auth/callback`, 5 more tests | — |
| Oct 18 | "I have tested enough so we acn proceed" | Feature 1 closed for review. Claude wrote the PR title and body for Hanif to open. | — |
| Oct 18 | "Open Issue #11, read the claude.md and readme.md files before touching anything. Then start developing" | Claude read the docs and issue #11 and started feature 2 locally, because no branch existed yet | [#11](https://github.com/patronofalltrades/Jumper/issues/11) |
| Oct 18 | "branch is ready" (`Feature/Database`) | Feature 2 on `Feature/Database`: migration with 8 tables, row-level security, profile trigger and backfill; 6 projects and 5 Perch levels (41 tasks) as JSON; Zod content schema; idempotent `npm run seed`; schema.md; 15 new Vitest tests | [#11](https://github.com/patronofalltrades/Jumper/issues/11) |

## Decisions by Hanif

- Fully digital app. No physical hardware. (PLAN prompt log)
- One playable project (Perch). All others show "Coming soon". (PLAN prompt log)
- Sharing and collaboration are future work, shown as "Coming soon". (PLAN prompt log)
- Phone support for wiring is required. Data must record completed sessions. (PLAN prompt log)
- Code shapes for 3D parts at launch; glTF from Blender later if needed. (TRD prompt log)
- PRD and TRD written in ASD-STE100. Later: all docs in ASD-STE100. (TRD prompt log, Prompt 1)
- Branch for Prompt 1 named `docs/claude-readme`; Hanif merges, Claude does not. (Oct 16)
- Seven agent skills chosen for the project (Oct 16).
- Agent guardrails as hooks, plus a ledger for the reflection (Oct 18).
- shadcn/ui is a package in the stack, not a skill. Hanif approved it and its packages (Oct 18).
- Supabase: `@supabase/supabase-js` + `@supabase/ssr` (not the dashboard's `@supabase/server`); variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, secret key only for seed and CI; add the Supabase Server skill anyway (Oct 18).
- Hanif does every GitHub step: issues, branches, pull requests, merges. Claude only gives the steps and the text, then works on Hanif's branch (Oct 18).
- Feature 1 work goes on Hanif's branch `Feature/auth`, not the session branch (Oct 18).
- Test feature 1 end to end on the real Supabase project before moving on, with success responses and screenshots as evidence. Test account email: Hanif's Berkeley address, so Hanif can click the confirmation link (Oct 18).
- The cloud session cannot reach Supabase (network policy). Hanif chose to test feature 1 on the Mac, with Claude giving the steps (Oct 18).
- Add a forgot-password feature to feature 1 (Oct 18).
- Feature 2 work goes on Hanif's branch `Feature/Database` (Oct 18).
- Hanif ended the Mac test after sign-up, the confirmation link, log-in and log-out passed: "I have tested enough so we acn proceed". The forgot-password flow and the `Date.now()` fix were not re-tested on the Mac (Oct 18).

## Corrections and agent issues

Record here when Hanif corrects Claude, or when Claude gets something wrong. Say what happened, how it was noticed, and the fix.

- Oct 18: The new guard hook blocked one of Claude's own test commands, because the test text contained the words of a blocked command. The guard reads the command text, not the intent. Fix: Claude moved the test inputs into a file. (Claude note: this is a known limit of the guard; it can block a harmless command that only mentions a blocked one.)

- Oct 18: The ledger hook logged a false "commit" because a test command only mentioned `git commit` inside its text. Claude found it when reading the raw log. Fix: the hook now reads only the git commands that actually run; the false entry was removed.

- Oct 18: Claude treated shadcn/ui as a skill and as a dependency to ask about. Hanif corrected it: "this is wrong, add shadcn ui into the packages. This is not a skill." Fix: shadcn/ui is now in the stack table.
- Oct 18: The ledger hook logged each ledger commit, so the tree was never clean and the Stop hook kept asking for a commit. Fix: the hook skips commits that change only `ledger/`.
- Oct 18: The Stop hook asked for a commit again after the shadcn/ui change. Cause: the ledger hook wrote to a tracked file after each commit and after each prompt, so the tree was dirty at the end of almost every turn. Fix: entries now wait in `.git/` and go into the same commit as Claude's next change.
- Oct 18: The new ledger hook split commands at `&&` even inside quoted text. It logged a fake commit from a test command and could not read a multi-line commit message. Claude found both in the raw log. Fix: the hook now reads commands the way the shell does, with quotes; 6 test cases pass. The two bad entries were corrected.
- Oct 18: Hanif pasted Supabase setup text with the project URL and the publishable key (the secret key was masked). The ledger hook saved the prompt word for word, so the keys would have gone into the repository with the next commit. Claude found it before the commit. Fix: the hook now removes Supabase keys, JWTs and project URLs from every entry.
- Oct 18: Claude offered to open the feature 1 issue and branch itself. Hanif corrected it: "do not merge PRs, do not open branches, do not start issues. All of these have to be done by me." (Claude note: Claude had opened issue #7, branch `docs/claude-readme` and PR #8 itself on Oct 16, when Prompt 1 asked it to.)

- Oct 18: Hanif stopped Claude after "Start feature one, look into issue #8" and repeated it with "read claude.md and read.me before taking action on anything". (Claude note: Claude had started to read files and list issues without reading README.md first. Also, #8 is a pull request, not an issue; feature 1 is issue #9.)

- Oct 18: Bug found by Hanif in the Mac test. After log-in, the `npm run dev` log showed `Route "/lobby": Next.js encountered the unstable value Date.now() while prerendering`. Cause: Supabase `getClaims()` reads the clock to check token expiry, and Next 16 Cache Components does not allow this during prerender. Claude did not see it in the cloud session, because the error needs a real session and the session could not reach Supabase. Fix: `await connection()` at the top of `createClient()` in `lib/supabase/server.ts`, so pages that use Supabase render at request time.

## Hanif's observations

Only things Hanif said or wrote. Add the date and the exact words where possible.

- Oct 16: "I want to understand hardware without buying a bench full of parts." (pitch, PLAN.md)
- Oct 18: Hanif wants the reflection "purely in my voice" and asked Claude to keep a ledger instead of writing it.

## Claude notes (not Hanif's voice)

- Oct 18: shadcn/ui is now in the CLAUDE.md stack and the TRD stack table.
- Oct 18: Hanif pasted the Supabase steps for `@supabase/server` again. Claude kept the earlier decision (`@supabase/ssr`, `NEXT_PUBLIC_` names) and put the URL and publishable key only in `.env.local`, which git ignores. The secret key is not used.
- Oct 18: The network policy blocks ui.shadcn.com, so `npx shadcn init` failed. Claude wrote `components.json` and the Button, Input and Label parts by hand, in shadcn style on Radix UI. Packages: radix-ui, class-variance-authority, clsx, tailwind-merge.
- Oct 18: Claude changed `@types/node` from 20 to 22, because Vitest 5 needs it and the machine runs Node 22.
- Oct 18: Hanif did not answer 2 questions. Claude chose: sign-up asks only for email and password (issue #9 puts profiles in feature 2), and the app works with email confirmation on or off.
- Oct 18: The guard blocked `git checkout -b Feature/Database origin/Feature/Database`, because it reads `-b` as "create a branch". The branch was Hanif's; Claude only needed a local copy. Claude used `git checkout Feature/Database`, which tracks the remote branch without `-b`.
- Oct 18: This session's environment now has the Supabase URL, the secret key and an access token, and it can reach Supabase (it could not for feature 1). Claude did not apply the migration to a real project without Hanif's answer.
- Oct 18: Content choices for feature 2: "Press Check" is not a task row (the level check is its own step, and a task must have a place or wire target). Endpoint names such as `esp.GPIO4`, `mic1.WS` and `bbA.+` are a first draft; the parts registry in features 3 and 4 can rename them. Source URLs come from Claude's knowledge; the session could not open them to check.
- Oct 17: The brief says the student merges each PR. This agrees with Hanif's rule that Claude never merges.
