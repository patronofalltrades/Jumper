#!/usr/bin/env python3
"""Ledger hooks for the reflection (rules 2-4 of CLAUDE.md "Agent hooks").

  ledger.py prompt   UserPromptSubmit: log Hanif's prompt, remind Claude of the rules
  ledger.py comment  PostToolUse (GitHub comment tools): log it, tell Claude to flag it
  ledger.py commit   PostToolUse (Bash): log commits and pushes

Each session writes its own file in ledger/raw/, so branches never conflict.
"""
import json
import os
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


def branch():
    try:
        return subprocess.run(["git", "-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"],
                              capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        return "?"


def append(data, kind, body):
    now = datetime.now(timezone.utc)
    sid = (data.get("session_id") or "nosession")[:8]
    path = os.path.join(ROOT, "ledger", "raw", f"{now:%Y-%m-%d}-{sid}.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    new = not os.path.exists(path)
    with open(path, "a", encoding="utf-8") as f:
        if new:
            f.write(f"# Raw ledger: {now:%Y-%m-%d}, session {sid}\n\nWritten by .claude/hooks/ledger.py. Do not edit.\n")
        f.write(f"\n## {now:%H:%M}Z · {kind} · branch `{branch()}`\n\n{body.strip()}\n")


def main():
    mode = sys.argv[1]
    data = json.load(sys.stdin)
    inp = data.get("tool_input", {}) or {}

    if mode == "prompt":
        prompt = data.get("prompt", "")
        if prompt.strip():
            append(data, "Prompt (Hanif)", "\n".join("> " + line for line in prompt.splitlines()))
        print(RULES)

    elif mode == "comment":
        tool = data.get("tool_name", "").removeprefix("mcp__github__")
        where = f"{inp.get('owner')}/{inp.get('repo')} #{inp.get('pullNumber') or inp.get('issue_number') or '?'}"
        body = inp.get("body") or inp.get("comment") or ""
        append(data, f"GitHub comment by Claude ({tool}, {where})", body)
        print(json.dumps({
            "systemMessage": f"Claude posted a GitHub comment on {where}.",
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"You just posted a GitHub comment on {where}. "
                                     "Rule 2: flag it to Hanif in your reply, with the link and a one-line summary.",
            },
        }))

    elif mode == "commit":
        cmd = inp.get("command", "")
        if "git commit" in cmd or "git push" in cmd:
            log = subprocess.run(["git", "-C", ROOT, "log", "-1", "--format=%h %s"],
                                 capture_output=True, text=True, timeout=5).stdout.strip()
            kind = "Push by Claude" if "git push" in cmd else "Commit by Claude"
            append(data, kind, f"`{log}`")


if __name__ == "__main__":
    main()
