# Prompt log: Arduino Foundations walkthrough clips (issue #77, branch `Feature/ArduinoWalkthrough`)

1. Task from Hanif (issue #77, "Arduino Foundations levels have no walkthrough clip"). Rules for this work: work only on `Feature/ArduinoWalkthrough`; no new branch, issue or pull request; no merge; no dependency; no migration; no change to levels, tasks or boards in `content/projects/` or `content/boards/`; the recording script makes a temporary account with `SUPABASE_SECRET_KEY` and deletes it at the end; write nothing else to the live Supabase project; tests first (red, then green); ledger entry; ASD-STE100 docs.

   Claude read issues #77 to #80 on GitHub. #77 matches the task text. Claude read the docs, the ledger rows of #48, #49 and #57, `content/videos.json`, `scripts/record-videos.ts`, `lib/game/walkthrough.ts`, `lib/content/clips.ts`, `components/walkthrough/`, the level map page and the video tests. Claude checked the live database (read only): Arduino Foundations is `available` with 4 levels (4, 5, 3 and 5 tasks).

## Test scenarios (Given / When / Then)

- **S1. A Watch button on each level.** Given Arduino Foundations has levels 1 to 4 and each has an entry in `content/videos.json`. When the level map asks for the clips of the project (`loadLevelClips`). Then it gives a clip for positions 1, 2, 3 and 4, and the `video` of each clip is `arduino-foundations-<n>`. The map shows a Watch button for each clip.
- **S2. A locked level.** Given a learner who passed no level. When the map shows levels 2 to 4 as locked. Then each still has its Watch button, because the map gives a button to every level that has a clip, whatever its status (the code of #48 does not change).
- **S3. The clip opens by itself.** Given a level with a clip and `tasksDone` is 0. When the level opens. Then the clip opens. When the first task is done, a reload does not open it. The build view does this for any clip (code of #48 does not change); a clip now exists for Arduino, so it applies there.
- **S4. The video fallback.** Given a slow device (2 cores or less, or 2 GB or less) or a browser with no WebGL. When the clip opens. Then the clip player plays `arduino-foundations-<n>-phone.webm` or `-laptop.webm`. Each file must exist (a test) for this to work. `prefersVideo()` does not change.
- **S5. The clip follows the start list.** Given levels 2 and 3 start from the board of level 1 and level 4 starts from level 1 and the button of level 3. When the clips are made. Then the first step of each clip starts with 0, 2, 2 and 5 parts, and each clip ends on its finished board. Each step comes from a wiring task (the code step is not in the clip).
- **S6. A Perch level is not changed.** Given the Perch levels. When the clips load. Then Perch still has 5 clips with the videos `perch-1` to `perch-5`, and the intro video is still there.
- **S7. The files.** Given 4 new videos. When the video tests run. Then each video has a file at each size (8 new files), each of the 8 files is under 1 MB, each file has a video in `content/videos.json`, and the total is under 10 MB.

## Red and green

**Red (old code, tests only).** `npx vitest run tests/videos.test.ts tests/arduino.test.ts`: 4 failed | 38 passed (42 tests).
```
FAIL tests/arduino.test.ts > walkthrough clips > gives each Arduino level a clip with its recorded video, and does not change the Perch clips
FAIL tests/arduino.test.ts > walkthrough clips > starts level 2 and 3 from the board of level 1, and level 4 from level 1 and the button of level 3, and shows the wiring only
FAIL tests/videos.test.ts > the video files > has a video for each Perch level and each Arduino Foundations level, and the intro video
FAIL tests/videos.test.ts > videoSrc and levelVideo > finds the video of a level, and nothing for a level without one
```
Example: `arduino-foundations level 1: expected undefined to be defined`. S1, S5 and S7 (the video entries) fail before the content change. S2, S3, S4 and S6 are protected by the existing tests of #48 and #49, which pass.

**Found while recording (not in the first scenarios).** The first recording stopped: the clip window used the Perch bench for every clip, so the Arduino clip crashed (`Cannot read properties of null (reading 'x')`, the `uno-5V` hole is not on the Perch bench). S8 was added: each clip carries the bench of its project. Red: `tests/arduino.test.ts` "gives each clip the bench of its project" failed (1 failed | 29 passed). Fix: `Clip.bench` in `lib/game/walkthrough.ts`, set by `loadLevelClips`, used by `components/walkthrough/clip-player.tsx` (Perch bench if it is empty).

The first `npm run videos` also left a temporary account, because the browser did not start after the account was made. Hanif allowed the delete and a `CHROMIUM_PATH` setting; the script now starts the browser first, and makes the account inside the `try`.

**Green.** `npx vitest run`: 28 files, 403 tests pass. `npm run typecheck`, `npm run lint` and `npm run build` pass. 8 files in `public/videos/` (152 to 313 KB each; the tests check each is under 1 MB).

**Browser check** (production build, Chromium 1243, temporary account with the secret key; 12 of 12 checks pass; screenshots in `prompts/arduino-walkthrough-screens/`):
- 390 × 844 and 1280 × 800: 4 Watch buttons on the Arduino Foundations map, levels 2 to 4 locked. No sideways scroll.
- A locked level (level 3): the Watch button opens the 3D clip, and it plays to "Level 3".
- Level 1 opens its clip by itself at the start.
- No WebGL (`--disable-3d-apis`): the video `arduino-foundations-2-phone.webm` plays (`currentTime` 3.1 s, no error).
- Perch still has 5 Watch buttons. No page errors.
- Clean-up: 0 `jumper-videos-` accounts left after each run.
