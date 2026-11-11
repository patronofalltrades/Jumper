#!/usr/bin/env python3
"""Reminder hooks (rules 7 and 8 of CLAUDE.md "Agent hooks"). They write no file.

  rules.py prompt     UserPromptSubmit: remind Claude of the rules
  rules.py comment    PostToolUse (GitHub comment tools): tell Claude to flag the comment
"""
import json
import sys

RULES = (
    "Jumper rules: (1) never push to main; "
    "(2) check that the CI passes before you approve or merge a pull request; "
    "(3) flag every GitHub comment you post to Hanif in your reply, with its link; "
    "(4) if unsure, stop and ask Hanif before you act."
)


def main():
    mode = sys.argv[1]
    data = json.load(sys.stdin)
    inp = data.get("tool_input", {}) or {}

    if mode == "prompt":
        print(RULES)

    elif mode == "comment":
        where = f"{inp.get('owner')}/{inp.get('repo')} #{inp.get('pullNumber') or inp.get('issue_number') or '?'}"
        print(json.dumps({
            "systemMessage": f"Claude posted a GitHub comment on {where}.",
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"You just posted a GitHub comment on {where}. "
                                     "Flag it to Hanif in your reply, with the link and a one-line summary.",
            },
        }))


if __name__ == "__main__":
    main()
