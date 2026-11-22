# Prompts: quiet build mode (issue #218)

These are the key prompts that Hanif gave for this feature, on November 22, 2026.

## 1. The request

> I need to reduce the amount of popup/instructions on the page. Let's scope and work on this

## 2. The decisions

The agent showed what a learner sees on a new level, and gave options. Hanif selected:

- Direction: **Quiet by default (Recommended)**.
- Extras: **Tool description line**, **Read aloud + music switches**, **New marks (What's new)**.

## 3. The scope that came from the decisions

1. One instruction in one place. The task pop-up shows the task and the how-to line. The guide bar shows only a notice that has no hole.
2. The task list starts closed.
3. The level clip opens by itself only in level 1 of a project.
4. The "New word" and the "what happened" text show as notes in the task pop-up, with no "Got it".
5. The line that tells what a tool is shows only the first time for each tool.
6. "Read steps aloud" and "Play music" are in a sound settings menu.
7. A page shows one "New" mark at a time.

Not in the scope: the tours, the Mistake pop-up, the Check card, and the text of the tasks.

## 4. The check

Hanif's rule for the work: do a browser check on a local server, count the clicks that only close something before and after the change, and keep the test page out of the commit.
