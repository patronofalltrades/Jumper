# Prompt log: agent rules (issue #170)

1. Hanif's prompt (his words): "This project will no longer ban PRs from being published by Agents nor Band Merges approved by agents. Please add the following rules: 1. PRs can be made by AI agents 2. Merges can be approved by AI agents 3. Agents will check CI/CD 4. Agents can also create Issues 5. Ledger would not be updated moving forward"

   Claude's steps

   - `CLAUDE.md`: new "Agent hooks" section with the five rules. Assignment rule 8 says that an agent or Hanif can merge after the CI passes.
   - `.claude/hooks/guard.py`: no block for issues, pull requests, approvals and merges. The block for `main` stays.
   - `.claude/settings.json`: the two merge tools are not in the deny list. The ledger hooks are gone.
   - `.claude/hooks/ledger.py` is deleted. `.claude/hooks/rules.py` keeps the two reminders and writes no file.

   Claude asked: does "merges can be approved" mean approve and merge? Is the CI check a condition?

2. Hanif's prompt (his words): "1. Yes 2. Yes and enfroce via hook. Please open branch blocking creation. lift it"

   Claude's steps

   - `guard.py`: before an approval or a merge, it reads the check runs of the head commit with `gh`. It blocks if a check fails, is not complete or is not there, or if it cannot read the result.
   - `guard.py`: no block for branch creation.
   - Checks by hand: a merge of #169 (green) passes. A pull request that does not exist, a `gh` merge command with no number, and a push to `main` are blocked.

3. Hanif's prompt (his words): "allow everything"

   Claude notes: Claude read this as "do all the steps that Claude offered": open this pull request, open the three landing page issues, and start the first one.

4. A bug that Claude made and found

   - What occurred: the guard blocked a shell command that only wrote this file, because the text of the file had the words of a `gh` merge command in it.
   - How Claude found it: the hook blocked the command.
   - The repair: Claude wrote the file with the file tool. The guard is not changed: it reads the full text of a shell command, so a command that only names a merge can be blocked. This is the safe direction.
