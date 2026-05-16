#!/bin/bash
# scripts/kyc/list-pending.sh — list all pending KYC submissions.
# Spec: docs/KYC_V1_SPEC.md §7.2
#
# Usage: ./scripts/kyc/list-pending.sh
# Output: kyc_id, business_name, submitted age, submission_count
# Sorted oldest-first so reviewer processes the queue in order.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

if [ $# -gt 0 ]; then
  echo "Usage: $0  (no arguments)" >&2
  exit 1
fi

rows=$(psql_q "
  SELECT k.id, COALESCE(s.business_name, '(unnamed store)'),
         k.submitted_at, k.submission_count
  FROM vendor_kyc k
  LEFT JOIN stores s ON s.id = k.store_id
  WHERE k.status = 'submitted'
  ORDER BY k.submitted_at ASC;
")

if [ -z "$rows" ]; then
  echo "(empty queue)"
  exit 0
fi

printf "%-38s  %-32s  %-12s  %s\n" "KYC_ID" "BUSINESS_NAME" "SUBMITTED" "SUBMISSION#"
printf "%-38s  %-32s  %-12s  %s\n" "----------------------------------" "--------------------------------" "------------" "-----------"

count=0
while IFS='|' read -r kyc_id biz ts sub_count; do
  [ -z "$kyc_id" ] && continue
  rel=$(relative_time "$ts")
  printf "%-38s  %-32s  %-12s  %s\n" "$kyc_id" "${biz:0:32}" "$rel" "$sub_count"
  count=$(( count + 1 ))
done <<< "$rows"

echo
echo "Total pending: $count"
echo
echo "Next: ./scripts/kyc/review.sh <kyc_id>"
