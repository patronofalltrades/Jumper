# Code glossary for each word of the sketch (issue #143)

Branch: `Feature/ArduinoCodeGlossary` (Hanif made it). Issue: [#143](https://github.com/patronofalltrades/Jumper/issues/143). PR: Hanif opens it.

## Key prompts

Hanif's words and decisions only. Claude notes are in `ledger/LEDGER.md`.

1. Planning session, Nov 3 (relayed by the coordinating session; not his exact words): learners find the sketch levels hard without C++. The work must be about learning to code, not a magic experience. Hanif chose three features: #143 code glossary, #144 Step by Step mode, #145 "Write it for me" (+20 XP for a sketch that the learner writes, 0 XP for a sketch that Jumper writes).
2. Session task (from the coordinating session, in Hanif's name, short form): work on issue #143 on `Feature/ArduinoCodeGlossary`. Read the house rules, the issue and the sketch code first. Write the tests first (red, then green). Keep the diff small in `sketch-panel.tsx` and `content/sketches/arduino-foundations.json`, because #144 and #145 change the same panel. #144 will reuse the word explanations, so keep the data easy to read from other code. Give Hanif the PR title and body.

## Decisions by Hanif

1. Show the explanations on hover (laptop) or tap (phone) of a word in the editor, plus a list of all the words. Not a note for each line. (Issue text: "Show the explanations on hover or tap of a word, plus a list of all words. Not a note for each line.")

## Test scenario (Given / When / Then)

`tests/code-words.test.ts`:

- Given the words that `lib/sketch/parse.ts` reads, when the test looks for each word in `content/code-terms/arduino.json`, then each word has an explanation.
- Given a line of a sketch and a cursor position, when `codeWordAt` runs, then it gives the word under the cursor: at the start, in the middle, or just after a word; `void` gives the card of `setup()` or `loop()`; a comment gives the comment card; a space, a number, a variable or an unknown word gives nothing.
- Given the terms of the dashboard, when they load, then each code word is a term of its level of Arduino Foundations.
