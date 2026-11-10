#!/bin/bash
# Runs every migration on a throwaway local Postgres, then the group/RLS tests.
#   PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
# Needs a Postgres 15+ you can create databases on. Drops and recreates database "migration_test".
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists migration_test" -c "create database migration_test" >/dev/null
$P -d migration_test -f tests/baseline.sql
for f in migrations/*.sql; do
  # cron needs pg_cron/pg_net, which a plain Postgres doesn't have
  case "$f" in *_cron.sql) echo "skip $f"; continue;; esac
  echo "apply $f"; $P -d migration_test -f "$f"
done
$P -d migration_test -f tests/groups_rls_test.sql 2>&1 | grep -E "NOTICE:  ok|FAIL|ERROR|PASSED" | sed 's/.*NOTICE:  //'
