#!/bin/bash
# scripts/kyc/approve.sh — approve a pending KYC submission.
# Spec: docs/KYC_V1_SPEC.md §7.2 + §7.5
#
# Usage: ./scripts/kyc/approve.sh <kyc_id> [notes]
# Calls approve_kyc_review RPC. After success, reminds reviewer to
# manually verify the subaccount on Paystack's dashboard (Phase 1).

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

confirm "About to APPROVE KYC $KYC_ID. Continue?"

if [ -z "$NOTES" ]; then
  notes_sql="NULL"
else
  esc=$(printf "%s" "$NOTES" | sed "s/'/''/g")
  notes_sql="'$esc'"
fi

result=$(psql "$DBURL" -A -F"|" -t -c "SELECT approve_kyc_review('$KYC_ID'::uuid, $notes_sql);" 2>&1) || {
  echo "ERROR: approve_kyc_review failed:" >&2
  echo "$result" >&2
  exit 1
}

echo
echo "✓ KYC approved."
echo "  RPC returned: $result"
echo
echo "  NEXT: manually verify subaccount on Paystack dashboard:"
echo "    https://dashboard.paystack.com/#/subaccounts"
echo "  This is required before the merchant's first payout is released."
