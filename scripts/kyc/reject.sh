#!/bin/bash
# scripts/kyc/reject.sh — soft-reject a pending KYC submission.
# Spec: docs/KYC_V1_SPEC.md §7.2 + §7.3
#
# Usage: ./scripts/kyc/reject.sh <kyc_id> <category> [notes]
# Calls reject_kyc_review RPC with p_freeze=false. Merchant can resubmit.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

VALID_CATEGORIES=(
  photo_unclear
  photo_doesnt_show_id
  info_doesnt_match
  document_not_accepted
  more_info_needed
)

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "Usage: $0 <kyc_id> <category> [notes]" >&2
  echo "Valid categories:" >&2
  for c in "${VALID_CATEGORIES[@]}"; do echo "  - $c" >&2; done
  exit 1
fi
KYC_ID="$1"
CATEGORY="$2"
NOTES="${3:-}"
validate_uuid "$KYC_ID"

ok=0
for c in "${VALID_CATEGORIES[@]}"; do
  if [ "$c" = "$CATEGORY" ]; then ok=1; break; fi
done
if [ "$ok" -eq 0 ]; then
  echo "ERROR: invalid category '$CATEGORY'. Valid:" >&2
  for c in "${VALID_CATEGORIES[@]}"; do echo "  - $c" >&2; done
  exit 1
fi

confirm "About to REJECT KYC $KYC_ID with category '$CATEGORY'. Continue?"

if [ -z "$NOTES" ]; then
  notes_sql="NULL"
else
  esc=$(printf "%s" "$NOTES" | sed "s/'/''/g")
  notes_sql="'$esc'"
fi

result=$(psql "$DBURL" -A -F"|" -t -c "SELECT reject_kyc_review('$KYC_ID'::uuid, '$CATEGORY', $notes_sql, false);" 2>&1) || {
  echo "ERROR: reject_kyc_review failed:" >&2
  echo "$result" >&2
  exit 1
}

merchant_msg=$(psql_q "SELECT reviewer_notes_merchant FROM vendor_kyc WHERE id = '$KYC_ID';")

echo
echo "✓ KYC rejected (soft)."
echo "  RPC returned: $result"
echo
echo "  Merchant-facing message:"
echo "    $merchant_msg"
echo
echo "  Merchant can resubmit up to 5 times total."
