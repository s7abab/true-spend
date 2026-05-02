#!/usr/bin/env bash
# Apply all SQL files under supabase/migrations/ in sorted order (0001, 0002, …).
#
# Usage (from repo root):
#   export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/postgres'
#   npm run db:migrate
#
# Supabase (session pooler URI, often port 5432 or 6543):
#   Dashboard → Project Settings → Database → Connection string → URI
#
# Notes:
# - 0001 is a full initial schema — run only on an EMPTY database, or use a fresh Supabase branch.
# - If your remote DB already has 0001 applied, prefer the Supabase CLI from repo root:
#     supabase login
#     supabase link --project-ref YOUR_PROJECT_REF   # ref is in Dashboard URL: …/project/<ref>
#     npm run db:push
#   Or paste new migration files only in Dashboard → SQL Editor.
# - "Seeding" default categories for all users is in 0002 (and signup defaults live in 0001 / 0003 handle_new_user).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your Postgres connection string, then rerun." >&2
  echo "Example: export DATABASE_URL='postgresql://postgres:SECRET@db.xxx.supabase.co:5432/postgres'" >&2
  exit 1
fi

shopt -s nullglob
files=( "$MIGRATIONS"/*.sql )
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No .sql files in $MIGRATIONS" >&2
  exit 1
fi

IFS=$'\n' sorted=( $(printf '%s\n' "${files[@]}" | sort) )
unset IFS

for f in "${sorted[@]}"; do
  echo "---- $(basename "$f") ----"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Done. Applied ${#sorted[@]} file(s)."
