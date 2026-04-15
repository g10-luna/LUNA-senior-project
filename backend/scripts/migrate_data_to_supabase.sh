#!/usr/bin/env bash
# Copy row data from a source Postgres (e.g. local Docker) into Supabase.
# Schema must already exist on the target (alembic upgrade head).
#
# Usage:
#   export SOURCE_DATABASE_URL='postgresql://luna_user:luna_password@127.0.0.1:5432/luna_db'
#   export TARGET_DATABASE_URL='postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require'
#   ./scripts/migrate_data_to_supabase.sh
#
# Requires: pg_dump and psql (e.g. brew install libpq && brew link --force libpq)
#
# Notes:
# - Copies only schemas app and ops (not public.alembic_version).
# - user_profiles.id should match Supabase Auth user ids for those accounts to log in;
#   if you only had local test users, you may prefer to migrate books only or re-register.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP_FILE="${TMPDIR:-/tmp}/luna_app_ops_data.sql"

if [[ -z "${SOURCE_DATABASE_URL:-}" || -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL." >&2
  exit 1
fi

echo "Dumping data-only from source (schemas app, ops)..."
pg_dump "$SOURCE_DATABASE_URL" \
  --data-only \
  --schema=app \
  --schema=ops \
  --no-owner \
  --no-privileges \
  -f "$DUMP_FILE"

echo "Applying to target (Supabase)..."
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "Done. Rows copied. Verify in Supabase Table Editor (schemas app / ops)."
rm -f "$DUMP_FILE"
