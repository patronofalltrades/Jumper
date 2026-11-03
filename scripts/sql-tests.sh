#!/usr/bin/env bash
# Runs the SQL tests in supabase/tests/ on a throwaway local Postgres 16 (issue #134).
# Never point it at the live Supabase project: each test file makes its own database from the migrations.
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres scripts/sql-tests.sh            (all tests)
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres scripts/sql-tests.sh data_isolation
#
# It runs each test and gives the list of the tests that fail at the end.
set -euo pipefail
cd "$(dirname "$0")/.."

case "${PGHOST:-}" in
  ""|localhost|127.0.0.1|/*) ;;
  *) echo "PGHOST=$PGHOST is not local. This script runs only on a throwaway local Postgres." >&2; exit 1 ;;
esac

if [ "$#" -gt 0 ]; then names=("$@"); else
  names=(); for f in supabase/tests/*.sql; do n=$(basename "$f" .sql); [ "$n" = local-setup ] || names+=("$n"); done
fi

failed=()
for name in "${names[@]}"; do
  db="jumper_test_${name//[^a-z0-9_]/_}"
  PGOPTIONS="-c client_min_messages=warning" psql -q -d postgres -c "drop database if exists $db" -c "create database $db" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/tests/local-setup.sql >/dev/null
  for m in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$m" >/dev/null; done
  echo "== $name"
  if psql -q -v ON_ERROR_STOP=1 -d "$db" -f "supabase/tests/$name.sql"; then echo "PASS $name"; else echo "FAIL $name"; failed+=("$name"); fi
  psql -q -d postgres -c "drop database $db" >/dev/null
done
if [ "${#failed[@]}" -gt 0 ]; then echo "SQL tests that fail: ${failed[*]}" >&2; exit 1; fi
echo "All SQL tests pass: ${names[*]}"
