# Prompts: TRD update (issue #79)

Branch: `Bug/TRDUpdates`. Issue: https://github.com/patronofalltrades/Jumper/issues/79

## Key prompt (Oct 27, 2026, task text from Hanif through the coordinating session)

Task for issue #79, "TRD does not match the app as built". Change only `docs/TRD.md`, in ASD-STE100, in the style of the TRD. Read the code to check each fact. Keep the section numbers. No code, content or migration changes, and no change to the live Supabase project. Write the test checks first (Given / When / Then), run them, and record the results. Write the PR text in `prompts/trd-update-pr.md`. Do not open the PR.

The GitHub issue text wins over the task text. Differences that Claude found:

- The issue says "the 4 migrations"; the task text says "all the migrations". The repository has 4 migration files, so both agree today.
- The issue says "If #10 (change email) is merged first"; the task text says "#78 (change email and delete account)". Issue #10 is not the change-email issue; #78 is. Claude used #78.
- The issue lists the missing routes but not `/play` (a route handler, the Build button of the dock). `/play` is in `app/`, so it is in section 4.

## Test scenarios (checks), written before the edit

Each check uses a small shell or Python script. The scripts are in the sections below. Run them from the repository root, with the helper `scripts-lib.sh` (below) in the same folder.

| # | Given | When | Then |
| --- | --- | --- | --- |
| 1 | The `app/` folder | The script lists each `page.tsx` and `route.ts`, and turns its folder into a route (route groups removed) | The route is in section 4, in backticks |
| 2 | The folders of the root, `content/` and `lib/`, and the files in `content/` and `lib/` | The script looks for each name in section 4.1 | Each name is in section 4.1 |
| 3 | `app/actions/*.ts` | The script lists each `export function` and `export async function` | Each name is in section 9 |
| 4 | The 4 migrations and `schema.md` | The script reads each column of each `create table` and `add column`, and each column of `schema.md` | Each column is in the row of its table in section 7. Section 7 names `record_attempt`, `JS001` and `avatar` |
| 5 | `tests/*.ts` and `supabase/tests/*.sql` | The script looks for each path in section 10 | Each file is in a row or a group. Section 10 says "Not built" for the Data isolation test |
| 6 | The branch after the edit | `git diff --stat origin/main` | Only `docs/TRD.md`, `prompts/trd-update.md`, `prompts/trd-update-pr.md` and `ledger/` files change |
| 7 | The branch after the edit | `npm ci`, `npm run typecheck`, `npm run lint`, `npx vitest run` | All four pass |

Control: each of checks 1 to 5 must fail on the old TRD (red) and pass on the new TRD (green).

## Results

| # | Old TRD (red) | New TRD (green) |
| --- | --- | --- |
| 1 routes | 7 routes missing | Pass: 15 of 15 routes found |
| 2 folders | 17 names missing | Pass: 34 of 34 names found |
| 3 actions | 4 actions missing (`sendPasswordReset`, `updatePassword`, `updateProfile`, `changePassword`) | Pass: 14 of 14 actions found |
| 4 columns | 5 columns or names missing | Pass: 121 of 121 found |
| 5 tests | 31 files missing | Pass: 31 of 31 files found, and the "Not built" text is there |
| 6 diff | — | See the end of this file |
| 7 commands | — | `npm ci`, `npm run typecheck` and `npm run lint` pass. `npx vitest run`: 28 files, 400 tests, all pass |

## Scripts

### scripts-lib.sh

```bash
# Cut one section of docs/TRD.md. Usage: section "## 4." "## 5."
section() { awk -v a="$1" -v b="$2" 'index($0,a)==1{on=1} index($0,b)==1{on=0} on' docs/TRD.md; }
```

### check 1: routes (`check1-routes.sh`)

```bash
#!/usr/bin/env bash
# Check 1: every page.tsx and route.ts under app/ is in section 4.
. scripts-lib.sh; sec=$(section "## 4." "## 5."); fail=0
for f in $(find app -name page.tsx -o -name route.ts | sort); do
  r=$(dirname "$f" | sed -E 's#^app##; s#/\([^)]*\)##g'); r=${r:-/}
  if grep -qF "\`$r\`" <<<"$sec"; then echo "ok   $r"; else echo "MISS $r"; fail=1; fi
done
exit $fail
```

### check 2: folders (`check2-folders.sh`)

```bash
#!/usr/bin/env bash
# Check 2: every folder of the root, content/ and lib/ (and the files in lib/ and content/) is in section 4.1.
. scripts-lib.sh; sec=$(section "### 4.1" "## 5."); fail=0
chk() { if grep -qE "(^|[^A-Za-z0-9_.-])$1/?([^A-Za-z0-9_.-]|$)" <<<"$sec"; then echo "ok   $2"; else echo "MISS $2"; fail=1; fi; }
for d in $(find . -maxdepth 1 -mindepth 1 -type d ! -name .git ! -name node_modules ! -name .next | sed 's#^\./##' | sort); do chk "$(sed 's/\./\\./g' <<<"$d")" "$d/"; done
for d in content/*/ lib/*/; do n=$(basename "$d"); chk "$n" "$d"; done
for f in content/*.json lib/*.ts; do n=$(basename "$f"); chk "$(sed 's/\./\\./g' <<<"$n")" "$f"; done
for f in proxy.ts; do chk "$(sed 's/\./\\./g' <<<"$f")" "$f"; done
exit $fail
```

### check 3: actions (`check3-actions.sh`)

```bash
#!/usr/bin/env bash
# Check 3: every exported function in app/actions/*.ts is in section 9.
. scripts-lib.sh; sec=$(section "## 9." "## 10."); fail=0
for n in $(grep -hoE "^export (async )?function [A-Za-z]+" app/actions/*.ts | awk '{print $NF}' | sort); do
  if grep -qF "\`$n\`" <<<"$sec"; then echo "ok   $n"; else echo "MISS $n"; fail=1; fi
done
exit $fail
```

### check 4: columns (`check4-columns.py`)

```python
#!/usr/bin/env python3
# Check 4: every column made by the migrations is in section 7 (table row), and every column of schema.md is too.
import re, glob, sys
trd = open("docs/TRD.md").read()
sec = trd[trd.index("## 7. Database schema"):trd.index("## 8. Key flows")]
cols = {}
for f in sorted(glob.glob("supabase/migrations/*.sql")):
    sql = open(f).read()
    for m in re.finditer(r"create table public\.(\w+) \((.*?)\n\);", sql, re.S):
        t = m.group(1)
        for line in m.group(2).split("\n"):
            line = line.strip()
            c = re.match(r"(\w+) (?:int|uuid|text|boolean|jsonb|timestamptz)\b", line)
            if c: cols.setdefault(t, set()).add(c.group(1))
    for m in re.finditer(r"alter table public\.(\w+)\s+add column (\w+)", sql):
        cols.setdefault(m.group(1), set()).add(m.group(2))
rows = {re.match(r"\| (\w+) \|", l).group(1): l for l in sec.split("\n") if re.match(r"\| (\w+) \| \w", l) and not l.startswith("| Table")}
fail = 0
for t, cs in sorted(cols.items()):
    row = rows.get(t, "")
    for c in sorted(cs):
        ok = re.search(rf"\b{c}\b", row) is not None
        print(("ok   " if ok else "MISS ") + f"{t}.{c}"); fail |= (not ok)
# schema.md column tables: first column of each row under a table heading
sch = open("schema.md").read()
for m in re.finditer(r"\*\*(\w+)\*\*[^\n]*\n\n\| Column", sch):
    t = m.group(1)
    block = sch[m.end():].split("\n\n")[0]
    for l in block.split("\n")[2:]:
        c = l.split("|")[1].strip()
        ok = re.search(rf"\b{c}\b", rows.get(t, "")) is not None
        print(("ok   " if ok else "MISS ") + f"schema.md {t}.{c}"); fail |= (not ok)
for fn in ["record_attempt", "JS001", "avatar"]:
    ok = fn in sec; print(("ok   " if ok else "MISS ") + f"section 7 names {fn}"); fail |= (not ok)
sys.exit(fail)
```

### check 5: tests (`check5-tests.sh`)

```bash
#!/usr/bin/env bash
# Check 5: every test file in tests/ and supabase/tests/ is in a row or group of section 10.
. scripts-lib.sh; sec=$(section "## 10." "## 11."); fail=0
for f in tests/*.ts supabase/tests/*.sql; do
  if grep -qF "$f" <<<"$sec" || { [ "$(basename $f)" = local-setup.sql ] && grep -qF "supabase/tests/local-setup.sql" <<<"$sec"; }; then echo "ok   $f"; else echo "MISS $f"; fail=1; fi
done
grep -q "Not built" <<<"$sec" && echo "ok   section 10 says the Data isolation test is not built" || { echo "MISS Data isolation status"; fail=1; }
exit $fail
```

## Facts that Claude checked in the code (not taken from the task text)

- Routes: `find app -name page.tsx -o -name route.ts` gives 13 pages and 2 route handlers (`/auth/callback`, `/play`). `app/manifest.ts` makes `/manifest.webmanifest`.
- Log-in rule: `proxy.ts` and `lib/auth/rules.ts` (`needsLogin`, `isVisitorPage`). The public paths are `/`, `/login`, `/signup`, `/forgot-password` and `/auth/callback`. `/reset-password` is not public.
- Schema: the 4 files in `supabase/migrations/`, and `schema.md`.
- Actions: the exports of `app/actions/*.ts`. `signUp` takes only the email and the password; the display name comes from the trigger.
- Tests: `tests/` (28 files), `supabase/tests/` (2 files), `eslint.config.mjs` (rule of #61), `.github/workflows/ci.yml` (no secrets, no SQL test, no Playwright).
- Found while checking, and put in the TRD: the app has no `getProjects`, `getLevel`, `listSnapshots`, `getSnapshot` or `getDashboardData` function, and no code sets a session to `abandoned`.

## Check 6: git diff --stat (before the commit)

```
 docs/TRD.md                       | 174 ++++++++++++++++++++++++++++----------
 ledger/LEDGER.md                  |   4 +
 ledger/raw/2026-10-27-96139437.md |  61 +++++++++++++
 prompts/trd-update-pr.md          |  66 +++++++++++++++
 4 files changed, 259 insertions(+), 46 deletions(-)
(prompts/trd-update.md: this file)
```

Pass: only `docs/TRD.md`, the two prompt files and `ledger/LEDGER.md` change (the hook may add a file in `ledger/raw/` with the commit).
