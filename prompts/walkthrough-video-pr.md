# PR text for issue #49 (Hanif opens the PR)

**Title:** Walkthrough videos: recorded files of the level replays, and a video fallback on slow devices

**Body:**

closes #49

As a new visitor or learner, I want to watch a short video in the app that shows how build mode works (place a wire, read the pop-up, press Check) and, at the start of each level, a short clip that shows what I build in that level, so that I know how to play and what comes next.

## What changed

- **12 video files** in `public/videos/`: the intro video and one video for each Perch level, at phone size (390 × 844) and laptop size (1280 × 800). WebM, 19 to 37 seconds each, 3.9 MB in total.
- **A recording script:** `npm run videos` (`scripts/record-videos.ts`). It records the 3D replays of #48 in Chromium with Playwright. Nobody records a level by hand. When the text or the wiring of a level changes, run it again (README has the steps).
- **The level clips need a log-in.** The script makes a temporary account with `SUPABASE_SECRET_KEY`, and deletes it at the end.
- **In the app:** on a slow device (2 cores or less, or 2 GB of memory or less) or in a browser with no WebGL, the clip window plays the video in place of the 3D replay. A phone gets the phone file. With reduced motion, the video does not play by itself.
- **For the course:** README has a table of links to all the videos, for Demo Day.
- **Names and captions** in `content/videos.json`.
- **`proxy.ts`:** a visitor can open `.webm` files without a log-in. Before, the proxy sent `/videos/…` to `/login`.
- **New dev package:** `@playwright/test` 1.56.1 (Hanif approved it).
- No database change.

## Tests

`tests/videos.test.ts` (12 tests): each level with a clip has a video and each video has a level; each video has a file at each size and each file has a video; the total is less than 10 MB; the choice between video and 3D; the file paths; the proxy lets a visitor open a video.

These are not one of the two required tests in PLAN.md section 4, so this PR has no red and green screenshots.

254 tests, the type check, lint and the build pass.

## Bug found during the work

- **What occurred:** the video did not play in the app. The proxy sent each `/videos/….webm` request to `/login`.
- **How it was found:** Claude's browser check showed a video with width 0 that did not play; `curl` showed a 307 redirect to `/login`.
- **How it was repaired:** `.webm` is now in the list of files that the proxy skips, with a test.

## Not in this PR

- A browser with no WebGL cannot open the landing page: the board that wires itself (#46) stops the page. This was there before this PR. The clip window would play the video, but the page stops first.

## How to check

1. Open `/` and select **Watch how**. On a normal laptop, the 3D replay plays.
2. In Chrome DevTools, open the console and run `Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 })`, then select **Watch how** again. The video plays.
3. Open https://jumper-inky-sigma.vercel.app/videos/intro-laptop.webm after the deploy. The video plays without a log-in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jc5Kn92c9XrkvtYqkLHXBM
