# Hanif's prompt

"start working on #122 to #127 in different subsessions using haiku 5.5"

Session task (issue #124, "Check: tell the learner what happens at zero hearts"), branch `feature/hearts-at-zero`, from main at 43eb02c:

- Build the out-of-hearts state on the failed Check card. Use Volt, say what occurred in simple words, and give three choices: "Try again", "Watch the level clip", "Build it for me".
- Add a pure helper with Vitest tests. Text in `content/ui/build.json`, in ASD-STE100.
- Do not change how attempts are saved. Do not add a dependency. Do not add a migration. Do not open a PR, an issue or a branch. Do not edit PLAN.md or ledger/LEDGER.md.

## Ledger notes

**What it does.** A fail that takes the learner to 0 hearts now shows an "Out of hearts" card. The card shows Volt (pose `oops`), the reason of the fail, and the line "You lost your last heart. You have 0 hearts left." Three buttons: "Try again" runs the Check again, "Watch the level clip" opens the level clip, and "Build it for me" opens the existing dialog from `components/build/build-for-me.tsx`. Under "Try again" the card says: "If this Check fails, you get 3 new hearts."

**Commits, in order.**
1. `550fc29` Red test: `tests/hearts.test.ts` imports `outOfHearts`, which does not exist yet.
2. `b92193f` Green: `outOfHearts(fails)` in `lib/game/hearts.ts`, true when `heartsLeft(fails) === 0`, so fails 3, 7, 11… The refill rule is unchanged.
3. `37825b4` `components/build/popups.tsx`: the out-of-hearts card (`OutOfHearts`), with the clip and `onWatch` passed in from `components/build/build-view.tsx`. `content/ui/build.json`: new `play.check.outOfHearts`. The old `play.check.noHearts` text is removed, because the new card replaces it.
4. `4471a57` Phone layout fix found in the browser check (see below), and the screenshots.

**Choices made (Claude).**
- "Try again" runs the Check. It does not close the card, so the learner cannot fix the board from this card. After a Try again that fails, the hearts show 3 and the normal card opens with "Fix the board". I kept the refill rule as the issue asked. A fourth button "Fix the board" would be a small change if Hanif wants it.
- The card reuses `BuildForMe` as it is. Its button and dialog keep their own text.
- The helper is named `outOfHearts`, as the issue suggested.

**Browser check and what it found.** A temporary public route under `app/s/hearts-check/` (the `/s/` prefix is public in `lib/auth/rules.ts`) rendered `PopupLayer` with a fake fail. The route, and the `.next/dev` output, were removed before the commits. First run on a phone: the buttons were below the fold of the 240 px sheet, because only the last child sticks at the bottom, and the last child was the note. Fixed in `4471a57`. Second run: no page errors, the card text matches the copy, and "Build it for me" opens its dialog.

**Not checked.** See "Not checked" in the PR text.

**Skills.** The task-observer skill named in CLAUDE.md is not in the list of skills available in this session, so I could not load it. Matt Pocock, Superpowers, and the other listed skills were not loaded either; the work was small and direct.
