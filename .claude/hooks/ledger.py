#!/usr/bin/env python3
"""Ledger hooks for the reflection (rules 2-4 of CLAUDE.md "Agent hooks").

  ledger.py prompt     UserPromptSubmit: log Hanif's prompt, remind Claude of the rules
  ledger.py comment    PostToolUse (GitHub comment tools): log it, tell Claude to flag it
  ledger.py precommit  PreToolUse (Bash): before a git commit, log it and stage the ledger

Entries wait in .git/jumper-ledger-pending.md, which git does not track, so the
working tree stays clean between commits. Before each commit they move to
ledger/raw/<date>-<session>.md and that file is staged, so it rides in the same
commit. Each session has its own file, so branches never conflict.
"""
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.environ.get("CLAUDE_PROJECT_DIR", ".")
RULES = (
    "Jumper rules: (1) never push to main, merge, or approve a PR; "
    "(2) flag every GitHub comment you post to Hanif in your reply, with its link; "
    "(3) if unsure, stop and ask Hanif before you act; "
    "(4) add Hanif's decisions, corrections and observations to ledger/LEDGER.md."
)


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True, timeout=5).stdout.strip()


def pending_path():
    return os.path.join(ROOT, git("rev-parse", "--git-dir") or ".git", "jumper-ledger-pending.md")


SECRETS = [
    (re.compile(r"\bsb_(publishable|secret)_[A-Za-z0-9_\-•.]+"), r"sb_\1_[REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"), "[REDACTED_JWT]"),
    (re.compile(r"https://[a-z0-9]{20}\.supabase\.co"), "https://[PROJECT].supabase.co"),
]


def redact(text):
    """Keep keys and project URLs out of the committed ledger."""
    for pattern, repl in SECRETS:
        text = pattern.sub(repl, text)
    return text


def append(kind, body):
    body = redact(body)
    now = datetime.now(timezone.utc)
    with open(pending_path(), "a", encoding="utf-8") as f:
        f.write(f"\n## {now:%Y-%m-%d %H:%M}Z · {kind} · branch `{git('rev-parse', '--abbrev-ref', 'HEAD')}`\n\n{body.strip()}\n")


def flush(data):
    """Move pending entries into this session's raw file and stage it."""
    src = pending_path()
    if not os.path.exists(src):
        return
    now = datetime.now(timezone.utc)
    sid = (data.get("session_id") or "nosession")[:8]
    rel = os.path.join("ledger", "raw", f"{now:%Y-%m-%d}-{sid}.md")
    dst = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(src, encoding="utf-8") as f:
        entries = f.read()
    with open(dst, "a", encoding="utf-8") as f:
        if f.tell() == 0:
            f.write(f"# Raw ledger: {now:%Y-%m-%d}, session {sid}\n\nWritten by .claude/hooks/ledger.py. Do not edit.\n")
        f.write(entries)
    os.remove(src)
    git("add", rel)


def commit_message(words):
    for i, w in enumerate(words[:-1]):
        if w in ("-m", "--message") or re.fullmatch(r"-[a-zA-Z]*m", w):
            return words[i + 1].splitlines()[0]
    return None


def segments(cmd):
    """Split a shell line into commands, respecting quotes (so '&&' inside a string is not a split)."""
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    try:
        tokens = list(lex)
    except ValueError:
        return []
    out, cur = [], []
    for t in tokens:
        if set(t) <= set(";&|"):
            out.append(cur)
            cur = []
        else:
            cur.append(t)
    return [s for s in out + [cur] if s]


def git_commands(cmd):
    """(verb, words) for each git command a shell line actually runs."""
    out = []
    for words in segments(cmd):
        if words[0] != "git":
            continue
        sub = words[1:]
        while sub and sub[0].startswith("-"):
            sub = sub[2:] if sub[0] in ("-C", "-c") else sub[1:]
        if sub:
            out.append((sub[0], words))
    return out


def main():
    mode = sys.argv[1]
    data = json.load(sys.stdin)
    inp = data.get("tool_input", {}) or {}

    if mode == "prompt":
        prompt = data.get("prompt", "")
        if prompt.strip():
            append("Prompt (Hanif)", "\n".join("> " + line for line in prompt.splitlines()))
        print(RULES)

    elif mode == "comment":
        tool = data.get("tool_name", "").removeprefix("mcp__github__")
        where = f"{inp.get('owner')}/{inp.get('repo')} #{inp.get('pullNumber') or inp.get('issue_number') or '?'}"
        append(f"GitHub comment by Claude ({tool}, {where})", inp.get("body") or inp.get("comment") or "")
        print(json.dumps({
            "systemMessage": f"Claude posted a GitHub comment on {where}.",
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"You just posted a GitHub comment on {where}. "
                                     "Rule 2: flag it to Hanif in your reply, with the link and a one-line summary.",
            },
        }))

    elif mode == "precommit":
        commits = [part for verb, part in git_commands(inp.get("command", "")) if verb == "commit"]
        if commits:
            msg = commit_message(commits[0]) or "(message not captured; see git log)"
            append("Commit by Claude", f"`{msg}`")
            flush(data)


if __name__ == "__main__":
    main()
