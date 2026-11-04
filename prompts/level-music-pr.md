**Base:** `main`
**Head:** `Features/Music`

**Issue title:** Build mode: music in each level, and a description of each project on the level path

**Issue body:**

User story (PLAN.md row 5): As a learner, in any project I want to build like a game: a level map I move along, and inside each level one task at a time, with a pop-up on the 3D board showing where the part or wire goes and explaining why, the target pin glowing, a snap or buzz when I place a wire, and XP for each task, so that I learn the reason behind every connection.

- Each level of Perch and Arduino Foundations plays its own music while the learner wires. The music is free to use (CC0).
- The learner can turn the music off. The browser keeps the choice.
- The level path shows a short description of the project.

---

**PR title:** Music in each level, and a description of each project on the level path

**PR body:**

closes #170

## What this does

- **Music.** Each level of Perch (5) and Arduino Foundations (4) plays its own loop while the learner wires. It starts when the learner presses Start, at a low volume. It stops over the level clip, "It's alive", the Build-it-for-me demo, and when the tab is hidden. A "Play music" switch under the task list turns it off, and shows the track name, the artist and the license.
- **Descriptions.** The level path shows the project name and a short description above the levels. The text is the new `description` field of `content/projects/<slug>.json`.

## The music (all CC0, from OpenGameArt.org)

| Level | Track | Artist |
| --- | --- | --- |
| Perch 1 | [Lofi again](https://opengameart.org/content/lofi-again) | omfgdude |
| Perch 2 | [Chill lofi inspired (loop edit)](https://opengameart.org/content/chill-lofi-inspired-loop-edit) | qubodup |
| Perch 3 | [Calm Ambient 1 (Synthwave 4k)](https://opengameart.org/content/calm-ambient-1-synthwave-4k) | cynicmusic |
| Perch 4 | [happy lofi day](https://opengameart.org/content/happy-lofi-day) | Tarush Singhal |
| Perch 5 | [Relaxed Robot Theme](https://opengameart.org/content/relaxed-robot-theme) | Nikke |
| Arduino 1 | [Napping on a Cloud](https://opengameart.org/content/napping-on-a-cloud) | congusbongus |
| Arduino 2 | [Chill (Loopable)](https://opengameart.org/content/chill-loopable) | Pro Sensory |
| Arduino 3 | [Bossa Nova](https://opengameart.org/content/bossa-nova) | Joth |
| Arduino 4 | [Feel Good Summer Tune](https://opengameart.org/content/feel-good-summer-tune) | skrjablin |

CC0 needs no credit line. We show one all the same, under the switch.

## Tests

- `tests/music.test.ts`: the lookup finds the track of a level and gives null when there is none. Each level of each available project has a CC0 track, and its file is in `public/`.
- `tests/content.test.ts`: each available project has a description.
- One real change that makes a test fail: remove the Arduino level 4 entry from `content/music.json`.
- `npm run typecheck`, lint and `npm test` (64 files, 850 tests) pass.
- Browser check (temporary account, deleted after): on Perch level 1 the music plays after Start; the switch stops it and starts it again.

## Screens

- `prompts/level-music-screens/perch-level-1-music-switch.png`
- `prompts/level-music-screens/perch-map-description.png`
- `prompts/level-music-screens/arduino-map-description.png`

## Not checked

- Phone layout of the switch (the task list starts closed on a phone; the switch shows when it opens).
- Safari and Firefox.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnQFZZXYVYiNTukEjmr
