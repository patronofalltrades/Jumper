# Prompt log: walkthrough video files (feature 15, issue #49)

1. "Work on issue 49, walkthroughvideo, branch: https://github.com/patronofalltrades/Jumper/tree/Feature%2FWalkthroughVideo Touch every documentation before working and wait for issue 48 to close before merging or implementing code"

   Claude read issue #49, issue #48 (the 3D replays that the videos record), CLAUDE.md, AGENTS.md, README.md, PLAN.md (row 15 of "Plan vs. Reality"), the PRD, the TRD, `schema.md`, the ledger and the prompt logs. Claude worked on `Feature/WalkthroughVideo`, the branch that Hanif made.

   Issue #48 is open, so Claude wrote no code. Claude asked Hanif the open question of #49: where the videos show (in the app, for the course, or both).

2. "add the playwright skill as dependency"

   Claude added `@playwright/test` 1.56.1 (exact version) to `devDependencies`, the same version as the Playwright on the cloud machine. The recording script uses it. No other code, because issue #48 is still open.

3. "issue 48 is merged", then the answers "Both", "Temp test account" and "Both sizes, 12 files"

   Claude checked that issue #48 was closed by PR #50, merged `main` into `Feature/WalkthroughVideo` (both sides of the ledger kept), and read the replay code of #48. Claude asked 3 questions: where the videos show, how the script reaches the level clips behind the log-in, and the sizes.

   Claude built:
   - `content/videos.json`: the 6 videos (intro and Perch levels 1 to 5), with a title and a caption each, and the 2 sizes (phone 390 × 844, laptop 1280 × 800).
   - Tests first (red), then the code (green): `tests/videos.test.ts` (12 tests). Each level that has a clip has a video, and each video has a level. Each video has a file at each size, and each file has a video. The total size is less than 10 MB. `prefersVideo()`, `videoSrc()`, `levelVideo()`, and the proxy lets a visitor open a video file.
   - `lib/content/videos.ts` and `prefersVideo()` in `lib/device.ts`.
   - `scripts/record-videos.ts` (`npm run videos`): makes a temporary account, opens each clip in Chromium at each size, starts it again from step 1, records it to the end board, and deletes the account. Playwright's own ffmpeg cuts the video to the board and the caption, and makes it small (VP8, 15 frames each second).
   - 12 files in `public/videos/`: 3.9 MB in total. Each video is 19 to 37 seconds.
   - The clip player: on a slow device (2 cores or less, or 2 GB of memory or less) or with no WebGL, the video of the clip plays in place of the 3D replay, the phone file on a phone. With reduced motion, the video does not play by itself.
   - `proxy.ts`: `.webm` files do not need a log-in. Before this, the proxy sent `/videos/…` to `/login`, so the video did not play (found in the browser check).
   - README: a table of links to the videos, and the steps to record them again.

   Checks: 254 tests, the type check, lint and the build pass. Browser check on the landing page (`next start`): a fast laptop keeps the 3D replay; a slow laptop and a slow phone (dark) play the right file; with reduced motion, the video waits for Play. No page errors, no sideways scroll.
