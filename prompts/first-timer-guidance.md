# First-timer task text (issue #148)

## Hanif's prompts (his words)

1. The audit prompt: see [app-audit.md](app-audit.md) on branch `claude/charming-euler-8kha9u`.
2. "let's plug the biggest gaps. Create a single issue with title and body that will help an agent work n this"
3. "ask me the questions to scope this work so that you get full context"
4. "can we also include arduino in this sprint?"
5. A user test: the Granola notes "Robotics learning app UI/UX feedback with Risly".
6. "bypass the hook. This is approved by me, who made the hook at the first place"
7. "bypass it too, create the branch and start"

## Hanif's decisions (his choices in the question dialogs)

- Scope: the task text only. Glow first and the fail card are later issues.
- Perch Level 1: one "Look" card in place of tasks 1 to 3. Arduino Level 1: the same.
- A saved board is read again. No reset.
- Projects: Perch and Arduino Foundations (first "Perch only", then prompt 4).
- A hole on a red or blue line: "next to column N".
- The holes come from the arrow, not fixed in the JSON.
- Module pins: plain name first.
- I²S: remove the word. No card.
- 20 words, with a short form, also for wires.
- Claude does the GitHub steps this time. Not a "required test" PR. Merged before November 4.

## Claude's choices (for Hanif to confirm)

1. A two-leg part (the LED, the speaker) is one task with two holes, as a wire is: one action, two taps. The issue asked for one task for each leg. A split needs a change to the engine (one task for each leg of one part), so Claude did not do it. The text names the two holes in one sentence.
2. A wire task has the form "<plain name> (<label>): connect {from} to {to}." A wire to a GPIO pin says "pin 7 at {to}", not "pin 7 (GPIO 7) at {to}", to stay in 20 words. The GPIO label is in the "What happened" text and the hole card.
3. A red or blue line is "breadboard A's left red + line next to column 5". Perch breadboard A and B each have two free lines of each color, so the text says left or right. The column number is the nearest printed column.
4. The rows of the task list after the task of now name the holes that the guide will show, if the learner follows the guide. When the learner puts a part in another hole, the rows change.
5. A wire task whose two ends are already in one line of 5 says "already joined in …" (Perch level 2 task 7, Arduino levels 2 and 4 task 4).
6. Arduino Level 1: the "Power rails" card is gone; its idea is in the Breadboard card ("The long red and blue lines at the edges carry power to every part"). Arduino Level 2: the first card is now "Resistor", and "Ohm's law" moves to task 3, because "resistor" must not show before its card.
