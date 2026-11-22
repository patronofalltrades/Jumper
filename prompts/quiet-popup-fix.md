# Prompts: the task pop-up shows again (issue #220)

This is the key prompt for this repair, on November 22, 2026. It came from the Claude session that Hanif directs, minutes after quiet build mode (PR #219) merged.

## 1. The report

> URGENT regression found on PRODUCTION after PR #219 merged. On the live site, level 3 of Arduino Foundations, as a logged-in learner on a laptop viewport, progress = {phase:"task", index:0}: the drei `Html` container of `PinnedPopup` IS in the DOM, but its innerHTML is EMPTY. No console error. The yellow arrow shows. Result: a learner on a laptop sees NO task instruction at all.

## 2. The instructions

- Find the root cause and prove it. Reproduce with a production build, not only with the development server.
- Repair it with the minimum change. Add a test where a pure test is possible.
- Do the browser check on the production build: level 3 new and with saved progress, level 1 new, and the phone sheet.
- Add one row to "Plan vs. Reality" in `PLAN.md`. Keep the test page out of the commit.
