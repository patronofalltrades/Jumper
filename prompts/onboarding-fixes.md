# Onboarding fixes before testers

## Prompt (Hanif, November 18, 2026)

> Small issues worth fixing before testers arrive:
>
> * The first-wire step uses the wrong board. It shows ESP32 pins (3V3, IO1…), but the next screen says "Next, you start Arduino Foundations", which uses an Arduino Uno. A beginner could be confused.
> * Your answer doesn't carry over. Picking "I am new to circuits" doesn't pre-select "Learn the basics first" on the next screen.
> * Screen readers can't read the answer buttons. They have no labels, so a screen reader just says "radio".

## What changed

1. The practice wire uses the board of the start project. `content/ui/onboarding.json` has `wire.boards`, with one wire for each project: Arduino Foundations shows the Uno pins (5V, GND, D2, D3, D13), and Perch shows the ESP32-S3 pins (3V3, GND, IO1, IO2, IO4).
2. Each "start" option has `levels`: the "level" answers that select it first. "I am new to circuits" and "I know some words" select "Learn the basics first". "I used a breadboard before" and "I write code for boards" select "Build a real device". The visitor can change the answer. A `?build=` link keeps its answer.
3. Each answer button has `aria-labelledby` (its label) and `aria-describedby` (its sub-text, and "Coming soon" if the project is not available).

## Tests

- `tests/onboarding.test.ts`: `suggestedStart` for each level answer, and a check that each start project has a practice wire on its board.
- Browser check (Playwright, local): the accessibility tree reads `radio "I am new to circuits"`, the start screen opens with "Learn the basics first" selected, and the wire screen shows "Connect 5V to the + line".
