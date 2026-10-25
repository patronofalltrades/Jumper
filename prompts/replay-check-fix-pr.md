# PR text for issue #62 (Hanif opens the PR)

**Title:** Replay of a passed level: Check can fail, new session, no XP

**Body:**

closes #62

As a learner, at the end of each level I want to press Check and get a pass, or a specific reason it failed (short, reversed LED, wrong pin, missing ground), costing a heart, so that I learn from each mistake. Every Check is saved as an attempt.

## What was wrong

A learner passes level 1, opens it again, removes the 3V3 wire and presses Check. The app showed "Clean build! 100%". The browser keeps the session id of a level in localStorage. After a pass the session is completed, and `record_attempt` gave `{completed: true}` for it, also for a failed Check, and saved no attempt. `check.ts` then opened Level complete. Also, `updateSession` only changes a session that is in progress, so on a replay a counter change gave "We could not save your progress".

## What changed

- **Migration `20261024000000_replay.sql`** (new; the old ones do not change). `record_attempt` on a session that is not in progress raises the error `session closed` with the code `JS001`. It adds no attempt. A pass gives XP only when the user has no other completed session on the level (Hanif's decision, Oct 24: a replay gives no XP); a replay completes the session with `xp_earned` = 0. The function stays `security definer`, keeps the `auth.uid()` check, and has the same grants.
- **Server actions.** `recordAttempt` gives `closed: true` for `JS001`. `updateSession` gives `closed: true` when no session is in progress with that id.
- **`components/build/autosave.ts`.** On `closed`, the app forgets the old session id, starts a new session, saves the id in the browser and gives the hearts back. When a saved board is ready to check, the level asks the server at once if its session is still open, so a replay has its own time from the start.
- **`components/build/check.ts`.** On `closed`, the Check starts a new session and sends the attempt again, one time. Level complete opens only when the browser check passed and the server completed the session (`opensLevelComplete()` in `lib/game/check-flow.ts`).
- **Level complete for a replay** (Hanif's wording): the title is "Replay complete!" and the text is "No new XP. You got XP only on your first pass." A pass with 0 XP is a replay (`isReplay()` in `lib/stats/level-summary.ts`, with a test). Text in `content/ui/complete.json`.
- **No stray session.** `markCompleting()` marks a level before a passing Check is sent. A counter save that finds its session closed then does not start a new one. The Check itself starts the new session of a replay.
- `schema.md` says what changed. No new table, no new column, no new package.

## The tests

**Plain-English explanation.** Two tests guard the fix.

1. `tests/check-flow.test.ts` checks that **Level complete never opens for a Check that failed in the browser, even when the server says "completed"**, and that a closed session gets a new session and exactly one second try. This is the exact error of the bug.
2. `supabase/tests/record_attempt_replay.sql` runs `record_attempt` on a throwaway local Postgres: fail, fail, pass, then a failed Check on the completed session (must raise `session closed`, add no attempt), then a replay (fail is saved, pass completes with 0 XP and the profile XP does not change), an abandoned session, another user's session, a first pass of a second user (gets XP), and the grants.

**A real change that makes the test fail:** if `opensLevelComplete()` looks only at the server answer again (`return completed === true`), the Check of a broken replay opens Level complete, and the test "never for a failed browser check" fails.

**Red** (`npx vitest run tests/check-flow.test.ts` with that change):

```
 FAIL  tests/check-flow.test.ts > Level complete opens > never for a failed browser check, also when the server says completed (the replay bug of issue #62)
AssertionError: expected true to be false // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```

**Red** (SQL test on the old `record_attempt`, migrations without the new one). This is the proof from the audit:

```
ERROR:  a failed Check on a completed session gave {"fails": 0, "completed": true}
```

**Green** (the fix in place):

```
 Test Files  1 passed (1)
      Tests  6 passed (6)

NOTICE:  record_attempt replay test: all checks pass
```

## Checks

- `npm run lint`, `npm run typecheck`, `npx vitest run` (344 tests) and `npm run build`: pass. The build used placeholder Supabase values.
- The SQL test ran on a throwaway local Postgres 16 with the stub `auth` schema. Nothing ran on the live Supabase project.
- **Browser check** on a local production build of this branch, with the real Supabase project (migration applied) and a temporary account, deleted after (0 rows left): 24 of 24 checks pass. First pass of level 1: 130 XP. Broken replay (3V3 wire removed): a new session, the reason, 1 heart lost, an attempt saved, no Level complete. Replay pass: its own session, 0 XP, "Replay complete!", the time of the replay. A counter change on a replay: no "could not save" error. First pass of level 2: XP. Phone size (390 × 844): the broken replay fails. No page errors. Not checked: the Vercel app (not deployed yet).

## After the merge (Hanif)

1. The migration `supabase/migrations/20261024000000_replay.sql` is applied on the Supabase project (Hanif ran it in the SQL Editor: "migration successfully ran").
2. Replay check on the live app: pass level 1, open it again, remove the 3V3 wire, press Check. Expected: the reason, one heart less, and no Level complete. Then put the wire back and press Check: Level complete with the time of the replay and "0 XP".

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SksqVi7bB8uwkRbt9vVS2v
