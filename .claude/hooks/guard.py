#!/usr/bin/env python3
"""PreToolUse guard: block pushes/commits to main, and an approval or a merge when the CI does not pass.

Rules 1 and 4 of CLAUDE.md "Agent hooks". From November 11, 2026, an agent can create branches, open issues and
pull requests, and approve and merge a pull request. The guard reads the check runs of the pull request with `gh`.
If it cannot read them, it blocks the approval or the merge.
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
            "permissionDecisionReason": f"Blocked by Jumper hook: {reason}",
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


def gh_json(path):
    out = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=12)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:200])
    return json.loads(out.stdout)


def origin_repo():
    """(owner, repo) of the origin remote."""
    try:
        url = subprocess.run(
            ["git", "-C", os.environ.get("CLAUDE_PROJECT_DIR", "."), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        url = ""
    found = re.search(r"([^/:]+)/([^/]+?)(?:\.git)?$", url)
    return (found.group(1), found.group(2)) if found else (None, None)


def ci_problem(runs):
    """Why the check runs of a commit do not let a pull request through, or None when all of them pass."""
    if not runs:
        return "the pull request has no CI run."
    for run in runs:
        if run.get("status") != "completed":
            return f"the check '{run.get('name')}' is not complete."
        if run.get("conclusion") not in ("success", "skipped", "neutral"):
            return f"the check '{run.get('name')}' ended with '{run.get('conclusion')}'."
    return None


def require_ci(owner, repo, number):
    """Rule 4: no approval and no merge unless each check run of the head commit passes. Blocks when in doubt."""
    if not (owner and repo and number):
        deny("the guard cannot find the pull request, so it cannot read its CI result.")
    try:
        sha = gh_json(f"repos/{owner}/{repo}/pulls/{number}")["head"]["sha"]
        runs = gh_json(f"repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=100")["check_runs"]
    except Exception as error:
        deny(f"the guard cannot read the CI result of pull request {number} ({error}).")
    problem = ci_problem(runs)
    if problem:
        deny(f"pull request {number} cannot be approved or merged: {problem}")


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
    found = re.search(r"\bgh\s+pr\s+(merge|review)\b([^;&|\n]*)", cmd)
    if found and (found.group(1) == "merge" or "--approve" in found.group(2) or re.search(r"(^|\s)-a\b", found.group(2))):
        number = re.search(r"(?:^|\s|/pull/)(\d+)(?=\s|$)", found.group(2))
        if not number:
            deny("give the pull request number, so the guard can read its CI result.")
        require_ci(*origin_repo(), number.group(1))


def check_github(tool, inp):
    name = tool.removeprefix("mcp__github__")
    if name in ("merge_pull_request", "enable_pr_auto_merge") or (
            name == "pull_request_review_write" and str(inp.get("event", "")).upper() == "APPROVE"):
        require_ci(inp.get("owner"), inp.get("repo"), inp.get("pullNumber"))
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
