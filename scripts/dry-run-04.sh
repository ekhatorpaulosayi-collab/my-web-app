#!/usr/bin/env bash
# Load a schema-only dump into a throwaway LOCAL database, run
# 20261025_04_advisor_hardening.sql and 20261025_04b_chat_policies_stage_b.sql
# inside one transaction, then ROLLBACK.
#
# Those files contain their own BEGIN/COMMIT. This script strips those lines
# for the dry run only. It does not edit the migration files Paul runs.
#
# Usage:
#   supabase db dump --schema-only -f /tmp/storehouse-schema.sql
#   scripts/dry-run-04.sh /tmp/storehouse-schema.sql
#
# Never pass a production connection string. A Supabase host is refused.
# Set DRY_RUN_DATABASE_URL only for a local Postgres you can drop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:-}"

refuse_supabase() {
  case "$1" in
    *supabase.com*|*supabase.co*)
      echo "Refusing a Supabase URL. This dry run is local only." >&2
      exit 2
      ;;
  esac
}
refuse_supabase "${DRY_RUN_DATABASE_URL:-}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: scripts/dry-run-04.sh <schema-only.sql>" >&2
  echo "Make the dump with: supabase db dump --schema-only -f schema.sql" >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed. Install local Postgres, then run this again." >&2
  exit 2
fi

PSQL=()
cleanup() { true; }

if [[ -n "${DRY_RUN_DATABASE_URL:-}" ]]; then
  refuse_supabase "$DRY_RUN_DATABASE_URL"
  PSQL=(psql "$DRY_RUN_DATABASE_URL" -v ON_ERROR_STOP=1)
else
  if ! command -v createdb >/dev/null 2>&1 || ! command -v dropdb >/dev/null 2>&1; then
    echo "createdb/dropdb not found. Install local Postgres or set DRY_RUN_DATABASE_URL to a local database." >&2
    exit 2
  fi
  DB="storehouse_dry_04_$$"
  createdb "$DB"
  cleanup() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
  PSQL=(psql -v ON_ERROR_STOP=1 -d "$DB")
fi
trap cleanup EXIT

echo "Loading schema dump into the throwaway database..."
"${PSQL[@]}" -f "$DUMP"

BODY="$(mktemp)"
python3 - "$ROOT" "$BODY" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])

def strip_tx(path: pathlib.Path) -> str:
    kept = []
    for line in path.read_text().splitlines(True):
        if re.match(r'^\s*BEGIN\s*;\s*$', line, re.I):
            continue
        if re.match(r'^\s*COMMIT\s*;\s*$', line, re.I):
            continue
        kept.append(line)
    return ''.join(kept)

files = [
    root / 'supabase/migrations/20261025_04_advisor_hardening.sql',
    root / 'supabase/migrations/20261025_04b_chat_policies_stage_b.sql',
]
body = 'BEGIN;\n' + '\n'.join(strip_tx(p) for p in files) + '\nROLLBACK;\n'
out.write_text(body)
PY

echo "Running 04 and 04b inside one transaction, then ROLLBACK..."
"${PSQL[@]}" -f "$BODY"
rm -f "$BODY"
echo "Dry run finished. 04 and 04b were rolled back. Nothing was kept."
