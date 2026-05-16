# scripts/kyc — Reviewer Phase 1 tooling

Bash scripts for Paul to review KYC submissions in production. Phase 1
is manual: scripts run from the repo root, connect to production via
`psql`, and call the SECURITY DEFINER RPCs from step 3.

Spec: `docs/KYC_V1_SPEC.md` §7. Phase 2 replaces these with a web UI.

## Prerequisites

- Run from the repo root (`smartstock-v2/`). Scripts read `./.env.local`
  for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `~/.supabase-paystack-dburl` must exist (production DB connection
  string).
- `psql` and `python3` on PATH (used for query exec and JSON parsing).

## Workflow

1. **Notification.** Paul receives an email when a merchant submits
   (notify-reviewer-new-kyc edge function, step 7 of the spec).

2. **Triage the queue.**
   ```
   ./scripts/kyc/list-pending.sh
   ```
   Shows all `status='submitted'` rows, oldest first.

3. **Review one submission.**
   ```
   ./scripts/kyc/review.sh <kyc_id>
   ```
   Prints decrypted BVN/NIN/phone, business details, the
   Paystack-resolved bank account name, and a 5-minute signed URL
   for the selfie photo.

   The critical check: does the name on the photo ID match
   `bank_resolved_name`? If yes — approve. If no — reject with
   `info_doesnt_match` (or freeze if patterns look fraudulent).

4. **Take action.** Choose one:

   - **Approve.**
     ```
     ./scripts/kyc/approve.sh <kyc_id> [notes]
     ```
     Sets `vendor_kyc.status='approved'` and `stores.kyc_status='approved'`.
     **Reminds you to verify the subaccount on Paystack's dashboard**
     (manual click in Phase 1).

   - **Soft reject.**
     ```
     ./scripts/kyc/reject.sh <kyc_id> <category> [notes]
     ```
     Sets `status='rejected'`. Merchant can resubmit up to 5 times.

     Valid categories (per spec §7.3):
     - `photo_unclear` — photo too blurry
     - `photo_doesnt_show_id` — can't see face + ID together
     - `info_doesnt_match` — name on ID ≠ bank account name
     - `document_not_accepted` — wrong type of ID
     - `more_info_needed` — escalate to support email

   - **Hard reject (freeze).**
     ```
     ./scripts/kyc/freeze.sh <kyc_id> [notes]
     ```
     Sets `status='frozen'`. Merchant CANNOT resubmit; they must
     contact support. **Requires typing `FREEZE` (all caps) to confirm**
     because it's destructive — use only for confirmed fraud or
     unverifiable identities.

## After approval

Paystack-dashboard manual step (Phase 1):

1. Open https://dashboard.paystack.com/#/subaccounts
2. Find the merchant's subaccount by `account_name` or `account_number`
3. Click "Verify Subaccount"

Without this, the subaccount won't receive payouts even though our
DB says approved. Phase 2 will automate this via Paystack's
`/subaccount/verify` API.

## Files

| File | Purpose |
|---|---|
| `_lib.sh` | Shared helpers (env loading, signed URL, UUID validation, confirm prompts, relative time) |
| `list-pending.sh` | Show the review queue |
| `review.sh` | Full review packet for one submission |
| `approve.sh` | Approve (single confirmation) |
| `reject.sh` | Soft reject with category (single confirmation) |
| `freeze.sh` | Hard reject (double confirmation, type "FREEZE") |

## Conventions

- All scripts use `set -euo pipefail`.
- All accept arguments via positional params; print usage and exit 1 on
  misuse.
- All read service-role from `./.env.local` — no env vars need to be
  exported.
- Quoting note: when passing notes containing apostrophes, surround the
  whole notes arg in double quotes. Scripts escape single quotes for
  SQL safely.

## Why bash and not a web UI?

Phase 1 ships in a few hours of work. A web UI for one reviewer (Paul)
would take a session of its own. The bash scripts are the minimum
viable reviewer interface — they give Paul approve/reject/freeze
capabilities with confirmation prompts, signed-URL photo access, and
decrypted identity fields. Phase 2 builds the reviewer web page when
multiple reviewers or audit-trail requirements justify it.
