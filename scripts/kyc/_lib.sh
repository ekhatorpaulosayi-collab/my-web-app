#!/bin/bash
# Shared helpers for scripts/kyc/*.sh
#
# Source this file from each script. Provides:
#   - DBURL          ~/.supabase-paystack-dburl content
#   - SUPABASE_URL   from ./.env.local VITE_SUPABASE_URL
#   - SERVICE_KEY    from ./.env.local SUPABASE_SERVICE_ROLE_KEY
#   - psql_q "SQL"   run query, return result (no headers, pipe-delimited)
#   - sign_url BUCKET PATH [EXPIRES]  print full signed URL
#   - validate_uuid STR    exit 1 if not roughly UUID-shaped
#   - confirm "prompt"     y/N gate; exit 0 on yes, exit 1 on no
#   - relative_time TS     "2h ago" / "3d ago" / etc.

set -euo pipefail

# Resolve common config sources or die helpfully.
if [ ! -f .env.local ]; then
  echo "ERROR: ./.env.local not found. Run from the repo root (smartstock-v2/)." >&2
  exit 1
fi
if [ ! -f "$HOME/.supabase-paystack-dburl" ]; then
  echo "ERROR: ~/.supabase-paystack-dburl not found." >&2
  exit 1
fi

DBURL=$(cat "$HOME/.supabase-paystack-dburl")
SUPABASE_URL=$(grep '^VITE_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2-)
SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | head -1 | cut -d= -f2-)

if [ -z "$SUPABASE_URL" ]; then
  echo "ERROR: VITE_SUPABASE_URL not set in ./.env.local" >&2
  exit 1
fi
if [ -z "$SERVICE_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY not set in ./.env.local" >&2
  exit 1
fi

psql_q() {
  psql "$DBURL" -A -F"|" -t -c "$1"
}

# sign_url BUCKET PATH [EXPIRES_SECONDS]
# Prints the full signed URL on success. Exits non-zero on failure.
sign_url() {
  local bucket="$1"
  local path="$2"
  local expires="${3:-300}"
  local resp
  resp=$(curl -sS -X POST \
    "$SUPABASE_URL/storage/v1/object/sign/$bucket/$path" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"expiresIn\": $expires}")
  local signed
  signed=$(echo "$resp" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if "signedURL" in d:
  print(d["signedURL"])
else:
  print("ERROR:" + json.dumps(d), file=sys.stderr)
  sys.exit(1)
') || { echo "sign_url failed: $resp" >&2; return 1; }
  echo "$SUPABASE_URL/storage/v1$signed"
}

validate_uuid() {
  local s="$1"
  if ! [[ "$s" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    echo "ERROR: '$s' is not a valid UUID." >&2
    exit 1
  fi
}

confirm() {
  local prompt="$1"
  read -r -p "$prompt (y/N): " response
  case "$response" in
    y|Y|yes|YES) return 0 ;;
    *) echo "Aborted."; exit 1 ;;
  esac
}

# relative_time TIMESTAMP_STRING
# Crude "Nm ago" / "Nh ago" / "Nd ago" rendering using GNU date.
relative_time() {
  local ts="$1"
  if [ -z "$ts" ]; then
    echo "(unknown)"
    return
  fi
  local epoch_ts now diff
  epoch_ts=$(date -d "$ts" +%s 2>/dev/null) || { echo "$ts"; return; }
  now=$(date +%s)
  diff=$(( now - epoch_ts ))
  if [ "$diff" -lt 60 ]; then
    echo "${diff}s ago"
  elif [ "$diff" -lt 3600 ]; then
    echo "$(( diff / 60 ))m ago"
  elif [ "$diff" -lt 86400 ]; then
    echo "$(( diff / 3600 ))h ago"
  else
    echo "$(( diff / 86400 ))d ago"
  fi
}
