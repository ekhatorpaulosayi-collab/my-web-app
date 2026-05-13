# Session 2 Migration Checklist — Mock Data Cleanup

**Date written:** 12 May 2026
**Status:** Reference for the start of Session 2. Read this BEFORE wiring any live Paystack calls.

---

## Why this exists

Session 1 ships several edge functions as mock stubs. Each writes data that looks like real Paystack data but isn't. Before Session 2 enables live Paystack calls (by flipping ENABLE_PAYSTACK_SUBACCOUNTS=true with real PAYSTACK_SECRET_KEY in production), every mock data category below must be either purged or transitioned.

If this is skipped, mock data will silently flow into live transactions. The most dangerous case is mock subaccount codes in `paystack_subaccounts` — Paystack will reject calls that reference `ACCT_mock_xxx` codes, but the system won't know why until a real customer tries to pay.

---

## Mock data categories created in Session 1

### 1. `paystack_subaccounts` rows with `ACCT_mock_xxx` codes

**Source:** `create-paystack-subaccount/index.ts` writes `paystack_subaccount_code` as `'ACCT_mock_' + crypto.randomUUID().slice(0, 12)` for every Session 1 onboarding. `active = false` for all these.

**Risk if not handled:** Session 2 attempts to initiate real Paystack payments referencing these mock codes. Paystack returns 4xx errors. No money moves. Visible bug.

**Action for Session 2:**
- Decision: delete vs re-resolve. Recommended: re-resolve. The vendor's `settlement_bank` and `account_number` are still valid in the row; Session 2 can replay the real `/subaccount` Paystack call using those values and update the row's `paystack_subaccount_code` to the real one.
- Script: `UPDATE paystack_subaccounts SET active = false WHERE paystack_subaccount_code LIKE 'ACCT_mock_%';` then a small Node script that iterates and calls the live `/subaccount` endpoint.
- After re-resolution, set `active = true`.

### 2. `orders` and `paystack_split_transactions` rows with `paystack_reference` starting `ord_`

**Source:** `initiate-storefront-payment/index.ts` writes `paystack_reference = 'ord_' + crypto.randomUUID().replace(/-/g, '')` and returns a mock `authorization_url`. If anyone tested the flow in Session 1, there are `pending` orders that will never settle.

**Risk if not handled:** Stale pending orders bloat the orders table and look like real pending payments in any reporting.

**Action for Session 2:**
- `DELETE FROM paystack_split_transactions WHERE paystack_reference LIKE 'ord_%' AND status = 'pending';`
- `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE paystack_reference LIKE 'ord_%' AND status = 'pending');`
- `DELETE FROM orders WHERE paystack_reference LIKE 'ord_%' AND status = 'pending';`
- Note: real Paystack references start with `T_` or similar Paystack-assigned prefixes; the `ord_` prefix is a clean filter for Session 1 mocks. (Verify this prefix assumption against actual Paystack references before running.)

### 3. `bank_accounts` — NOT a concern

`resolve-bank-account` was updated in Session 1 to NOT persist mock data. The `bank_accounts` table should contain zero Session 1 entries. If any exist (from a pre-Session-1-final version of the function), purge with:
`DELETE FROM bank_accounts WHERE resolved_account_name LIKE 'MOCK ACCOUNT -%';`

### 4. `vendor_velocity_limits` — keep

These are real operational rows even in Session 1 (caps, reset timestamps, counters). They were created by the `complete_subaccount_onboarding` RPC with WAT-correct timestamps and zero volume. Session 2 inherits them as-is.

### 5. `paystack_webhook_events` — keep, but verify

Any rows in this table from Session 1 are either test events or from the never-fired webhook path. Inspect manually; if all rows are test events, purge. If any are real-looking, investigate before purging.

---

## Pre-Session-2 verification queries

Run these BEFORE flipping the feature flag and BEFORE applying the Session 2 migrations:

```sql
-- Count Session 1 mock subaccounts
SELECT COUNT(*) FROM paystack_subaccounts WHERE paystack_subaccount_code LIKE 'ACCT_mock_%';

-- Count Session 1 mock orders
SELECT COUNT(*) FROM orders WHERE paystack_reference LIKE 'ord_%' AND status = 'pending';

-- Count Session 1 mock bank_accounts (should be 0)
SELECT COUNT(*) FROM bank_accounts WHERE resolved_account_name LIKE 'MOCK ACCOUNT -%';

-- Verify no real-looking activity exists yet
SELECT COUNT(*) FROM paystack_split_transactions WHERE status = 'success';
SELECT COUNT(*) FROM paystack_webhook_events WHERE processed_at IS NOT NULL;
```

Expected values for a clean Session 1 → Session 2 transition:
- Mock subaccounts: matches the number of vendors onboarded in Session 1
- Mock orders: should be small (test transactions only)
- Mock bank_accounts: 0
- Successful splits: 0 (no real payments yet)
- Processed webhook events: 0 (no real webhooks yet)

---

## What this checklist does NOT cover

- Production environment variables (PAYSTACK_SECRET_KEY, REVIEWER_USER_ID, etc.) — that's a separate deploy checklist.
- The §13.1 transaction_charge base verification (amount vs subtotal) — that's a gate on Session 4, not Session 2.
- Feature flag flips — keep ENABLE_PAYSTACK_SUBACCOUNTS off until Session 2 wiring is fully tested in staging.

---

## Open questions for Session 2 start

- Are there any Session 1 mock entries in production that need migrating, or only in staging? (Likely only staging if Session 1 was never deployed.)
- Does Paystack `/subaccount` accept idempotency keys? If yes, the re-resolution script can be safely re-run.
- For mock orders with `status = 'pending'`: are any of them needed for testing in Session 2, or all safe to delete?
