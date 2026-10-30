#!/usr/bin/env bash
# Apply the release migrations on a fresh database. Fails if any file errors.
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/ci-schema-baseline.sql"
mapfile -t files < <(find "$ROOT/supabase/migrations" -maxdepth 1 -type f -name '202610*.sql' ! -name '20261025_04_advisor_hardening.sql' ! -name '20261025_04b_chat_policies_stage_b.sql' | sort)
if [[ ${#files[@]} -lt 28 ]]; then
  echo "expected the October migration set, found ${#files[@]}" >&2
  exit 1
fi
for file in "${files[@]}"; do
  base="$(basename "$file")"
  if [[ "$base" == 20261025_24_whatsapp_cron_pg_net.sql ]]; then
    available="$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net'")"
    if [[ "$available" != "1" ]]; then
      echo "SKIP $base (pg_net is not installed here; Supabase provides it)"
      continue
    fi
  fi
  echo "APPLY $base"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
echo "APPLY ci-live-constraints.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/ci-live-constraints.sql"
echo "MIGRATIONS_APPLIED ${#files[@]}"
