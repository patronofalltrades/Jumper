# PR title

Add walkthrough clips to the 4 Arduino Foundations levels

# PR body

closes #77

## User story

PLAN.md row 15 (Walkthrough video): As a new visitor or learner, I want to watch a short video in the app that shows how build mode works (place a wire, read the pop-up, press Check) and, at the start of each level, a short clip that shows what I build in that level, so that I know how to play and what comes next.

## Summary

- 4 entries in `content/videos.json` (`arduino-foundations-1` to `-4`), with a title and a caption in simple words. Each level now has a Watch button, also a locked level, and its clip opens by itself at the level start until the first task is done (the code of #48 and #49 did this for each level that has a video).
- 8 new WebM files in `public/videos/` (phone and laptop), 152 to 313 KB each. The clips show the wiring only. Level 2 and 3 start from the board of level 1, and level 4 from level 1 and the button of level 3 (the `start` list).
- **Bug found and fixed:** the clip window always used the Perch bench, so an Arduino clip crashed (`Cannot read properties of null (reading 'x')`). A clip now carries the bench of its project (`Clip.bench`); the window uses it. Test first (red, then green).
- `scripts/record-videos.ts`: the browser starts before the temporary account is made, so a failed start leaves no account. `CHROMIUM_PATH` can name a Chromium that is already on the machine.
- README: 4 new rows in the video table, and the `CHROMIUM_PATH` note.
- No migration, no change to levels or tasks.

## Testing scenarios

Given / When / Then in `prompts/arduino-walkthrough.md`.

| Scenario | Result |
| --- | --- |
| S1 Each Arduino level has a clip and a Watch button | Test: 4 clips, `video` is `arduino-foundations-<n>`. Browser: 4 buttons at 390 × 844 and 1280 × 800. |
| S2 A locked level has its Watch button, and the clip plays | Browser: level 3 is locked; its clip plays to "Level 3". |
| S3 The clip opens by itself at the level start | Browser: level 1 opens its clip at both sizes. |
| S4 The video fallback (no WebGL) | Browser (`--disable-3d-apis`): `arduino-foundations-2-phone.webm` plays. Test: each file exists. |
| S5 The clip follows the start list | Test: the clips start with 0, 2, 2 and 5 parts and end on the finished board. |
| S6 Perch is not changed | Test: 5 Perch clips, `perch-1` to `perch-5`. Browser: 5 Watch buttons. |
| S7 File sizes | Test: 2 files for each video, each Arduino file under 1 MB, all files under 10 MB. |
| S8 A clip carries its bench | Test (found while recording). |

**Red, then green.** Red (tests only, commit `f73ebfd`): 4 failed | 38 passed (`tests/videos.test.ts`, `tests/arduino.test.ts`). The bench test was red before the fix (1 failed | 29 passed). Green: 28 files, 403 tests pass. The type check, lint and build pass.

**Browser check** (production build, temporary account made with the secret key): 12 of 12 checks pass, no page errors, no sideways scroll. Screenshots in `prompts/arduino-walkthrough-screens/`.

**Account clean-up.** The first recording run left 1 temporary account (the browser did not start). Hanif allowed the delete; it was deleted. Each later run (the recording and the browser checks) deleted its account. At the end, 0 `jumper-videos-` accounts are left, and the app wrote nothing else to the live project. The Arduino levels were already in the live database (4 levels, 17 tasks); nothing was seeded.

**What a change would break.** If the bench of a project is not sent with its clip, the Arduino clip crashes again (S8 fails).

**What occurred (bug):** the first recording stopped at "Step 5 of 5". The cause was the Perch bench in the clip window. Claude found it with a probe page error, and fixed it as above.

No migration, no change to levels or tasks.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Sp9FnMNnYxq7E1TTXCThkT
