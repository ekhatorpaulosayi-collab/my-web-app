#!/bin/bash
# scripts/kyc/freeze.sh — HARD-reject a pending KYC submission.
# Spec: docs/KYC_V1_SPEC.md §7.2 + §7.3
#
# Usage: ./scripts/kyc/freeze.sh <kyc_id> [notes]
# Calls reject_kyc_review RPC with p_freeze=true, category=NULL.
# Merchant CANNOT resubmit. Requires double confirmation.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: $0 <kyc_id> [notes]" >&2
  exit 1
fi
KYC_ID="$1"
NOTES="${2:-}"
validate_uuid "$KYC_ID"

cat <<EOF
═══════════════════════════════════════════════════════════════
  WARNING — HARD REJECTION
═══════════════════════════════════════════════════════════════
  About to FREEZE KYC $KYC_ID.

  This is a HARD REJECTION — the merchant CANNOT resubmit. They
  will see "Unable to verify your account at this time. Please
  contact support." and must reach out to support.

  Use this only for confirmed fraud, suspicious patterns, or
  unverifiable identities. For "try again with a clearer photo"
  use reject.sh with category=photo_unclear instead.
═══════════════════════════════════════════════════════════════
EOF
read -r -p "Type 'FREEZE' (all caps) to confirm: " response
if [ "$response" != "FREEZE" ]; then
  echo "Aborted."
  exit 1
fi

if [ -z "$NOTES" ]; then
  notes_sql="NULL"
else
  esc=$(printf "%s" "$NOTES" | sed "s/'/''/g")
  notes_sql="'$esc'"
fi

result=$(psql "$DBURL" -A -F"|" -t -c "SELECT reject_kyc_review('$KYC_ID'::uuid, NULL, $notes_sql, true);" 2>&1) || {
  echo "ERROR: reject_kyc_review failed:" >&2
  echo "$result" >&2
  exit 1
}

echo
echo "✓ KYC frozen."
echo "  RPC returned: $result"
echo
echo "  Merchant cannot resubmit. They must contact support to recover."
