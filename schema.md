# Database schema

This file lists each table in the Jumper database, its columns and its relations. It also compares the built schema with section 3 of [PLAN.md](PLAN.md).

- SQL test of `record_attempt`: [supabase/tests/record_attempt_replay.sql](supabase/tests/record_attempt_replay.sql). It runs on a throwaway local Postgres, with the stub in [supabase/tests/local-setup.sql](supabase/tests/local-setup.sql). Never run it on the live project.
- SQL test of `delete_my_account`: [supabase/tests/delete_my_account.sql](supabase/tests/delete_my_account.sql). It runs on the same local Postgres, as in the steps in the file. Never run it on the live project.
- SQL: [supabase/migrations/20261018000000_data_model.sql](supabase/migrations/20261018000000_data_model.sql) (tables), [supabase/migrations/20261018100000_level_check.sql](supabase/migrations/20261018100000_level_check.sql) (the `record_attempt` function), [supabase/migrations/20261019000000_profile.sql](supabase/migrations/20261019000000_profile.sql) (the profile character, and the profile columns that a user can change) [supabase/migrations/20261024000000_replay.sql](supabase/migrations/20261024000000_replay.sql) (`record_attempt` for a level that is played again) and [supabase/migrations/20261028000000_delete_account.sql](supabase/migrations/20261028000000_delete_account.sql) (the `delete_my_account` function)
- Content that fills the content tables: [content/projects/](content/projects/), loaded by [supabase/seed.ts](supabase/seed.ts) (`npm run seed`)
- Source of truth for the design: [TRD section 7](docs/TRD.md#7-database-schema)

## Tables

The database has eight tables. Three tables contain shared content. Five tables contain the data of each user.

### Content tables

All logged-in users can read these tables. The app cannot write to them. Only the seed script writes to them, with the secret key.

**projects**: one row for each project in the catalog.

| Column | Type | Notes |
| --- | --- | --- |
| id | int | Primary key, generated |
| slug | text | Unique. For example `perch` |
| title | text | |
| tagline | text | What the project teaches |
| board | text | For example `ESP32-S3` |
| status | text | `available` or `coming_soon` |
| position | int | Order in the catalog |

**levels**: the levels of a project, in sequence.

| Column | Type | Notes |
| --- | --- | --- |
| id | int | Primary key, generated |
| project_id | int | Foreign key → projects.id. Unique with position |
| position | int | 1, 2, 3… |
| title | text | |
| goal | text | |
| rules | jsonb | `{ require: [{a, b}], forbid: [{a, b, code, message}] }`. The level check reads it. |
| xp | int | Bonus XP for the level |

**tasks**: the tasks of a level, in sequence. Each task has one pop-up.

| Column | Type | Notes |
| --- | --- | --- |
| id | int | Primary key, generated |
| level_id | int | Foreign key → levels.id. Unique with position |
| position | int | 1, 2, 3… |
| kind | text | `place` or `wire` |
| instruction | text | What to do |
| popup_why | text | Why, shown in the pop-up |
| concept | text, nullable | Concept pop-up text, only when the task introduces an idea |
| target | jsonb | `{kind: "wire", a, b}` or `{kind: "place", part, id, zone}` |
| source_url | text | The source of the "why" |
| xp | int | XP for the task |

### User tables

Row-level security protects these tables. Each user can select, insert, update and delete only their own rows (`user_id = auth.uid()`; for profiles, `id = auth.uid()`). For profiles there is one more limit: a user can only read their row and change `display_name` and `avatar`. Only the sign-up trigger adds a profile, and only `record_attempt` changes `xp`.

**profiles**: one row for each account. A trigger adds the row when a user signs up. The migration also adds rows for accounts that existed before it.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key. Foreign key → auth.users.id |
| display_name | text, nullable | From sign-up data, or the part of the email before the @ |
| xp | int | Default 0. Only `record_attempt` changes it |
| avatar | text | The character of the profile picture: `volt`, `diode`, `pixel`, `servo` or `chip` (the ids in `content/ui/avatars.json`). Default `volt` |
| created_at | timestamptz | |

**sessions**: one sitting on a level.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | Foreign key → profiles.id |
| level_id | int | Foreign key → levels.id |
| status | text | `in_progress`, `completed` or `abandoned` |
| started_at | timestamptz | |
| ended_at | timestamptz, nullable | |
| tasks_done | int | |
| mistakes | int | |
| xp_earned | int | |

**attempts**: each push of Check.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | Foreign key → profiles.id |
| session_id | uuid | Foreign key → sessions.id |
| level_id | int | Foreign key → levels.id |
| passed | boolean | |
| mistake_type | text, nullable | Empty when the attempt passed. Else a forbid rule code (for example `short_power`, `reversed_led`), `missing_ground` or `wrong_pin` |
| created_at | timestamptz | |

**snapshots** (main item): a saved board.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | Foreign key → profiles.id |
| level_id | int | Foreign key → levels.id |
| session_id | uuid, nullable | Foreign key → sessions.id |
| title | text | Must not be empty |
| notes | text | |
| wiring | jsonb | The board: `{ "version": 1, "parts": [...] }`. The parts and wires use the same format as `content/boards/` (issue #23) |
| passed | boolean | |
| mistake_count | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | A trigger sets it at each edit |

**stars**: the snapshots that a user starred.

| Column | Type | Notes |
| --- | --- | --- |
| user_id | uuid | Primary key with snapshot_id. Foreign key → profiles.id |
| snapshot_id | uuid | Foreign key → snapshots.id |
| created_at | timestamptz | |

A user can star only their own snapshots. The policy checks this, because a foreign key check does not use row-level security.

The star button on the snapshot list and the snapshot page adds or removes a row (`toggleStar`, issue #40). The list reads `stars(snapshot_id)` with each snapshot, and the Starred view shows the snapshots that have a row.

**Where the sketch is saved (issue #58).** The Arduino sketch of a level has no column. The browser saves it with the board that the learner builds, in the same entry: `{ parts, base, progress, session, sketch: { code, passed } }` (`components/build/autosave.ts`). Thus a reload keeps the sketch, as it keeps the board. `passed` is true when the sketch did the goal after its last change; the level Check waits for it. The level Check still saves one row in `attempts`, and a sketch that does not do the goal saves nothing, so it does not cost a heart. The starter code, the goal and the hints are content in `content/sketches/<project>.json`, not in the `levels` table: the page reads the file, as it reads `content/boards/`.

The lab notebook search, filters and sort (`/snapshots`, issue #42) need no new column. One query reads the snapshots with `ilike` on `title` and `notes`, `level_id` and `passed` for the filters, and `created_at` or `mistake_count` for the sort. Row-level security gives each user only their own snapshots.

## Functions

**record_attempt**(session, passed, mistake_type, tasks_done, mistakes, task_xp) → `{ completed, fails }`. The level Check calls it (issue #25). It runs as its owner (`security definer`), because users cannot write `profiles.xp` (feature 17). It finds only the session of the user who calls it (`user_id = auth.uid()`), and it writes only that session, its attempt and the profile of that user.

- A failed Check: it adds one row to `attempts`, with the mistake type.
- A passed Check, in one transaction: it adds the attempt and sets the session to `completed` with `ended_at`. The session gets `xp_earned` = the task XP + the level XP + 10 XP when the session has no mistakes and no failed Check. Then it adds `xp_earned` to `profiles.xp`.
- Only the first pass of a level gives XP (issue #62). When the user has another completed session on the same level, a pass completes the session with `xp_earned` = 0 and does not change `profiles.xp`. The function locks the profile row first, so two passes at the same time cannot both be the first.
- A pass needs all the tasks of the level done. The task XP cannot be more than the sum of the task XP of the level.
- A Check on a session that is not in progress (`completed` or `abandoned`) raises the error `session closed` with the code `JS001`. It adds no attempt and changes nothing. Before issue #62, a completed session gave `completed: true`, also for a failed Check. The app starts a new session when it gets this code: a level that is played again has its own session.
- `fails` is the number of failed Checks in the session. The app shows hearts from it: 3 − fails, and at 0 hearts the next fail gives 3 new hearts. A new session starts with 0 failed Checks.

**delete_my_account**() → nothing. The "Delete my account" button of the profile page calls it (issue #78). It runs as its owner (`security definer`, with an empty `search_path`), because users cannot write to `auth.users`. It runs one statement: it deletes the row in `auth.users` where `id = auth.uid()`. It cannot delete the row of another user. The existing `on delete cascade` rules then remove the rows of `profiles`, `sessions`, `attempts`, `snapshots` and `stars`. The function does not delete from `profiles` directly, because users have no delete right on `profiles` (feature 17). A call with no user in the token deletes nothing. `anon` and `public` have no `execute` right; only `authenticated` has it. The app calls it with the user's own session, and never uses `SUPABASE_SECRET_KEY` for it. The same email can sign up again after the delete.

**updateSession** (a server action, not a SQL function) saves the counters of a session only while its status is `in_progress`. When no row agrees, it gives `closed: true`, and the app starts a new session.

## Relations

```mermaid
erDiagram
    projects ||--o{ levels : has
    levels ||--o{ tasks : has
    profiles ||--o{ sessions : starts
    profiles ||--o{ attempts : makes
    profiles ||--o{ snapshots : saves
    levels ||--o{ sessions : "played in"
    levels ||--o{ attempts : "checked in"
    levels ||--o{ snapshots : "saved at"
    sessions ||--o{ attempts : contains
    sessions |o--o{ snapshots : "saved from"
    profiles ||--o{ stars : gives
    snapshots ||--o{ stars : receives
```

- One project has many levels. One level has many tasks.
- One user has many sessions, attempts and snapshots. One session has many attempts.
- Users and snapshots have a many-to-many relation through stars.
- When an account is deleted, its profile and all its rows are deleted (cascade). When a snapshot is deleted, its stars are deleted. When a session is deleted, its snapshots stay, with an empty `session_id`.

## Comparison with PLAN.md section 3

| PLAN.md section 3 | Built | Why |
| --- | --- | --- |
| `users` table | `profiles` table, with `id` → `auth.users.id` | Supabase Auth keeps the accounts in `auth.users`. `profiles` adds our data to each account (TRD section 7). |
| `users.id` (text) | `profiles.id` (uuid) | Supabase account IDs are UUIDs. |
| — | `profiles.xp` (int) | The lobby shows the XP of the user. One column is faster than a sum of all sessions. |
| — | `profiles.avatar` (text) | The profile picture (PLAN.md feature 17, Plan vs. Reality). A learner selects one of 5 characters. The images are in `public/avatars/`. |
| `steps` table | `levels` table | The app and the PRD call them levels. |
| `step_id` columns | `level_id` columns | Same as above. |
| `projects.id`, `steps.id`, `tasks.id` (number) | int, generated | Same meaning. The database makes the numbers. |
| `rules`, `target`, `wiring` (text, JSON) | jsonb | Postgres can check and query jsonb. |
| — | `tasks.source_url` (text) | Each pop-up gives a source, so that the app does not teach an incorrect fact (PLAN.md section 7). |
| — | `levels.rules.forbid[].message` | The Mistake pop-up text is content, not code (house rule 7). |
| `snapshots.id`, `sessions.id`, `attempts.id` (text) | uuid | The database makes random IDs. |
| — | `snapshots.session_id` (uuid, nullable) | A snapshot can link to the session that made it (TRD section 7). |
| `wiring` as in TRD 6.3 (`boards`, `parts`, `wires`) | `{ version, parts }`, with wires as parts (`type: "wire"`) | The bench and `content/boards/` use this format. Thus the snapshot page opens the board with no conversion (issue #23). |
| `stars` | Same columns | Plus the rule that a user stars only their own snapshots. |
| Content "readable by everyone" | Readable by logged-in users only | All app pages need a log-in (issue #11). |
| `created_at` (date) | timestamptz | The dashboard needs the time, not only the date. |
| Hearts (PLAN.md section 2) | No column. Hearts come from the failed attempts of the session | One source of truth. A failed Check already saves an attempt (issue #25). |
| — (PLAN.md has no code step) | No column. The sketch of a level is saved in the browser with the board (`sketch: { code, passed }`). The code step content is in `content/sketches/` | PLAN.md section 3 says that the board in progress autosaves in the browser. The sketch is part of that work in progress, so it goes in the same place (Hanif's choice, issue #58). No migration is necessary. |
