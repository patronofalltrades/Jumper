# Prompt log: CLAUDE.md and README (issue #7)

1. "Read PLAN.md, docs/PRD.md, docs/TRD.md and reference/breadboard-prototype.html. Then open a GitHub issue "Add CLAUDE.md and README" and work on a branch docs/claude-readme.

   1. Add CLAUDE.md with:
      * a 3-line project summary and links to the plan, PRD and TRD
      * the stack from the TRD
      * house rules: never commit to main; one feature per branch named feature/<name>; every PR body includes "closes #N"; save my key prompts in prompts/<feature>.md on the same branch; write docs in ASD-STE100 Simplified Technical English; lib/circuit and lib/stats are pure TypeScript with Vitest unit tests; levels, tasks and pop-ups live in content/ as JSON, not in code; ask me before adding a dependency that isn't in the TRD.
   2. Replace README.md, written in ASD-STE100. Explain what Jumper is. Say it's a class project for Intro to Code (MBA 296C, UC Berkeley Haas, Fall 2026) and also a passion project that continues after the class. Link the plan, PRD and TRD. Add "Live app: not deployed yet", the tools used, and a "Run the app" section marked as available after feature 1.
   3. Save this prompt in prompts/claude-readme.md, open a PR with "closes #N", and don't merge it."

2. "In this MD file, please add the following skills:
   https://github.com/dietrichgebert/ponytail
   https://github.com/affaan-m/ECC
   https://ui.shadcn.com/
   https://github.com/rebelytics/one-skill-to-rule-them-all"

3. "Add the following as well: frontend-design@claude-plugins-official mattpocock/skills superpowers@claude-plugins-official"

4. "Before moving on, read the prompt first attached in this .md file" (the Solo App Assignment brief). Claude compared the brief with the repository and proposed an "Assignment rules" section for CLAUDE.md.

5. "Let's pick up where we left" → add the "Assignment rules" section.

6. "Can you put a hook in this chat and project that goes as follows: 1. Whenever we work on a feature, do not push to main and do not approve a PR or a merge without me. 2. You can make comments on the PR, but you have to flag those comments to me in order for me to be aware of your changes. 3. Whenever you are unsure, do not execute without asking for additional prompts from me. 4. At the end of this project, we will have to write a reflection that is purely in my voice. Since you can't write it for me, your task is to keep a tracker or a ledger of all the prompts, all the changes, all the observations that I have made over the course of the project."

## Decisions

- shadcn/ui is listed as a skill, but its packages (for example Radix UI) are not in the TRD. Per the house rule, Claude asks Hanif before it adds the first component.
- If a skill and a house rule do not agree, the house rule applies.
