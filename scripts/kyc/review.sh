#!/bin/bash
# scripts/kyc/review.sh — show one KYC submission's full review packet.
# Spec: docs/KYC_V1_SPEC.md §7.2
#
# Usage: ./scripts/kyc/review.sh <kyc_id>
# Output: decrypted BVN/NIN/phone, business details, bank-resolved name,
#         signed photo URL (5-min expiry).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <kyc_id>" >&2
  exit 1
fi
KYC_ID="$1"
validate_uuid "$KYC_ID"

row=$(psql_q "
  SELECT
    k.id, k.status, k.submitted_at, k.submission_count,
    decrypt_vendor_kyc_field(k.bvn_encrypted),
    decrypt_vendor_kyc_field(k.nin_encrypted),
    k.phone, k.business_category,
    COALESCE(k.cac_rc_number, ''),
    COALESCE(k.business_address, ''),
    COALESCE(s.business_name, '(unnamed store)'),
    k.selfie_url,
    COALESCE(ps.account_name, '(no subaccount row)'),
    COALESCE(ps.settlement_bank, ''),
    COALESCE(ps.account_number, '')
  FROM vendor_kyc k
  LEFT JOIN stores s ON s.id = k.store_id
  LEFT JOIN paystack_subaccounts ps ON ps.store_id = k.store_id
  WHERE k.id = '$KYC_ID';
")

if [ -z "$row" ]; then
  echo "ERROR: no KYC row found for $KYC_ID" >&2
  exit 1
fi

IFS='|' read -r id status ts sub_count bvn nin phone biz_cat cac biz_addr biz_name selfie_url bank_name bank_code bank_acct <<< "$row"

rel=$(relative_time "$ts")

echo "════════════════════════════════════════════════════════════════"
echo "  KYC REVIEW PACKET"
echo "════════════════════════════════════════════════════════════════"
echo "  kyc_id:           $id"
echo "  status:           $status"
echo "  submitted:        $rel  ($ts)"
echo "  submission #:     $sub_count"
echo
echo "  business name:    $biz_name"
echo "  business cat:     $biz_cat"
[ -n "$cac" ]      && echo "  CAC RC number:    $cac"
[ -n "$biz_addr" ] && echo "  business address: $biz_addr"
echo
echo "  ──── Identity (decrypted) ────"
echo "  BVN:              $bvn"
echo "  NIN:              $nin"
echo "  phone:            $phone"
echo
echo "  ──── Bank account (Paystack-resolved) ────"
echo "  resolved name:    $bank_name      ← does this match the photo ID?"
[ -n "$bank_code" ] && echo "  settlement bank:  $bank_code"
[ -n "$bank_acct" ] && echo "  account number:   $bank_acct"
echo
echo "  ──── Photo ────"

# Strip 'kyc-photos/' prefix from selfie_url (it's stored as full path
# but sign_url wants bucket + path separately).
photo_path="$selfie_url"
if [[ "$photo_path" == kyc-photos/* ]]; then
  photo_path="${photo_path#kyc-photos/}"
fi
if signed=$(sign_url "kyc-photos" "$photo_path" 300 2>/dev/null); then
  echo "  Photo URL (expires in 5 min): $signed"
else
  echo "  Photo URL: (signed URL generation failed — file may not exist in storage yet)"
  echo "  Raw path: $selfie_url"
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "  Next actions:"
echo "    ./scripts/kyc/approve.sh  $id  [notes]"
echo "    ./scripts/kyc/reject.sh   $id  <category>  [notes]"
echo "    ./scripts/kyc/freeze.sh   $id  [notes]"
echo "════════════════════════════════════════════════════════════════"
