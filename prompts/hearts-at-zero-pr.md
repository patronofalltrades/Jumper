closes #124

## User story
As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt. (PLAN.md row 5a)

When I lose my last heart, I want a clear message that tells me what occurs now and how to get my hearts back, so that a fail does not feel like a dead end.

## What changed
- `lib/game/hearts.ts`: new helper `outOfHearts(fails)`. It is true when `heartsLeft(fails) === 0`, so the fails 3, 7, 11… The refill rule is unchanged: the next fail after 0 hearts gives 3 hearts.
- `components/build/popups.tsx`: new `OutOfHearts` card. A fail that takes the last heart shows Volt (pose `oops`), the reason of the fail, "You lost your last heart. You have 0 hearts left.", and three buttons: "Watch the level clip", "Build it for me" and "Try again". The old "no hearts" text is removed from `heartsText`. The card gets `clip` and `onWatch` in `CheckProps`.
- `components/build/build-view.tsx`: passes the level clip and `() => setWatching(true)` to the Check card. This is the same opener as the Watch button in the header.
- `content/ui/build.json`: new `play.check.outOfHearts` (title, body, retry, retryNote, watch). The old `play.check.noHearts` line is removed. ASD-STE100.
- `tests/hearts.test.ts`: test for `outOfHearts` (red commit first).
- `prompts/hearts-at-zero.md`, `prompts/hearts-at-zero-pr.md`, `prompts/hearts-at-zero-screens/`: prompt log, this text, and browser check screenshots.

## How it was tested
Plain English: the test lists the fails 0 to 7 and checks which of them take the learner to 0 hearts. Only the fails 3 and 7 must say yes. A test of the old code cannot pass, because the helper does not exist yet.

- Red (`550fc29`): `vitest run tests/hearts.test.ts`: `1 failed | 2 passed (3)`. The failure: `outOfHearts` is not a function (the test calls it in `.map(outOfHearts)`).
- Green (`b92193f`): `vitest run tests/hearts.test.ts`: `3 passed (3)`. Full suite at the card commit (`37825b4`), and at the final commit (`4471a57`): `Test Files 46 passed (46)`, `Tests 630 passed (630)`.
- Typecheck (`npm run typecheck`): exit 0. Lint (`npm run lint`): exit 0.
- Browser, local only: a temporary route (removed before the commit) with placeholder Supabase values, in Chromium. Out-of-hearts card at 1280 x 800 and 390 x 844, and the normal card at 2 hearts for comparison. Screenshots in `prompts/hearts-at-zero-screens/`. No page errors. "Build it for me" opens its dialog. On a phone, the buttons first sat below the scrolling sheet; `4471a57` fixed that, and the buttons now stay at the bottom.
- A real change that makes the test fail: in `outOfHearts`, use `heartsLeft(fails) === 1` in place of `=== 0`, and the test fails on the fails 3 and 7.

## Choices for Hanif
1. "Try again" runs the Check again and keeps the refill rule. The card does not close, so the learner cannot fix the board from it. Should a fourth button "Fix the board" go on this card?
2. The Watch button and the Build button use the existing openers. Is the text "Watch the level clip" right, or do you want another name?
3. The body text says "You have 0 hearts left." Is that the wording you want, or should the card say "Out of hearts" only?
4. No attempt is saved differently and no migration was added. The card reads the fail count from the session, as the other cards do.

## Not checked
- The "Watch the level clip" button: the browser check used a stub clip, so it did not open the real clip. The button calls the same `setWatching(true)` as the header Watch button.
- "Build it for me" was checked only up to the dialog. The demo itself was not run here.
- The red and green screenshots for the Vitest test. The red and green output is in text above; no screenshot of the test runner was taken.
- Laptop and phone with a real level from the database: no Supabase project and no accounts were used. The fail count was set by the temporary route, not by a real Check.
- Dark mode of the new card.
- Real touch on a phone.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
