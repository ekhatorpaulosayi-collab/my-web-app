# Paystack Subaccounts — Debug & Operations

Companion to [PAYSTACK-SUBACCOUNTS-DESIGN.md](./PAYSTACK-SUBACCOUNTS-DESIGN.md). This file covers operational concerns for the Session 1 foundation: architecture, feature flags, deploy/rollback, error codes, log grep paths, and known operational gaps.

**Last Updated:** 2026-05-12
**Status:** Session 1 (foundation, mock-only). No live transactions go through this code yet. Cart.tsx still uses the legacy vendor-key flow. All four new RPCs (record_successful_payment, complete_subaccount_onboarding, approve_review, reject_review_and_freeze) are written but not yet deployed.

---

## 1. Architecture overview

### Money flow (storefront, Session 1 mock)

```
Customer → frontend → initiate-storefront-payment edge function
  → validates store + tier + subaccount + velocity + monthly cap
  → computes capped split (vendor + Storehouse + Paystack)
  → INSERTs orders + order_items + paystack_split_transactions
  → returns mock authorization_url (Session 5 replaces with real Paystack init)

Paystack (when wired in Session 5) → paystack-subaccount-webhook
  → HMAC verify (constant-time compare)
  → routes by event type:
    - charge.success → record_successful_payment RPC (atomic claim + update + velocity)
    - charge.failed  → inline claim + idempotent order/split UPDATEs
    - transfer.success → no-op for Session 1, Session 7 will handle
    - unknown → logged, marked processed
```

### Money flow (marketplace — not implemented)

Marketplace endpoint (`initiate-marketplace-payment`) is a deliberate stub that returns 503 (flag off) or 501 (flag on). Multi-vendor cart with Paystack Subaccount Splits is post-Session-1 work.

### State machines

**`orders.status`** (CHECK-constrained): `pending` → `paid` | `failed` → `refunded` | `partially_refunded`

**`paystack_split_transactions.status`** (CHECK-constrained): `pending` → `success` | `failed` | `disputed` | `refunded`

**`paystack_split_transactions.review_status`** (CHECK-constrained): `not_required` (no review needed) | `pending` (awaiting reviewer) → `approved` | `rejected`. The `approved↔rejected` transitions are explicitly refused at the RPC level (see §5).

**`stores.kyc_status`** (CHECK-constrained): `not_started` → `submitted` → `approved` | `rejected` | `frozen`. Note: `stores.frozen` boolean is a separate field; both can be true. See §10 "Frozen state duality."

### Trust boundaries

| Layer | Trust source | Notes |
|---|---|---|
| Frontend → edge function | None | Edge functions validate everything from request body |
| Customer → checkout | None | Anonymous endpoint; no auth, all validation server-side |
| Vendor → vendor endpoints | JWT in Authorization header | Verified via `admin.auth.getUser(jwt)` |
| Reviewer → reviewer endpoints | JWT + REVIEWER_USER_ID env var match | Hardcoded single reviewer; Session 3 replaces with `reviewers` table |
| Paystack → webhook | HMAC-SHA512 of raw body using PAYSTACK_SECRET_KEY | Constant-time compare to defeat timing attacks |
| Edge function → DB | Service role key | RLS bypassed; ownership checks done explicitly in code |

---

## 2. Feature flags

Both default OFF. Set per-environment via Supabase function secrets.

| Env var | Effect when ON | Effect when OFF (default) |
|---|---|---|
| `ENABLE_PAYSTACK_SUBACCOUNTS` | All Paystack edge functions accept requests | All Paystack edge functions return 503 `feature_disabled` |
| `ENABLE_MARKETPLACE` | `initiate-marketplace-payment` returns 501 not_implemented | `initiate-marketplace-payment` returns 503 feature_disabled |

```bash
supabase functions secrets set ENABLE_PAYSTACK_SUBACCOUNTS=true --project-ref yzlniqwzqlsftxrtapdl
supabase functions secrets list --project-ref yzlniqwzqlsftxrtapdl | grep ENABLE
```

Per-store override: `stores.paystack_subaccounts_enabled` boolean. Even with the global flag ON, a store with this column FALSE will get 412 `store_not_onboarded` from `initiate-storefront-payment`. This column is flipped to TRUE by the `complete_subaccount_onboarding` RPC at the end of vendor onboarding.

---

## 3. Edge function reference

What each function does post-rewrite. All seven functions live in `supabase/functions/`.

| Function | Auth | Gating | RPC called | Returns |
|---|---|---|---|---|
| `initiate-storefront-payment` | Anonymous | Feature flag, store onboarded, store not frozen, tier config, subaccount exists, velocity row exists, daily cap, monthly cap | None directly; reads state populated by `complete_subaccount_onboarding`. Three inserts NOT yet wrapped in transaction — see §10.11 | Mock auth URL + breakdown + customer_access_token |
| `paystack-subaccount-webhook` | HMAC (constant-time) | Feature flag, valid signature | `record_successful_payment` (charge.success only) | `{ok: true, ...rpc result}` or `{already_processed: true}` |
| `create-paystack-subaccount` | Vendor JWT | Feature flag, ownership, not frozen, KYC approved, 24h cooling passed | `complete_subaccount_onboarding` | Subaccount row + `reused` boolean + mock flag |
| `approve-transaction-for-fulfillment` | Reviewer JWT (REVIEWER_USER_ID match) | Feature flag, reviewer | `approve_review` | RPC envelope: ok + split_id + order_id + store_id + amount, or `{error: ...}` |
| `reject-transaction-and-freeze` | Reviewer JWT (REVIEWER_USER_ID match) | Feature flag, reviewer | `reject_review_and_freeze` | RPC envelope: ok + ids + `store_was_already_frozen` flag, or `{error: ...}` |
| `resolve-bank-account` | Vendor JWT | Feature flag, ownership, 10-digit account, 3-digit bank code | None | `{account_name, mock: true, persisted: false}` (Session 1 does NOT persist) |
| `initiate-marketplace-payment` | None | Feature flag (separate `ENABLE_MARKETPLACE`) | None | 503 (flag off) or 501 (flag on, not implemented) |

---

## 4. The four RPCs

All four follow the same pattern: `SECURITY DEFINER` + `SET search_path = public` + `REVOKE` for non-service-role callers. Each runs as one atomic Postgres transaction.

### 4.1 `record_successful_payment(p_reference, p_event_type, p_payload)`

**Called by:** `paystack-subaccount-webhook` on `charge.success` events.

**What it does:**
1. Atomic claim via `INSERT ... ON CONFLICT (paystack_reference, event_type) DO NOTHING` on `paystack_webhook_events`. If the row already existed, returns `{already_processed: true}`.
2. `UPDATE orders SET status='paid', paid_at=NOW() WHERE paystack_reference=p_reference AND status='pending'` (idempotent).
3. `UPDATE paystack_split_transactions SET status='success', settled_at=NOW()` (idempotent).
4. For each split row, `SELECT ... FOR UPDATE` on `vendor_velocity_limits` (serializes concurrent webhooks for the same vendor), then updates `current_day_volume_kobo` and `current_month_volume_kobo` with WAT-timezone-correct reset boundaries.
5. Marks `processed_at=NOW()` on the claim row.

**Why it's atomic:** every step rolls back together. If the velocity update throws, the claim is undone, so a retry can succeed.

**Returns:** `{ok: true}` or `{already_processed: true}`.

### 4.2 `complete_subaccount_onboarding(p_store_id, p_settlement_bank, p_account_number, p_account_name, p_mock_code)`

**Called by:** `create-paystack-subaccount` after auth/validation pass.

**What it does:**
1. **Optimistic fast path (no lock):** Reads `paystack_subaccounts` by `store_id`. If exists, returns `{reused: true, subaccount: ...}` without further writes. This is the common case — a vendor revisiting onboarding after partial completion. No lock is taken because if a concurrent caller is mid-insert, step 3's ON CONFLICT will catch it.
2. Computes WAT-correct day and month reset timestamps.
3. **Race-handling path:** `INSERT INTO paystack_subaccounts ... ON CONFLICT (store_id) DO NOTHING RETURNING *`. This handles the rare case where two requests passed step 1 simultaneously (both saw "no existing row") and both reached the insert. The unique constraint on `store_id` guarantees only one wins; the loser's `ROW_COUNT = 0` triggers a re-read and `{reused: true}` return.
4. `INSERT INTO vendor_velocity_limits (...)` with the new vendor's caps (₦200K/day, NULL monthly), `ON CONFLICT (store_id) DO NOTHING`.
5. `UPDATE stores SET paystack_subaccounts_enabled = TRUE, paystack_subaccount_id = <new id> WHERE id = p_store_id`.

**Why it's atomic:** if step 5 fails, no half-onboarded vendor state exists.

**Returns:** `{reused: <bool>, subaccount: <row>}`.

### 4.3 `approve_review(p_split_id, p_reviewer_id, p_notes)`

**Called by:** `approve-transaction-for-fulfillment`.

**What it does:**
1. `SELECT ... FOR UPDATE` on the split row (serializes concurrent approve calls).
2. State guards in order: `split_not_found` (404) → `review_not_required` (412) → `already_approved` (idempotent ok) → `cannot_approve_rejected` (409).
3. If state is `pending`: `UPDATE paystack_split_transactions SET review_status='approved', reviewer_id, reviewed_at, review_notes`.
4. `UPDATE order_items SET vendor_can_fulfill = TRUE WHERE order_id = ... AND store_id = ...` (store filter critical for marketplace; doesn't touch other stores' items on the same order).

**Why it's atomic:** the split status flip and the order_items flip are one transaction. Previously this had a stuck-state bug where step 1 succeeded but step 2 failed, leaving an approved split with no fulfillable items, and the idempotency check on retry short-circuited with `already_approved`.

**Returns:** `{ok: true, split_id, order_id, store_id, amount_total_kobo, already_approved?: bool}` or `{error: ...}`.

### 4.4 `reject_review_and_freeze(p_split_id, p_reviewer_id, p_reason)`

**Called by:** `reject-transaction-and-freeze`.

**What it does:**
1. `SELECT ... FOR UPDATE` on the split row.
2. State guards: `split_not_found` (404) → `review_not_required` (412) → `already_rejected` (idempotent ok) → `cannot_reject_approved` (409, refuses approved→rejected).
3. `SELECT ... FOR UPDATE` on the store row to determine if already frozen.
4. `UPDATE paystack_split_transactions SET review_status='rejected', reviewer_id, reviewed_at, review_notes`.
5. **If store was NOT already frozen:** `UPDATE stores SET frozen=true, frozen_at, frozen_reason, frozen_by`. **If already frozen, preserves the original freeze fields** — first freeze reason wins.
6. `UPDATE order_items SET vendor_can_fulfill = FALSE WHERE order_id, store_id`.

**Why it's atomic:** prevents the catastrophic "rejected but not frozen" stuck state where a known-fraudulent vendor stays operational.

**Returns:** `{ok: true, split_id, order_id, store_id, amount_total_kobo, store_was_already_frozen: <bool>, already_rejected?: bool}` or `{error: ...}`.

### 4.5 `decrypt_vendor_kyc_field(p_encrypted BYTEA)`

**Called by:** Session 2+ KYC review dashboard (not yet built). Not called by any Session 1 edge function.

**What it does:** Decrypts a BYTEA column from `vendor_kyc` (BVN, NIN, document scans) using the `vendor_kyc_key` secret from `vault.secrets`. Pgcrypto-based symmetric decryption.

**Access:** `SECURITY DEFINER` with the vault key access scoped inside the function. Callable only by `service_role`. REVOKE applied for PUBLIC/authenticated/anon.

**Failure mode:** Raises an error if `vault.secrets` does not contain `vendor_kyc_key`. Pre-deploy check is documented in the migration's leading comment block.

**Reference:** §3.5 of the design doc for the encryption-at-rest design.

---

## 5. Error codes catalog

The single most important section for 2am debugging. Every error any function or RPC can return.

### 5.1 Auth / gating

| Code | HTTP | Where | When | Recovery |
|---|---|---|---|---|
| `feature_disabled` | 503 | All Paystack functions | `ENABLE_PAYSTACK_SUBACCOUNTS != 'true'` | Set the env var via `supabase functions secrets set` |
| `server_misconfigured` | 500 | All | Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PAYSTACK_SECRET_KEY / REVIEWER_USER_ID | Check `supabase functions secrets list` |
| `unauthorized` | 401 | Auth'd functions | Missing/malformed `Authorization: Bearer <jwt>` header, or JWT verification failed | Re-authenticate; if persistent, JWT signing key may be wrong |
| `forbidden` | 403 | `create-paystack-subaccount`, `resolve-bank-account` | Authenticated user does not own the `store_id` | Caller passing wrong store_id; check frontend logic |
| `forbidden_not_reviewer` | 403 | Reviewer endpoints | Authenticated user's id ≠ REVIEWER_USER_ID | Check REVIEWER_USER_ID env var matches `auth.users.id` for the reviewer account |
| `no_signature` | 401 | Webhook | `x-paystack-signature` header missing | Caller isn't Paystack; check webhook URL configuration in Paystack dashboard |
| `bad_signature` | 401 | Webhook | HMAC of body ≠ provided signature | PAYSTACK_SECRET_KEY mismatch, OR body modified in transit (some proxies do this) |

### 5.2 Input validation

| Code | HTTP | Where | When | Recovery |
|---|---|---|---|---|
| `invalid_json` | 400 | All | Request body isn't valid JSON | Frontend serialization bug |
| `missing_fields` | 400 | `create-paystack-subaccount`, `resolve-bank-account` | One of store_id/business_name/settlement_bank/account_number missing | Frontend form validation gap |
| `missing_split_transaction_id` | 400 | Reviewer endpoints | Body missing the field | Frontend bug |
| `missing_freeze_reason` | 400 | `reject-transaction-and-freeze` | Reason field missing or empty/whitespace | Frontend form must require non-empty reason |
| `missing_event_or_reference` | 400 | Webhook | Paystack payload structure unexpected | Possibly a new event type with different schema; check raw payload in logs |
| `invalid_account_number` | 400 | `create-paystack-subaccount`, `resolve-bank-account` | Not exactly 10 digits | Nigerian accounts are 10 digits; reject earlier in frontend |
| `invalid_bank_code` | 400 | `resolve-bank-account` | Not exactly 3 digits | Bank codes are 3 digits (e.g., 058 for GTBank) |
| `invalid_settlement_bank` | 400 | `create-paystack-subaccount` | Empty or non-string | Frontend bug |
| `invalid_item` | 400 | `initiate-storefront-payment` | Cart item has bad shape (quantity ≤ 0, negative price, missing name) | Frontend cart validation gap |
| `invalid_notes_type` | 400 | `approve-transaction-for-fulfillment` | Notes field not a string | Frontend bug |
| `notes_too_long` | 400 | `approve-transaction-for-fulfillment` | Notes >2000 chars | Frontend should truncate or warn at the form level |
| `reason_too_long` | 400 | `reject-transaction-and-freeze` | Reason >2000 chars | Same |

### 5.3 Business state

| Code | HTTP | Where | When | Recovery |
|---|---|---|---|---|
| `store_not_found` | 404 | Multiple | `store_id` doesn't exist | Frontend cached a deleted store; clear cache |
| `store_not_onboarded` | 412 | `initiate-storefront-payment` | `paystack_subaccounts_enabled = false` | Vendor hasn't completed onboarding; route them to KYC flow |
| `store_frozen` | 412 | `initiate-storefront-payment`, `create-paystack-subaccount` | `stores.frozen = true` | Manual unfreeze required (no endpoint exists — see §10) |
| `kyc_not_approved` | 412 | `create-paystack-subaccount` | `stores.kyc_status != 'approved'` | Complete KYC first |
| `kyc_approved_at_missing` | 500 | `create-paystack-subaccount` | KYC status is approved but timestamp is NULL | Schema invariant violation — investigate how the row got into this state; manual fix required |
| `cooling_period_active` | 425 | `create-paystack-subaccount` | <24h since `kyc_approved_at` | Wait. Response includes `remaining_ms`. Override only for testing by manually backdating `kyc_approved_at` |
| `no_fee_config_for_tier` | 500 | `initiate-storefront-payment` | `platform_fee_config` table has no row for the vendor's tier | Seed data missing; check `platform_fee_config` table |
| `no_subaccount` | 412 | `initiate-storefront-payment` | Vendor has `paystack_subaccounts_enabled=true` but no `paystack_subaccounts` row | Data inconsistency; manual investigation |
| `velocity_row_missing` | 500 | `initiate-storefront-payment` | `vendor_velocity_limits` row absent | **Fail-closed by design.** Defense in depth. Investigate why onboarding didn't create the row. Manual recovery: INSERT a row with `daily_cap_kobo = 20000000`, current_day_resets_at = next WAT midnight |
| `daily_cap_exceeded` | 429 | `initiate-storefront-payment` | Current day volume + this txn > daily cap | Expected behavior; tell customer to retry tomorrow |
| `monthly_cap_exceeded` | 429 | `initiate-storefront-payment` | Free tier monthly cap hit | Customer cannot pay; vendor should upgrade tier |
| `zero_subtotal` | 400 | `initiate-storefront-payment` | Computed subtotal ≤ 0 | All items had price 0 or empty cart |

### 5.4 State machine refusals (from RPCs)

| Code | HTTP | Where | When | Recovery |
|---|---|---|---|---|
| `split_not_found` | 404 | Reviewer endpoints | Split id doesn't exist | Reviewer dashboard cached a deleted split |
| `review_not_required` | 412 | Reviewer endpoints | `requires_review = false` on the split | Reviewer should not have been offered this transaction; UI bug |
| `cannot_approve_rejected` | 409 | `approve-transaction-for-fulfillment` | Split is already rejected | Refused by design. Reopening requires a separate endpoint (Session 3+). |
| `cannot_reject_approved` | 409 | `reject-transaction-and-freeze` | Split is already approved | Refused by design. Post-approval recovery is refund+freeze, not reject. Build a `reverse-approval-and-refund` endpoint in Session 3+ when needed. |
| `already_approved` | 200 ok | `approve-transaction-for-fulfillment` | Idempotent retry path | No action needed; confirm the original approval succeeded |
| `already_rejected` | 200 ok | `reject-transaction-and-freeze` | Idempotent retry | Same |

### 5.5 Internal / infrastructure

| Code | HTTP | Where | When | Recovery |
|---|---|---|---|---|
| `rpc_failed` | 500 | Edge functions calling RPCs | Any unhandled error from the RPC | Check `detail` field for Postgres error; could be data corruption, FK violation, etc. |
| `claim_failed` | 500 | Webhook (non-success path) | Insert into paystack_webhook_events failed for non-conflict reason | Check the function logs for the underlying Postgres error |
| `in_progress` | 409 | Webhook (non-success path) | Another delivery just claimed the event but hasn't marked processed | Paystack will retry. If persistent, the original delivery may be hung; check function logs |
| `fee_math_drift` | 500 | `initiate-storefront-payment` | Sanity invariant check failed (customer_total ≠ vendor + storehouse + paystack) | Should be impossible; would indicate floating-point math escaped into kobo computation |
| `order_insert_failed` / `items_insert_failed` / `split_insert_failed` | 500 | `initiate-storefront-payment` | DB constraint violation | Check `detail` field for CHECK or FK constraint name |

---

## 6. Structured log grep guide

Every structured log emitted by the new code. Use these to debug from Supabase function logs.

| Log line | Function | Fires when | Useful fields |
|---|---|---|---|
| `webhook_processed` | webhook | Every successful event handling | eventType, reference, result |
| `webhook_claim_failed` | webhook | Insert failure on non-success events | reference, eventType, error |
| `webhook_unknown_event_type` | webhook | Event type Storehouse doesn't handle | eventType, reference (watch for chargeback events here — see §10) |
| `record_successful_payment failed` | webhook | RPC error on charge.success | reference, error |
| `subaccount_onboarded` | create-paystack-subaccount | Every successful onboarding | store_id, user_id, reused, mock |
| `complete_subaccount_onboarding failed` | create-paystack-subaccount | RPC error | store_id, error |
| `review_approved` | approve endpoint | Every successful approval | split_id, reviewer_id, order_id, store_id, amount_total_kobo, already_approved, notes_length |
| `approve_review rpc failed` | approve endpoint | RPC error | split_id, reviewer_id, error |
| `review_rejected_and_store_frozen` | reject endpoint | Every successful rejection | split_id, reviewer_id, store_id, order_id, amount_total_kobo, store_was_already_frozen, already_rejected, reason_length |
| `reject_review_and_freeze rpc failed` | reject endpoint | RPC error | split_id, reviewer_id, error |
| `vendor_notification_pending` | reject endpoint | First-time freeze (not retry, not re-freeze) | kind, store_id, reason, channel, session5 |
| `bank_account_resolve` | resolve-bank-account | Every resolve attempt | store_id, user_id, bank_code, account_number_last4, mock |

**Debugging recipe:** to trace a single transaction end-to-end, grep for the `paystack_reference` value across all log lines. To trace a single vendor's onboarding history, grep for the `store_id`.

---

## 7. Manual RPC invocation

For reproducing issues or running one-off recovery from Supabase SQL Editor. All RPCs are service-role only; run from the SQL Editor as the postgres role.

### record_successful_payment

```sql
-- Manually record a successful payment (e.g., replay a missed webhook).
-- The payload should mirror the structure Paystack sends; minimum required
-- fields for our handler are data.reference and data.amount (kobo).
SELECT public.record_successful_payment(
  'ord_abc123def456'::text,
  'charge.success'::text,
  jsonb_build_object(
    'event', 'charge.success',
    'data', jsonb_build_object(
      'reference', 'ord_abc123def456',
      'amount', 1025000,           -- ₦10,250 in kobo
      'currency', 'NGN',
      'status', 'success',
      'paid_at', NOW()::text
    )
  )
);
```

### complete_subaccount_onboarding

```sql
-- Manually complete onboarding for a store (use cautiously; bypasses cooling period)
SELECT public.complete_subaccount_onboarding(
  '<store_uuid>'::uuid,
  '058'::text,                  -- bank code
  '0123456789'::text,           -- account number
  'BUSINESS NAME LTD'::text,    -- account name
  'ACCT_xxx'::text              -- subaccount code
);
```

### approve_review

```sql
-- Manually approve a held transaction
SELECT public.approve_review(
  '<split_uuid>'::uuid,
  '<reviewer_uuid>'::uuid,
  'Manual approval: customer confirmed legitimate via phone'::text
);
```

### reject_review_and_freeze

```sql
-- Manually reject + freeze
SELECT public.reject_review_and_freeze(
  '<split_uuid>'::uuid,
  '<reviewer_uuid>'::uuid,
  'Manual rejection: stolen card pattern detected'::text
);
```

---

## 8. Deploy / rollback

### Deploy a single edge function

```bash
supabase functions deploy <function-name> --project-ref yzlniqwzqlsftxrtapdl
```

Functions: `create-paystack-subaccount`, `initiate-storefront-payment`, `paystack-subaccount-webhook`, `resolve-bank-account`, `approve-transaction-for-fulfillment`, `reject-transaction-and-freeze`, `initiate-marketplace-payment`.

### Apply migrations (in order)

Migrations must apply in numeric order:

1. `20260509_paystack_subaccounts_foundation.sql` — base tables (review pre-flight checks in the migration's leading comment block)
2. `20260510_record_successful_payment_rpc.sql` — webhook atomic RPC
3. `20260511_complete_subaccount_onboarding_rpc.sql` — onboarding atomic RPC
4. `20260512_approve_review_rpc.sql` — reviewer approval RPC
5. `20260513_reject_review_and_freeze_rpc.sql` — reviewer rejection RPC

```bash
supabase db push --project-ref yzlniqwzqlsftxrtapdl
```

### Rollback

Migrations are purely additive. Approximate rollback SQL (run inside a transaction):

```sql
BEGIN;

-- Drop the four RPCs first (no dependencies)
DROP FUNCTION IF EXISTS public.reject_review_and_freeze(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.approve_review(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.complete_subaccount_onboarding(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_successful_payment(TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.decrypt_vendor_kyc_field(BYTEA);

-- Drop tables in FK-safe order (CASCADE handles dependents)
DROP TABLE IF EXISTS public.vendor_velocity_limits CASCADE;
DROP TABLE IF EXISTS public.platform_fee_config CASCADE;
DROP TABLE IF EXISTS public.paystack_webhook_events CASCADE;
DROP TABLE IF EXISTS public.paystack_split_transactions CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.vendor_kyc CASCADE;
DROP TABLE IF EXISTS public.paystack_subaccounts CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Drop the columns we added to stores
ALTER TABLE public.stores
  DROP COLUMN IF EXISTS paystack_subaccount_id,
  DROP COLUMN IF EXISTS kyc_status,
  DROP COLUMN IF EXISTS kyc_submitted_at,
  DROP COLUMN IF EXISTS kyc_approved_at,
  DROP COLUMN IF EXISTS kyc_rejected_at,
  DROP COLUMN IF EXISTS kyc_rejection_reason,
  DROP COLUMN IF EXISTS frozen,
  DROP COLUMN IF EXISTS frozen_at,
  DROP COLUMN IF EXISTS frozen_reason,
  DROP COLUMN IF EXISTS frozen_by,
  DROP COLUMN IF EXISTS paystack_subaccounts_enabled;

COMMIT;
```

**Rollback safety:** as long as Cart.tsx hasn't been migrated to the new flow (Session 6), no production data lives in these tables. Rollback is non-destructive. If real transactions exist, do NOT roll back — work forward with a fix instead.

---

## 9. Common debug paths

Symptom → first thing to grep → likely cause → fix.

### "Storefront checkout returns 503"

- Grep: `feature_disabled` in function logs.
- Cause: `ENABLE_PAYSTACK_SUBACCOUNTS` env var off or unset on the function.
- Fix: `supabase functions secrets set ENABLE_PAYSTACK_SUBACCOUNTS=true`.

### "Webhook returns bad_signature"

- Grep: `bad_signature` in webhook logs.
- Cause: PAYSTACK_SECRET_KEY mismatch, OR webhook body modified in transit by a proxy.
- Fix: verify the secret key matches Paystack dashboard. If still failing, temporarily log the raw body and expected/received signatures, then remove the debug code before re-deploy.

### "Webhook returns in_progress (409)"

- Grep: `in_progress` in webhook logs.
- Cause: Paystack sent two webhook deliveries for the same event and they overlapped; the first claimed the row, the second saw an unprocessed claim.
- Fix: usually self-resolves — Paystack retries, the original delivery finishes marking processed, the retry sees `already_processed`. If persistent for the same reference >2 minutes, the first delivery may have hung; check function logs and consider manually marking `processed_at` in the SQL editor.

### "Vendor completes onboarding but can't sell"

- Grep: `subaccount_onboarded` for the store_id.
- Verify: `SELECT paystack_subaccounts_enabled, paystack_subaccount_id FROM stores WHERE id='<store_id>';` — should be TRUE and non-NULL.
- If TRUE/non-NULL but checkout still fails: check `SELECT * FROM vendor_velocity_limits WHERE store_id='<store_id>';` — must exist.
- Most common cause: RPC partial failure during onboarding. Re-run onboarding (the RPC is idempotent, returns `reused: true`).

### "initiate-storefront-payment returns velocity_row_missing (500)"

- Grep: `velocity_row_missing` in function logs.
- Cause: `paystack_subaccounts_enabled = TRUE` but no `vendor_velocity_limits` row exists. This is a defense-in-depth fail-closed condition.
- Fix: Investigate WHY the row is missing. Most likely cause is manual SQL deletion or a partial rollback. Recovery: INSERT a row manually with caps appropriate for the vendor's days_since_approval, or call `complete_subaccount_onboarding` with `reused`-path safety to populate it.

### "Customer sees monthly_cap_exceeded (429)"

- Cause: Free-tier vendor has hit the ₦500,000 monthly volume cap. Working as intended.
- Verify: `SELECT current_month_volume_kobo, current_month_resets_at FROM vendor_velocity_limits WHERE store_id='<store_id>';` and `SELECT tier_id FROM user_subscriptions WHERE user_id='<vendor_user_id>' AND status='active';`. Free tier triggers the cap; Starter and Pro do not.
- Fix: Vendor upgrades to Starter (₦5K/mo) or Pro (₦10K/mo). The cap lifts immediately on the next checkout because `platform_fee_config` is read per-request — no cache to invalidate, no waiting for next reset window.
- Edge case: if the vendor upgraded mid-month but `monthly_cap_exceeded` still fires, check that `user_subscriptions.status = 'active'` and `tier_id` correctly reflects the new tier. The check uses tier-derived `monthly_volume_cap_kobo` from `platform_fee_config`, not a vendor-row override.

### "Reviewer sees cannot_reject_approved (409)"

- Cause: Reviewer is trying to reject an already-approved transaction. **Refused by design.**
- Fix: Post-approval, the right workflow is refund + freeze. Session 1 doesn't have this; manual response is to (a) call Paystack to issue a refund via dashboard, (b) freeze the store via direct SQL UPDATE on `stores.frozen`. Session 3+ should ship a `reverse-approval-and-refund` endpoint.

### "Reviewer sees cannot_approve_rejected (409)"

- Same family of refusal. Reopening a rejection requires explicit decision-making and a separate endpoint (Session 3+).

### "Customer can't read their own order"

- Status: Session 5 problem. Customer-side reads use `customer_access_token` via `app.access_token` GUC. The mechanism for setting that GUC from the browser isn't shipped yet. Today only vendors can read.

### "Mock-named bank account showed up in bank_accounts"

- Cause: Earlier version of `resolve-bank-account` persisted mock data. Current version does NOT persist.
- Fix: `DELETE FROM bank_accounts WHERE resolved_account_name LIKE 'MOCK ACCOUNT -%';` See SESSION-2-MIGRATION-CHECKLIST.md.

### "Frozen store has conflicting state"

- See §10 "Frozen state duality" — `stores.frozen` boolean and `stores.kyc_status='frozen'` can both exist independently. Check both when investigating.

---

## 10. Known operational gaps (NOT YET IMPLEMENTED)

This section lists what the system explicitly does NOT do today. Read this before searching for code that doesn't exist.

### 10.1 Chargeback handling

**Status:** Not implemented. Paystack chargeback events (`charge.dispute.create`, `charge.dispute.remind`, `charge.dispute.resolve`) hit the webhook's unknown-event-type branch — they get logged via `webhook_unknown_event_type` and silently marked processed.

**Current workaround:** Monitor `webhook_unknown_event_type` logs for chargeback events. Respond manually via Paystack dashboard.

**Target session:** Session 5+ or pre-public-launch, whichever comes first. Hard threshold: before passing 20 paying merchants or any paid acquisition spend.

**Reference:** [CHARGEBACK-AND-SETTLEMENT-NOTES.md](./CHARGEBACK-AND-SETTLEMENT-NOTES.md).

### 10.2 Settlement delay

**Status:** Not implemented. Paystack subaccounts settle T+1 (next day) by default; no configurable delay per vendor.

**Risk:** A new vendor can fraudulently sell goods, settle T+1, withdraw, and disappear before chargebacks arrive 2–6 weeks later. Storehouse eats the loss.

**Current workaround:** None. Manual KYC for first 50 vendors mitigates but does not eliminate risk.

**Target session:** Same as 10.1. Recommended: tiered delays via Paystack API (T+7 for new vendors, T+2 after 30 days clean, T+1 after 90 days clean). Storehouse does NOT need an MMO license for this; Paystack holds the funds in the subaccount, Storehouse only configures the schedule.

**Reference:** [CHARGEBACK-AND-SETTLEMENT-NOTES.md](./CHARGEBACK-AND-SETTLEMENT-NOTES.md).

### 10.3 Vendor unfreeze

**Status:** No endpoint exists. Once a store is frozen (via `reject-transaction-and-freeze` or manual SQL), there is no programmatic way to unfreeze.

**Current workaround:** Direct SQL: `UPDATE stores SET frozen=false, frozen_at=NULL, frozen_reason=NULL, frozen_by=NULL WHERE id='<store_id>';`. No audit trail of the unfreeze action.

**Target session:** Session 3 with the `reviewers` table and `audit_log` table.

### 10.4 Velocity band transitions (cron)

**Status:** Vendors start at ₦200K/day. The locked decision says this should rise to ₦500K/day on day 8, and become unlimited on day 31. No cron exists to do this.

**Current workaround:** Manual SQL UPDATE on `vendor_velocity_limits.daily_cap_kobo` and `vendor_velocity_limits.days_since_approval`.

**Target session:** Session 5+.

### 10.5 WhatsApp vendor notifications

**Status:** Stub only. `vendor_notification_pending` log lines indicate where notifications should fire (currently only on first-time store freeze in `reject-transaction-and-freeze`). No actual WhatsApp delivery.

**Current workaround:** Monitor logs for `vendor_notification_pending` events and notify manually.

**Target session:** Session 5+.

### 10.6 Customer refund on rejection

**Status:** `reject-transaction-and-freeze` marks the split as rejected and blocks fulfillment, but does NOT refund the customer. The customer's money sits in Paystack with no automatic action.

**Current workaround:** Manual Paystack refund from the dashboard. Customer is not notified automatically.

**Target session:** Session 5+.

### 10.7 Reverse-approval workflow

**Status:** `cannot_reject_approved` (409) refuses approved→rejected transitions at the RPC level. Post-approval fraud discovery has no clean recovery path.

**Current workaround:** Manual Paystack refund + manual SQL freeze of the store.

**Target session:** Session 3+. A `reverse-approval-and-refund` endpoint should exist as a separate workflow with its own audit trail.

### 10.8 Reviewer scaling

**Status:** Hardcoded single reviewer via `REVIEWER_USER_ID` env var. Single point of failure for high-value transaction approval.

**Current workaround:** None. If the reviewer is unavailable, flagged transactions wait.

**Target session:** Session 3 with `reviewers` table. World-class systems use dual-control approval over a threshold; that's a Session 3+ enhancement.

### 10.9 Rate limiting on resolve-bank-account

**Status:** Not implemented. Endpoint accepts unlimited calls per user. In Session 2 when this calls real Paystack `/bank/resolve`, this enables account-number harvesting attacks AND incurs per-call Paystack costs.

**Target session:** Session 2, before live Paystack wiring.

### 10.10 Frozen state duality

**Status:** Schema accident. `stores.kyc_status` CHECK constraint includes `'frozen'` as a valid status, AND `stores.frozen` is a separate boolean. Both can be set independently. Migration is locked, so this stays.

**Current behavior:** `reject-transaction-and-freeze` sets `frozen=true` only. **No current code path sets `kyc_status='frozen'`.** The OR clause below is defensive against future drift, not current behavior. Code that needs to check "is this store frozen?" should still check both to be safe against manual SQL changes or future feature additions:

```sql
SELECT id FROM stores
 WHERE frozen = TRUE
    OR kyc_status = 'frozen';
```

**Target session:** Schema cleanup deferred indefinitely. Adopt the dual check as the operational discipline.

### 10.11 Inserts 9–11 in initiate-storefront-payment

**Status:** Three sequential inserts (orders, order_items, paystack_split_transactions) are NOT in a transaction. Partial failure leaves orphan orders or orders without ledger entries. Acceptable for Session 1 mock flow (no money moves); must be wrapped in a Postgres RPC before Session 5 wires real Paystack.

**Target session:** Session 5, before live Paystack init wiring.

### 10.12 charge.failed stuck claim

**Status:** Inline (non-RPC) claim for charge.failed events. If the order/split UPDATEs throw after the claim insert succeeds, `processed_at` stays NULL forever and retries return 409 `in_progress` indefinitely. Not a money-loss bug (failed payments don't move money), but a manual recovery if it happens: `UPDATE paystack_webhook_events SET processed_at=NOW() WHERE paystack_reference='<ref>' AND event_type='charge.failed' AND processed_at IS NULL;`

**Target session:** Session 5, refactor into `record_failed_payment` RPC mirroring `record_successful_payment`.

---

## 11. Pre-flight verification (HARD GATE on Session 4)

**Section 13.1 of the design doc** flags an open question: is Paystack's wholesale fee (1.5% in current model) computed on the customer's total amount, or on the subtotal? The Session 1 code assumes subtotal. If wrong, the fee math is off by 1.5% in either direction (overcharging customers or undercharging vendors).

**Session 4 must NOT ship without this verification documented in this section.** This is a hard gate, not advisory.

### Verification procedure

1. Read Paystack subaccount-split documentation.
2. Create a Paystack test-mode transaction with known inputs: ₦10,000 subtotal, free tier (Storehouse 1.0%, Paystack 1.5%, customer total ₦10,250).
3. Inspect the actual settlement breakdown in Paystack dashboard.
4. Reconcile against:
   - **Hypothesis A** (current assumption): wholesale fee = subtotal × 1.5% = ₦150
   - **Hypothesis B**: wholesale fee = amount × 1.5% = (₦10,250 × 1.5%) = ₦153.75

5. Document the result in this section. If Hypothesis B, update §2 and §4.2 of the design doc with the corrected closed-form (or iterative) computation. Update `initiate-storefront-payment` and `paystack_split_transactions` insert logic accordingly.

**Verification status:** ⏳ Not yet performed. Test mode access required.

### 11.1 Fee math rewrite (2026-05-28) — customer-absorbs + ₦100 flat

**What changed:**

F3 (`initiate-storefront-payment`) used to compute `paystack_take = subtotal × 1.5%` and **omitted Paystack's ₦100 flat fee entirely**. Real-world Paystack debits the customer's card for `amount × 1.5% + ₦100` (with the flat fee waived below ₦2,500). The old formula therefore undercharged whenever the customer total > subtotal, and missed the flat fee always above the threshold.

**New formula (locked decisions D1–D5 from Session 6 audit):**

- Customer absorbs Paystack fee (1.5% + ₦100 above ₦2,500). D1.
- Vendor absorbs Storehouse subscription fee — comes out of vendor's share. D2.
- Listed product price stays clean. D3.
- Cart.tsx displays `Subtotal / Card processing / Total`. D4.
- Same structure for all tiers; Storehouse rate varies (Starter 0.5%, Pro 0%). D5.

The customer total is derived via a closed-form algebraic identity that resolves the self-reference between paystack_take (percentage of customer_total) and customer_total (subtotal + paystack_take + flat):

```
customer_total × (1 − 0.015) = subtotal + flat
⇒ customer_total = (subtotal + flat) / 0.985
⇒ paystack_take = customer_total − subtotal
flat = (subtotal >= ₦2,500) ? ₦100 : 0
```

Storehouse take is independent: `min(subtotal × basis_points / 10000, cap_kobo)`, deducted from vendor's gross. Vendor net = `subtotal − storehouse_take`. `transaction_charge` sent to Paystack = `storehouse_take + paystack_fee`.

The `+ paystack_fee` is essential: per Paystack's main-slice-zero fallback (see §11.2), if `transaction_charge` is less than Paystack's actual fee the platform deducts the shortfall from the subaccount slice instead of the main slice — which would short the merchant. Setting `transaction_charge = storehouse_take + paystack_fee` guarantees the main slice exactly covers Paystack's fee. No `+N` pad is added; see §11.4 for the trade-off analysis and the rare sub-₦2,500 edge case.

**Worked examples (tier-independent customer/paystack portions verified live 2026-05-28):**

| subtotal_kobo | flat_kobo | customer_total_kobo | paystack_take_kobo |
|---:|---:|---:|---:|
| 50,000 (₦500)         | 0      | 50,761 (₦507.61)         | 761    |
| 249,900 (₦2,499)      | 0      | 253,706 (₦2,537.06)      | 3,806  |
| 250,000 (₦2,500)      | 10,000 | 263,959 (₦2,639.59)      | 13,959 |
| 300,000 (₦3,000)      | 10,000 | 314,721 (₦3,147.21)      | 14,721 |
| 2,500,000 (₦25,000)   | 10,000 | 2,548,731 (₦25,487.31)   | 48,731 |

Note the threshold jump: a ₦1 increase in subtotal at ₦2,500 causes a ~₦100 jump in customer_total. Expected — that's Paystack's flat fee structure.

**Smoke test result (2026-05-28, Paul's store ACCT_0gm1gv2bb6ue9z3 = Pro tier):**

```
POST /functions/v1/initiate-storefront-payment  subtotal_kobo=300000
→ subtotal_kobo: 300000
  customer_total_kobo: 314721
  paystack_take_kobo: 14721
  paystack_flat_kobo: 10000
  storehouse_take_kobo: 0          (Pro = 0bp)
  vendor_net_kobo: 300000          (Pro absorbs nothing)
  transaction_charge_kobo: 0
  requires_review: false
```

Matches the formula. `paystack_flat_kobo` is a new field in the breakdown response — frontend can display it separately if useful, but it's already included in `paystack_take_kobo`.

**Sanity invariant in F3:** `|paystack_take − round(customer_total × 0.015 + flat)| ≤ 1 kobo`. Tolerates `Math.round` error of up to 1 kobo. If it fails, F3 returns 500 `fee_math_drift` — fail closed rather than over/undercharge.

**Why we did NOT make FLAT_FEE_KOBO configurable** (despite `platform_fee_config.fixed_fee_kobo` existing in schema): Paystack's flat fee is a known constant. The schema column is dead. Adding config plumbing is overengineering for Phase 1. Schema cleanup deferred. See followup ticket.

### 11.2 Bearer policy — corrected interpretation (Session 8, 2026-05-29)

Per Paystack docs, the `bearer` parameter on `/transaction/initialize` defaults to `'account'` — i.e. the platform's main account bears the Paystack fee. F3 sends `bearer: 'account'` explicitly for clarity but this is the default.

However, when a subaccount transaction is involved, Paystack applies an additional rule (support article 2132802): if the main account would receive a 0% or insufficient slice, Paystack falls back to deducting its fee from the subaccount. This is what made earlier spikes appear as if our `bearer` request was "overridden" — it wasn't; the main slice was simply too small to cover the fee.

The fix: ensure `transaction_charge` gives the main account a slice ≥ Paystack's actual fee. F3 now does this. See §11.4 for the trade-off analysis on the rare sub-₦2,500 edge case.

**Historical context (May 14 smoke test).** The earlier interpretation in this section was that Paul's subaccount had a server-side bearer override forcing fee onto the subaccount, and the fix was a manual Paystack dashboard flip. That was wrong. The May 14 smoke test sent `transaction_charge=0` (the pre-fix F3 always sent `storehouse_take`, which is 0 for Pro tier), which triggered the main-slice-zero fallback above. No dashboard action is or was required. The fix is entirely code-side.

### 11.3 §13.1 hard gate — STATUS: CLOSED (Session 8, 2026-05-29)

The §13.1 verification (whether Paystack's wholesale fee applies to `amount` or `subtotal`) is what the fee math rewrite codifies as **assumption: applies to `amount`** (which is why the closed-form has `(1 − rate)` in the denominator and not just `× rate` on subtotal).

Closed by Session 8 spikes against a fresh test-mode subaccount `ACCT_0vcfd1ifmwwwl0o`. All charges used Paystack test card `4084 0840 8408 4081`. The verify-API `fees_split` was the source of truth (no dashboard receipt comparison needed — `fees_split.paystack` is the exact value the dashboard shows under "Fee").

| Charge ref         | Tier    | subtotal | amount  | tx_charge | paystack | subaccount | integration | bearer        | Result |
|--------------------|---------|---------:|--------:|----------:|---------:|-----------:|------------:|---------------|--------|
| `zqd488sxbshceww`  | Pro     |  300,000 | 314,721 |    14,721 |   14,721 |    300,000 |           0 | account       | Phase 2B baseline — no pad, exact match |
| `8t3nqini3w07al7`  | Starter |  300,000 | 314,721 |    16,221 |   14,721 |    298,500 |       1,500 | account       | Phase 2C baseline — no pad, exact match |
| `wxwxo4upw42zag5`  | Pro     |   50,000 |  50,761 |       761 |      762 |     49,238 |      "761"  | subaccount    | Phase 2D — demonstrated the original bug; transaction_charge < paystack_fee triggers main-slice-zero fallback |
| `xbmcosfdxorr82z`  | Pro     |   50,000 |  50,761 |       762 |      762 |     49,999 |           0 | account       | Phase 2.5 +1 pad — bearer fixed; 1 kobo merchant shortfall on this edge case |
| `zktn723v3tg0n7p`  | Pro     |   50,000 |  50,761 |       763 |      762 |     49,998 |           1 | account       | Phase 2.6 +2 pad — revealed Paystack's actual slice algo (`subaccount = amount − transaction_charge`); confirmed +N pad cannot conjure customer money |

Verified: Paystack's wholesale fee applies to `amount` (not `subtotal`). The closed-form `customer_total = (subtotal + flat) / 0.985` is correct. The bug was structural in `transaction_charge`, not in the closed form.

**Phase 3E (pre-correction, +1 pad).** Charge ref `tqi0t3rm6nelg9i`. F3-issued init ref `ord_13e3186215fe4b819be59462bbe24d81`. Pro tier ₦3,000 sale via deployed F3 (with the abandoned +1 pad formula) against `ACCT_0vcfd1ifmwwwl0o`. `fees_split: paystack=14721, integration=1, subaccount=299999, params.bearer="account"`. This verification revealed the universal 1-kobo merchant skim caused by the +1 pad and motivated the Phase 3 correction (drop the pad).

**Phase 3F (final, no pad).** Charge ref `6vnvbt1v089pk0q`. F3-issued init ref `ord_8a9eab2c65384d1a8ffdeb1f7df3f03d`. Pro tier ₦3,000 sale via deployed F3 (final formula `transaction_charge = storehouse_take + paystack_fee`) against `ACCT_0vcfd1ifmwwwl0o`. `fees_split: paystack=14721, integration=0, subaccount=300000, params.bearer="account"` — merchant clean. Exact match.

### 11.4 Rounding precision on transaction_charge

F3 derives `paystackTakeKobo` using `Math.round` on the closed-form `customer_total` formula. Paystack's actual fee uses ceil-like rounding. On the vast majority of transactions these agree, and the merchant subaccount receives `subtotal − storehouse_take` exactly clean (verified by Phase 2B Pro ₦3,000 → subaccount 300,000 clean; Phase 2C Starter ₦3,000 → subaccount 298,500 clean).

On rare sub-₦2,500 edge transactions (where the flat ₦100 fee doesn't apply, so the rounding direction matters), Paystack's actual fee can exceed F3's prediction by 1 kobo. In that case Paystack falls back to `bearer="subaccount"` semantics and the merchant subaccount is short by 1 kobo (₦0.01). Operationally negligible; documented honestly.

A future "merchant always whole" fix exists: change F3's `paystackTakeKobo` to `Math.ceil(customerTotalKobo × PAYSTACK_RATE + flatKobo)` and re-derive `customerTotalKobo`. This shifts the 1-kobo absorption from merchant to customer on the edge case. Deferred to a future session — current trade-off is accepted.

Paystack's slice algorithm (verified by Phase 2.6 spike, charge ref `zktn723v3tg0n7p`): `subaccount = amount − transaction_charge`; `integration = transaction_charge − paystack_fee`. No platform-funded pad can subsidize the subaccount — extra kobo on `transaction_charge` come out of the customer's `amount` and shift the slice from subaccount to integration. This is why Option 1's +1 pad was abandoned during Phase 3 review (Phase 3E charge `tqi0t3rm6nelg9i` showed every transaction losing 1 kobo to Storehouse's main slice, not the intended "clean merchant on normal txns").

---

## 12. Cross-references

| Doc | Purpose |
|---|---|
| [PAYSTACK-SUBACCOUNTS-DESIGN.md](./PAYSTACK-SUBACCOUNTS-DESIGN.md) | Architecture decisions, fee model, RLS policy design, Session-by-session plan |
| [CHARGEBACK-AND-SETTLEMENT-NOTES.md](./CHARGEBACK-AND-SETTLEMENT-NOTES.md) | Strategy note for chargeback handling and tiered settlement delay (Session 5+ work, hard threshold pre-public-launch) |
| [SESSION-2-MIGRATION-CHECKLIST.md](./SESSION-2-MIGRATION-CHECKLIST.md) | Pre-Session-2 mock data cleanup. Read BEFORE flipping ENABLE_PAYSTACK_SUBACCOUNTS=true in production |
| [CLAUDE.md](../CLAUDE.md) | Repo-wide invariants, deployment rules, emergency playbook |
