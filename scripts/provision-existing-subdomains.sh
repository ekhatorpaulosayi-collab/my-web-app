#!/usr/bin/env bash
#
# Phase 5 backfill: register every existing public *.storehouse.ng
# subdomain with the smartstock-v2 Vercel project so TLS certs are
# issued. Idempotent — re-running treats Vercel's "already exists"
# response as success.
#
# Pre-reqs:
#   - VERCEL_API_TOKEN exported in your shell (project-scoped to
#     smartstock-v2 under team pauls-projects-cfe953d7). Do NOT echo
#     this token, do NOT commit it.
#   - ~/.supabase-paystack-dburl readable.
#   - psql + curl on PATH.
#
# Reads subdomains live from the stores table (after Phase 4 backfill,
# this should be 15 rows incl. the already-registered "paulo"). The
# private store and any rows with NULL subdomain are excluded.

set -euo pipefail

: "${VERCEL_API_TOKEN:?Set VERCEL_API_TOKEN before running (project-scoped token)}"

PROJECT='smartstock-v2'
TEAM_ID='pauls-projects-cfe953d7'
APEX='storehouse.ng'
API="https://api.vercel.com/v10/projects/${PROJECT}/domains?teamId=${TEAM_ID}"

TMP_RESP="$(mktemp)"
trap 'rm -f "${TMP_RESP}"' EXIT

mapfile -t SUBS < <(
  psql "$(cat ~/.supabase-paystack-dburl)" -At -c \
    "SELECT subdomain FROM stores WHERE subdomain IS NOT NULL AND is_public = true ORDER BY subdomain;"
)

count="${#SUBS[@]}"
echo "Found ${count} subdomain(s) to register."

ok=0
already=0
fail=0

for sub in "${SUBS[@]}"; do
  name="${sub}.${APEX}"
  printf '→ %-50s ... ' "${name}"

  status=$(curl -sS -o "${TMP_RESP}" -w '%{http_code}' \
    -X POST "${API}" \
    -H "Authorization: Bearer ${VERCEL_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\"}")

  case "${status}" in
    200|201)
      echo "OK (registered)"
      ok=$((ok + 1))
      ;;
    409)
      echo "OK (already exists)"
      already=$((already + 1))
      ;;
    *)
      echo "FAIL (HTTP ${status})"
      cat "${TMP_RESP}"
      echo
      fail=$((fail + 1))
      ;;
  esac

  # Light rate-limit safety
  sleep 0.5
done

echo
echo "Summary: ${ok} newly registered, ${already} already existed, ${fail} failed."

if [ "${fail}" -gt 0 ]; then
  exit 1
fi
