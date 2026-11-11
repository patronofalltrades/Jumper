#!/usr/bin/env python3
"""PreToolUse guard: block pushes/commits to main and branch creation.

Rules 1 and 6 of CLAUDE.md "Agent hooks". From November 11, 2026, an agent can open issues and pull requests,
and can approve and merge a pull request after the CI passes.
"""
import json
import os
import re
import subprocess
import sys

PROTECTED = ("main", "master")


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"Blocked by Jumper hook: {reason} Ask Hanif to do this step.",
        }
    }))
    sys.exit(0)


def current_branch():
    try:
        return subprocess.run(
            ["git", "-C", os.environ.get("CLAUDE_PROJECT_DIR", "."), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        return ""


def check_bash(cmd):
    for part in re.split(r"&&|\|\||;|\n", cmd):
        words = part.split()
        if "git" not in words:
            continue
        sub = words[words.index("git") + 1:]
        # skip "git -C dir" style options
        while sub and sub[0].startswith("-"):
            sub = sub[2:] if sub[0] in ("-C", "-c") else sub[1:]
        if not sub:
            continue
        verb, args = sub[0], sub[1:]
        if verb == "push":
            refs = [a for a in args if not a.startswith("-")][1:]  # drop remote name
            for ref in refs:
                target = ref.split(":")[-1].lstrip("+").removeprefix("refs/heads/")
                if target in PROTECTED:
                    deny("pushing to main is not allowed.")
            if not refs and current_branch() in PROTECTED:
                deny("pushing while on main is not allowed.")
        elif verb in ("commit", "merge", "rebase", "cherry-pick") and current_branch() in PROTECTED:
            deny(f"'git {verb}' on main is not allowed. Work on a feature branch.")
        elif (verb in ("checkout", "switch") and any(a in ("-b", "-B", "-c", "-C") for a in args)) or (
                verb == "branch" and [a for a in args if not a.startswith("-")]
                and not any(a in ("-d", "-D", "--delete", "-a", "-r", "--list", "-l", "-v", "-vv") for a in args)):
            deny("creating a branch is Hanif's step.")


def check_github(tool, inp):
    name = tool.removeprefix("mcp__github__")
    if name == "create_branch":
        deny("creating a branch is Hanif's step.")
    if name in ("create_or_update_file", "push_files", "delete_file") and inp.get("branch") in PROTECTED:
        deny("writing files directly to main is not allowed.")


def main():
    data = json.load(sys.stdin)
    tool = data.get("tool_name", "")
    inp = data.get("tool_input", {}) or {}
    if tool == "Bash":
        check_bash(inp.get("command", ""))
    elif tool.startswith("mcp__github__"):
        check_github(tool, inp)


if __name__ == "__main__":
    main()
