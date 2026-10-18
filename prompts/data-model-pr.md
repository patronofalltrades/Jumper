# PR text: data model (feature 2)

**Branch:** `Feature/Database` → `main`
**Title:** Data model: tables, row-level security and seeded content

## Body (paste into the PR)

closes #11

**User story:** As the app, I want users, projects, steps, tasks, sessions, snapshots, attempts and stars tables with seeded project, level and task data, so that every feature has somewhere to store things.

### What changed

- `supabase/migrations/20261018000000_data_model.sql`: the 8 tables from TRD section 7 (profiles, projects, levels, tasks, sessions, attempts, snapshots, stars).
  - Row-level security: user tables are owner only (`user_id = auth.uid()`; profiles `id = auth.uid()`). Content tables are read only for logged-in users. The app cannot write to them.
  - A trigger adds a profile for each new account. The migration also adds profiles for accounts that already exist.
  - A user can star only their own snapshots.
  - `snapshots.updated_at` changes at each edit.
- `content/projects/`: one JSON file for each project. 6 catalog projects (Perch available, 5 "Coming soon"). Perch has 5 levels and 41 tasks. Each task has an instruction, a pop-up "why", an optional concept, a target and a source URL. Each level has `require` and `forbid` rules, with the Mistake pop-up text.
- `lib/content/`: Zod schema and loader for the content JSON.
- `supabase/seed.ts` (`npm run seed`): loads the content into projects, levels and tasks. It can run again without making copies (upsert on slug, project + position, level + position).
- `schema.md`: each table, its columns and relations, and a comparison with PLAN.md section 3.
- `tests/content.test.ts`: 15 Vitest tests. Each task has a target, a why and a source. Positions are 1, 2, 3… with no gaps. Each level requires exactly the wires that its tasks teach.
- README: database and seed steps. `.env.example`: `SUPABASE_SECRET_KEY`.

### Checks

- `npm run typecheck`, `npm run lint`, `npm test` (22 tests): pass.
- Red check: an empty "why" in one task makes the content test fail, with the exact task in the message.
- Database (Oct 18, after Hanif ran the migration in the SQL Editor: "Success. No rows returned"):
  - `npm run seed` ran two times. Both runs gave the same result, with no copies: 6 projects, 5 levels, 41 tasks.
  - Profiles: 2 rows for 2 existing accounts. The backfill worked.
  - User tables (sessions, attempts, snapshots, stars): empty, as expected.
  - Row-level security, logged out (publishable key): all 8 tables return 0 rows. An insert into `projects` is refused (`42501`).
  - Not tested yet: two logged-in users. The data isolation test (feature 12) covers this.

### Known limits

- Pin and part names (`esp.GPIO4`, `mic1.WS`, `bbA.+`) are a first draft. The board work (features 3 and 4) sets the final names.
- "Press Check" is not a task row. The level check is its own step.
- The source URLs were not opened from the cloud session (the network policy blocks some hosts).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WoDUchSj3atiDwNT136WXb
