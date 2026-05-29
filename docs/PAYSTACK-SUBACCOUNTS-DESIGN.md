# Paystack Subaccounts — Design Doc

**Status:** Session 1 design only. No code yet. Awaiting approval before Step 3.
**Branch:** `feat/paystack-subaccounts` (rooted at `main` head `fc02ef4`).
**Production today:** `v1.2.3-stable` (`f676c37`). The design below does NOT touch production until Session 6.

**References:**
- `CLAUDE.md` — DEPLOYMENT RULES, EMERGENCY PLAYBOOK, schema invariants (TIMESTAMPTZ rule)
- `STOREHOUSE-DEBUG.md` — TEXT-vs-UUID `stores.user_id`, RLS patterns, naming conventions
- `docs/MARKETPLACE-INVENTORY-2026-05-08.md` — what already exists (orphan + live)

---

## 1. Goals (Session 1)

Build the **schema and edge-function skeleton** for routing storefront payments through Paystack subaccount splits — with NO live Paystack calls, NO impact on the existing flow, and NO changes to production today. Everything ships gated behind two feature flags (default OFF) so it can be deployed to Supabase and Vercel without affecting users.

The end state of Session 1:

- Database has all new tables, additive columns, RLS policies, and seeded fee config
- Edge functions exist at `/functions/v1/<name>` but return 503 when feature flag is OFF (default)
- Existing Cart.tsx → PaystackPop flow is **unchanged** and still serves customers via vendor's own Paystack key
- A new debugging skill file `PAYSTACK-DEBUG.md` documents the architecture for future sessions

This is foundation only. The cutover from "vendor's key" to "platform subaccount split" happens in Session 6.

---

## 2. Money flow (locked product decisions)

### Tier identifiers

The `subscription_tiers` table (per `supabase/migrations/20251205_subscription_tiers.sql:65-95`) seeds **lowercase string ids**: `'free'`, `'starter'`, `'pro'`, `'business'`. CLAUDE.md's reference to `'basic'` is a stale documentation artifact — the actual DB has `'starter'`. This design uses `'starter'` to match the production schema. (The `ai-chat/index.ts` edge function still has dead `tier === 'basic'` branches at lines 2832, 2871, 2921 that never fire — pre-existing inconsistency, not in scope to fix here.)

### Pricing table

**Per-tier pricing model.** Customer pays `subtotal + storehouse_take + paystack_take`, where the take amounts are computed BEFORE the customer total. The customer fee implied (Storehouse + Paystack) is what shows in the table below:

| Tier    | Subscription | Customer fee | Storehouse take | Paystack take | Free monthly cap |
|---------|--------------|--------------|-----------------|---------------|------------------|
| Free    | ₦0           | 2.5%         | 1.0% (100 bps)  | 1.5%          | ₦500,000         |
| Starter | ₦5,000/mo    | 2.0%         | 0.5% (50 bps)   | 1.5%          | unlimited        |
| Pro     | ₦10,000/mo   | 1.5%         | 0.0% (0 bps)    | 1.5%          | unlimited        |

**Per-transaction Storehouse fee cap:** ₦10,000 (1,000,000 kobo) across all tiers. If 1.0% of a Free-tier transaction would exceed ₦10,000, the actual Storehouse take is capped at ₦10,000. **Critically, the customer total must be derived from the *capped* take amounts, not the uncapped percentages** — see worked examples below.

**Wholesale rate is configurable.** If Paystack changes the underlying 1.5% wholesale rate, vendor-facing fees stay the same — Storehouse keeps the spread. The wholesale rate lives in `platform_fee_config.paystack_wholesale_bps`, not hard-coded.

**High-value transaction review.** Any transaction `≥ ₦500,000` (50,000,000 kobo) splits as normal but the vendor's `order_items.vendor_can_fulfill` is held at `false` until a reviewer approves. Threshold is configurable per tier.

**Velocity caps for newly-approved vendors:**
- Days 1–7: max ₦200,000/day
- Days 8–30: max ₦500,000/day
- Day 31+: no daily cap (subject to Free tier monthly cap)

**24-hour cooling period** after KYC approval before subaccount activates.

### Money flow worked examples

**Example A — Free tier, ₦10,000 sale (cap not hit)**

```
subtotal_kobo            = 1,000,000  (₦10,000)

paystack_take_kobo       = floor(1,000,000 × 150 / 10,000) =     15,000  (₦150)
storehouse_take_uncapped = floor(1,000,000 × 100 / 10,000) =     10,000  (₦100)
storehouse_take_kobo     = min(10,000, cap_kobo=1,000,000)  =     10,000  (₦100, cap not reached)

customer_total_kobo      = 1,000,000 + 15,000 + 10,000      =  1,025,000  (₦10,250)
vendor_net_kobo          = 1,000,000                                       (₦10,000)
```

Customer pays ₦10,250, vendor gets ₦10,000, Storehouse gets ₦100, Paystack gets ₦150. ✅

**Example B — Free tier, ₦5,000,000 sale (cap IS hit)**

This is the case that exposed the original bug. Without the cap-aware customer total, the vendor would receive a ₦40,000 windfall paid for by Storehouse.

```
subtotal_kobo            = 500,000,000  (₦5,000,000)

paystack_take_kobo       = floor(500,000,000 × 150 / 10,000) =  7,500,000  (₦75,000)
storehouse_take_uncapped = floor(500,000,000 × 100 / 10,000) =  5,000,000  (₦50,000)
storehouse_take_kobo     = min(5,000,000, cap_kobo=1,000,000) = 1,000,000  (₦10,000, CAP HIT)

customer_total_kobo      = 500,000,000 + 7,500,000 + 1,000,000 = 508,500,000  (₦5,085,000)
vendor_net_kobo          = 500,000,000                                         (₦5,000,000)
```

Customer pays ₦5,085,000, vendor gets ₦5,000,000, Storehouse gets ₦10,000 (capped), Paystack gets ₦75,000. ✅

If we had used the uncapped percentage in the customer-total formula instead — i.e. `customer_total = subtotal + subtotal × (paystack_bps + storehouse_bps_uncapped) / 10000 = ₦5,125,000` — the customer would pay ₦5,125,000 but Storehouse only receives ₦10,000 from the split. The remaining ₦40,000 would land in the vendor subaccount. **That's the bug the formula reordering fixes.**

**Implementation in Paystack call:**
- `subaccount` = vendor's `paystack_subaccount_code`
- `amount` = `customer_total_kobo`
- `transaction_charge` = `storehouse_take_kobo + paystack_take_kobo` (Storehouse take + Paystack fee — see PAYSTACK-DEBUG.md §11.2)
- Net to subaccount after Paystack's wholesale fee = `vendor_net_kobo`

The `+ paystack_take_kobo` term is essential. Paystack's main-slice-zero fallback (support article 2132802) deducts its fee from the subaccount if the main slice is less than the actual fee. Without it, on Pro tier (`storehouse_take = 0`) the main slice would be 0 and the merchant would silently absorb the Paystack fee.

**Note (Session 7+8 update).** Examples A and B above predate the customer-absorbs fee math (Session 7) and the corrected `transaction_charge` formula (Session 8). The current production formula is `customer_total = (subtotal + flat) / 0.985`, with `flat = ₦100` when `subtotal ≥ ₦2,500` else 0. Free tier is no longer offered (locked decision D5 — Starter and Pro only). The Pro/Starter examples below use the current formula and the current `transaction_charge`.

**Example C — Pro tier, ₦3,000 sale (current formula + transaction_charge fix)**

```
subtotal_kobo            = 300,000  (₦3,000)
flat_kobo                = 10,000   (₦100 — subtotal ≥ ₦2,500)
customer_total_kobo      = round((300,000 + 10,000) / 0.985)  = 314,721  (₦3,147.21)
paystack_take_kobo       = customer_total − subtotal           =  14,721
storehouse_take_kobo     = floor(300,000 × 0 / 10,000)         =       0  (Pro = 0bp)
vendor_net_kobo          = 300,000 − 0                         = 300,000

transaction_charge_kobo  = 0 + 14,721                          =  14,721  (SH take + Paystack fee)
```

Customer pays ₦3,147.21. Paystack deducts its ₦147.21 fee from the main slice of 14,721; Storehouse main account nets 0 (the slice exactly covers the fee — Pro's published 0% Storehouse take is honoured). Vendor subaccount receives `314,721 − 14,721 = 300,000` kobo (clean ₦3,000 — merchant whole). Verified live: see PAYSTACK-DEBUG.md §11.3.

**Example D — Starter tier, ₦3,000 sale**

```
subtotal_kobo            = 300,000  (₦3,000)
flat_kobo                = 10,000
customer_total_kobo      = 314,721
paystack_take_kobo       = 14,721
storehouse_take_uncapped = floor(300,000 × 50 / 10,000)        =   1,500  (₦15)
storehouse_take_kobo     = min(1,500, cap_kobo=1,000,000)      =   1,500
vendor_net_kobo          = 300,000 − 1,500                     = 298,500

transaction_charge_kobo  = 1,500 + 14,721                      =  16,221
```

Customer pays ₦3,147.21. Paystack deducts its ₦147.21 from the main slice of 16,221; Storehouse main nets `16,221 − 14,721 = 1,500` kobo (₦15.00 — exactly the published Storehouse take). Vendor subaccount receives `314,721 − 16,221 = 298,500` kobo (clean — merchant whole). Verified live: Phase 2C charge ref `8t3nqini3w07al7`. ✅

---

## 3. Schema (additive only)

### 3.1 New tables

#### `orders`

Authoritative order record. One row per checkout, regardless of how many vendors supplied items (`marketplace` order_type is multi-vendor; Session 1 only writes `storefront`).

```
id                       UUID PK DEFAULT gen_random_uuid()
customer_email           TEXT NOT NULL
customer_phone           TEXT NOT NULL
customer_name            TEXT  -- nullable
customer_access_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
                          -- Returned to the storefront customer in the initiate-storefront-payment
                          -- response. Customer presents this token (e.g. via URL param on the
                          -- order-status page) to read their own order. Unguessable; replaces
                          -- email-based RLS which would have required the customer to be logged in.
total_amount_kobo        BIGINT NOT NULL CHECK (total_amount_kobo > 0)
status                   TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','failed','refunded','partially_refunded'))
paystack_reference       TEXT NOT NULL UNIQUE
order_type               TEXT NOT NULL DEFAULT 'storefront'
                          CHECK (order_type IN ('storefront','marketplace'))
primary_store_id         UUID REFERENCES stores(id) ON DELETE NO ACTION
                          -- Required for storefront orders, NULL for marketplace
delivery_address         JSONB  -- nullable, free-form for now
notes                    TEXT
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
paid_at                  TIMESTAMPTZ
fulfilled_at             TIMESTAMPTZ

CHECK ((order_type = 'storefront' AND primary_store_id IS NOT NULL)
    OR (order_type = 'marketplace'))
```

#### `order_items`

```
id                       UUID PK DEFAULT gen_random_uuid()
order_id                 UUID NOT NULL REFERENCES orders(id) ON DELETE NO ACTION
store_id                 UUID NOT NULL REFERENCES stores(id) ON DELETE NO ACTION
                          -- Vendor for THIS line item (lets a marketplace cart split across vendors)
product_id               UUID REFERENCES products(id) ON DELETE NO ACTION
                          -- nullable for free-text items
product_name             TEXT NOT NULL
quantity                 INTEGER NOT NULL CHECK (quantity > 0)
unit_price_kobo          BIGINT NOT NULL CHECK (unit_price_kobo >= 0)
total_price_kobo         BIGINT NOT NULL CHECK (total_price_kobo >= 0)
vendor_can_fulfill       BOOLEAN NOT NULL DEFAULT TRUE
                          -- Flipped to false when parent transaction requires_review
fulfilled_at             TIMESTAMPTZ
fulfilled_by             UUID REFERENCES auth.users(id) ON DELETE NO ACTION
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `paystack_subaccounts`

```
id                       UUID PK DEFAULT gen_random_uuid()
store_id                 UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE NO ACTION
paystack_subaccount_code TEXT NOT NULL UNIQUE  -- e.g. "ACCT_xxxxxxxxxxxx"
settlement_bank          TEXT NOT NULL  -- bank code from Paystack
account_number           TEXT NOT NULL
account_name             TEXT NOT NULL  -- as resolved by Paystack
active                   BOOLEAN NOT NULL DEFAULT TRUE
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `vendor_kyc`

```
id                       UUID PK DEFAULT gen_random_uuid()
store_id                 UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE NO ACTION
bvn_encrypted            BYTEA  -- pgcrypto encrypted; see encryption section below
nin_encrypted            BYTEA  -- pgcrypto encrypted
id_photo_url             TEXT
id_back_url              TEXT
selfie_url               TEXT
business_name            TEXT
business_address         TEXT
lga                      TEXT
state                    TEXT
market_area              TEXT
phone                    TEXT
whatsapp                 TEXT
referral_source          TEXT
status                   TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started','submitted','approved','rejected','frozen'))
reviewer_notes           TEXT
reviewed_by              UUID REFERENCES auth.users(id) ON DELETE NO ACTION
reviewed_at              TIMESTAMPTZ
rejection_reason         TEXT
submitted_at             TIMESTAMPTZ
signup_ip                TEXT
signup_device_fingerprint TEXT
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### `bank_accounts`

```
id                       UUID PK DEFAULT gen_random_uuid()
store_id                 UUID NOT NULL REFERENCES stores(id) ON DELETE NO ACTION
bank_code                TEXT NOT NULL
account_number           TEXT NOT NULL
resolved_account_name    TEXT NOT NULL  -- from Paystack resolveAccountNumber
verified_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (store_id, bank_code, account_number)
```

#### `paystack_split_transactions`

Per-transaction fee ledger. One row per Paystack transaction; for marketplace orders that touch multiple vendors, one row per `(order, store)` pair.

```
id                       UUID PK DEFAULT gen_random_uuid()
order_id                 UUID NOT NULL REFERENCES orders(id) ON DELETE NO ACTION
order_item_id            UUID REFERENCES order_items(id) ON DELETE NO ACTION
                          -- NULL for single-vendor (storefront) orders
                          -- Used for marketplace where a single Paystack transaction spans multiple vendors
store_id                 UUID NOT NULL REFERENCES stores(id) ON DELETE NO ACTION
paystack_reference       TEXT NOT NULL  -- matches orders.paystack_reference
amount_total_kobo        BIGINT NOT NULL  -- what customer paid for this slice
amount_paystack_kobo     BIGINT NOT NULL  -- Paystack's wholesale take
amount_storehouse_kobo   BIGINT NOT NULL  -- Storehouse's take (capped at platform_fee_config.cap_kobo)
amount_vendor_kobo       BIGINT NOT NULL  -- vendor's net
status                   TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','success','failed','disputed','refunded'))
requires_review          BOOLEAN NOT NULL DEFAULT FALSE
review_status            TEXT NOT NULL DEFAULT 'not_required'
                          CHECK (review_status IN ('not_required','pending','approved','rejected'))
reviewer_id              UUID REFERENCES auth.users(id) ON DELETE NO ACTION
reviewed_at              TIMESTAMPTZ
review_notes             TEXT
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
settled_at               TIMESTAMPTZ
```

#### `paystack_webhook_events`

Idempotency table. Every webhook delivery is recorded; replays are detected via `(paystack_reference, event_type)` uniqueness.

```
id                       UUID PK DEFAULT gen_random_uuid()
paystack_reference       TEXT NOT NULL
event_type               TEXT NOT NULL  -- 'charge.success', 'transfer.success', 'charge.failed', etc.
payload                  JSONB NOT NULL
processed_at             TIMESTAMPTZ
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (paystack_reference, event_type)
```

#### `platform_fee_config`

Configuration table; seeded with three rows (Free/Starter/Pro). Single source of truth for fee math — no hard-coded rates in edge functions.

```
tier                                   TEXT PK
                                        CHECK (tier IN ('free','starter','pro'))
basis_points                           INTEGER NOT NULL  -- Storehouse take, in bps (100 = 1.0%)
fixed_fee_kobo                         BIGINT NOT NULL DEFAULT 0  -- reserved for future use
cap_kobo                               BIGINT NOT NULL  -- per-transaction cap on Storehouse take
monthly_volume_cap_kobo                BIGINT  -- NULL = unlimited
paystack_wholesale_bps                 INTEGER NOT NULL DEFAULT 150
large_transaction_review_threshold_kobo BIGINT NOT NULL
active                                 BOOLEAN NOT NULL DEFAULT TRUE
updated_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Seeded rows:**
| tier    | basis_points | cap_kobo  | monthly_volume_cap_kobo | paystack_wholesale_bps | large_transaction_review_threshold_kobo |
|---------|--------------|-----------|-------------------------|------------------------|------------------------------------------|
| free    | 100          | 1,000,000 | 50,000,000              | 150                    | 50,000,000                               |
| starter | 50           | 1,000,000 | NULL                    | 150                    | 50,000,000                               |
| pro     | 0            | 1,000,000 | NULL                    | 150                    | 50,000,000                               |

#### `vendor_velocity_limits`

```
store_id                 UUID PK REFERENCES stores(id) ON DELETE NO ACTION
days_since_approval      INTEGER  -- denormalized; nightly cron updates from kyc_approved_at
daily_cap_kobo           BIGINT NOT NULL  -- e.g. 200_000_00 for days 1-7
monthly_cap_kobo         BIGINT  -- NULL = no monthly cap
current_day_volume_kobo  BIGINT NOT NULL DEFAULT 0
current_day_resets_at    TIMESTAMPTZ NOT NULL  -- midnight WAT next day
current_month_volume_kobo BIGINT NOT NULL DEFAULT 0
current_month_resets_at  TIMESTAMPTZ NOT NULL  -- 1st of next month, midnight WAT
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### 3.2 Additive nullable columns to `stores` (existing table)

Per "do not break existing code" guardrail, these are `ADD COLUMN ... NULL DEFAULT ...` only. NO `ALTER COLUMN`, NO `DROP COLUMN`.

```
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS paystack_subaccount_id          UUID REFERENCES paystack_subaccounts(id) ON DELETE NO ACTION,
  ADD COLUMN IF NOT EXISTS kyc_status                      TEXT DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started','submitted','approved','rejected','frozen')),
  ADD COLUMN IF NOT EXISTS kyc_submitted_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_approved_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cooling_period_ends_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen                          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frozen_reason                   TEXT,
  ADD COLUMN IF NOT EXISTS frozen_at                       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen_by                       UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  ADD COLUMN IF NOT EXISTS paystack_subaccounts_enabled    BOOLEAN DEFAULT FALSE;
```

All defaults are safe: existing rows get `kyc_status = 'not_started'`, `frozen = false`, `paystack_subaccounts_enabled = false` — equivalent to "subaccount system inactive for this store" which is what we want pre-rollout.

### 3.3 Indexes (new tables only — none on existing tables in Session 1)

Per guardrail #4, no new indexes on existing tables in Session 1. New tables get the following:

```
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference        ON orders(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_orders_primary_store_id          ON orders(primary_store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status                    ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email            ON orders(customer_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id             ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id             ON order_items(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor_can_fulfill   ON order_items(store_id, vendor_can_fulfill)
  WHERE vendor_can_fulfill = false;

CREATE INDEX IF NOT EXISTS idx_paystack_subaccounts_store_id    ON paystack_subaccounts(store_id);
CREATE INDEX IF NOT EXISTS idx_paystack_subaccounts_active      ON paystack_subaccounts(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_store_id              ON vendor_kyc(store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_status                ON vendor_kyc(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_store_id           ON bank_accounts(store_id);

CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_order          ON paystack_split_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_store          ON paystack_split_transactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_review         ON paystack_split_transactions(review_status, created_at DESC)
  WHERE review_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_paystack_split_tx_reference      ON paystack_split_transactions(paystack_reference);

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_lookup   ON paystack_webhook_events(paystack_reference, event_type);

CREATE INDEX IF NOT EXISTS idx_vendor_velocity_limits_resets    ON vendor_velocity_limits(current_day_resets_at);
```

### 3.4 RLS policies (new tables only — guardrail #3)

All new tables: `ENABLE ROW LEVEL SECURITY`.

**`orders`:**

Storefront customers are anonymous (not logged in) — there is no JWT to attach an email or user_id to. The original sketch used `customer_email = auth.jwt() ->> 'email'` which would have required customer login (an out-of-scope product change for Session 1). Replaced with token-based unauthenticated read:

```sql
-- Vendor branch: store owners see orders for their primary_store_id.
CREATE POLICY orders_vendor_select ON orders
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = orders.primary_store_id
      AND stores.user_id = auth.uid()::text
  ));

-- Customer branch: anyone presenting the unguessable customer_access_token can read
-- their own order. The token is a UUID returned only in the initiate-storefront-payment
-- response, so possession is the auth signal.
--
-- Token threat model:
--   - Server-generated, never user-supplied.
--   - Returned exactly once over HTTPS in the initiate response.
--   - Customer-side use happens via URL param on the order-status page; the page
--     reads the token from the URL and queries the orders table directly with it.
--     A leaked URL leaks one order; not catastrophic.
--   - We do NOT log the token in edge function logs or analytics.
--   - If we later need stronger guarantees we can rotate or expire tokens, but
--     for Session 1 a UUID is sufficient.
CREATE POLICY orders_token_select ON orders
  FOR SELECT
  USING (
    customer_access_token::text = current_setting('app.access_token', true)
  );
```

The `current_setting(..., true)` form returns NULL if the setting is not set rather than throwing — so unauthenticated requests that don't set the GUC simply don't match this policy. The actual mechanism for passing the token from the browser to RLS is decided at the edge-function-vs-direct-query level in Session 5/6 — most likely the browser sends the token via a Supabase RPC that forwards it as `app.access_token`. For Session 1 (no customer-facing read path yet) the policy exists but is exercised only by tests. If a future session introduces authenticated customers, add a parallel policy that reads `customer_access_token` from a JWT claim.

- INSERT: deny all (only service role via edge functions)
- UPDATE: deny all (only service role)

**`order_items`:**
- SELECT: granted to vendors that own the line item's store **OR** to anyone whose `current_setting('app.access_token', true)` matches the parent order's `customer_access_token`:
  ```sql
  CREATE POLICY order_items_vendor_select ON order_items
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = order_items.store_id
        AND stores.user_id = auth.uid()::text
    ));

  CREATE POLICY order_items_token_select ON order_items
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_access_token::text =
            current_setting('app.access_token', true)
    ));
  ```
- INSERT: deny all (only service role via edge functions)
- UPDATE: deny all (only service role)

**`paystack_subaccounts`, `vendor_kyc`, `bank_accounts`, `paystack_split_transactions`:**
- SELECT: `EXISTS (SELECT 1 FROM stores WHERE id = <table>.store_id AND user_id = auth.uid()::text)` (vendor sees own)
- INSERT/UPDATE: deny all (service role only)

Vendors get read-only access to their own data. All writes go through edge functions running with the service role.

**`paystack_webhook_events`, `platform_fee_config`, `vendor_velocity_limits`:**
- SELECT: deny all (service role only — these are operational)
- INSERT/UPDATE: deny all (service role only)

**Reviewer access** (guardrail #h: "hard-code paul's user_id as the only reviewer"):
- The reviewer needs SELECT (to read the row before deciding) and UPDATE (to approve or reject). They must NOT be able to INSERT new split rows or DELETE existing ones — those would let a reviewer fabricate or hide payments. Splitting the grants into two narrow policies (rather than `FOR ALL`) makes the intent explicit:
  ```sql
  CREATE POLICY split_tx_reviewer_select ON paystack_split_transactions
    FOR SELECT
    USING (auth.uid()::text = '<paul-user-id-placeholder>');

  CREATE POLICY split_tx_reviewer_update ON paystack_split_transactions
    FOR UPDATE
    USING (auth.uid()::text = '<paul-user-id-placeholder>')
    WITH CHECK (auth.uid()::text = '<paul-user-id-placeholder>');
  ```
  The literal Paul UUID will be sourced at migration-write time.

> **Tech debt — to address in Session 3 (KYC reviewer dashboard):**
> Hard-coding a single user UUID into an RLS policy is brittle:
> - If Paul's account is ever recreated, deleted, or migrated, every cap-hit transaction silently becomes unreviewable until the policy is dropped and recreated — and changing an RLS policy on a production reviewer table is exactly the kind of "small SQL edit" that has historically caused incidents in this codebase.
> - It also blocks adding a second reviewer (Paul on vacation, scaling the team, etc.) without a migration.
> - The literal UUID also leaks identity into the schema, which feels wrong even though it's not a security issue.
>
> **Replacement plan, Session 3:** create a `reviewers` table (`user_id UUID PK REFERENCES auth.users(id), active BOOLEAN, role TEXT, created_at, deactivated_at`), backfill Paul's row, then change `split_tx_reviewer_access` to:
> ```sql
> USING (EXISTS (SELECT 1 FROM reviewers WHERE user_id = auth.uid() AND active))
> WITH CHECK (EXISTS (SELECT 1 FROM reviewers WHERE user_id = auth.uid() AND active));
> ```
> This is a Session 3 deliverable, not Session 1, because Session 1 has zero cap-hit transactions in production yet — the brittleness has zero blast radius until vendors actually transact under the new flow. Tracking it here so it's not forgotten.

Service role bypasses all RLS by default — every edge function runs with it.

### 3.5 Encryption approach for `vendor_kyc.bvn_encrypted` and `nin_encrypted`

**Mechanism:** pgcrypto symmetric encryption (`pgp_sym_encrypt` / `pgp_sym_decrypt`).

**Key storage:** Supabase Vault (`vault.secrets`) — a managed secrets table that's encrypted at rest by Supabase and only readable from `SECURITY DEFINER` functions.

**Pre-migration setup (manual, before running the migration):**
```sql
-- Run this in Supabase SQL Editor as a privileged user BEFORE the migration:
-- 1. Confirm pgcrypto + vault extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. Insert the encryption key (generate a strong random 32+ char value)
SELECT vault.create_secret(
  '<RANDOM_32_CHAR_KEY>',           -- the secret value
  'vendor_kyc_key',                  -- the secret name
  'AES-256 key for encrypting vendor_kyc.bvn_encrypted and nin_encrypted'
);
```

**Decryption function** (defined inside the migration, SECURITY DEFINER, only callable by service_role):
```sql
CREATE OR REPLACE FUNCTION decrypt_vendor_kyc_field(encrypted_data BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_value TEXT;
BEGIN
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'vendor_kyc_key';

  IF key_value IS NULL THEN
    RAISE EXCEPTION 'vendor_kyc_key not configured in vault';
  END IF;

  RETURN pgp_sym_decrypt(encrypted_data, key_value);
END;
$$;

REVOKE EXECUTE ON FUNCTION decrypt_vendor_kyc_field FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrypt_vendor_kyc_field TO service_role;
```

**Insert pattern (called from edge functions with service role):**
```sql
INSERT INTO vendor_kyc (store_id, bvn_encrypted, nin_encrypted, ...)
VALUES (
  $1,
  pgp_sym_encrypt($2, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vendor_kyc_key')),
  pgp_sym_encrypt($3, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vendor_kyc_key')),
  ...
);
```

**What plaintext NEVER does:** never returned via PostgREST, never stored in logs, never echoed in edge-function responses. Decryption is read-only, server-side, audited.

**Fallback if vault.secrets isn't configured:** the migration will check for the key's existence and refuse to proceed if missing, with a clear message pointing to this section.

---

## 4. Edge function stubs

All six functions follow the rebuilt-`generate-business-summary` pattern (per `STOREHOUSE-DEBUG.md` lessons):
- Raw `fetch()` to Paystack (no SDK imports — even when we wire live in Session 4-5)
- Unpinned `@supabase/supabase-js@2`
- OPTIONS handler is the FIRST thing in `serve()`
- `corsHeaders` includes `'Access-Control-Allow-Methods': 'POST, OPTIONS'`
- No TypeScript type annotations on local vars
- Env reads at request time, not module load
- All logic in try/catch, errors return JSON with `corsHeaders`
- All return `503 { error: 'Subaccount system not enabled' }` if `ENABLE_PAYSTACK_SUBACCOUNTS !== 'true'`

### 4.1 `create-paystack-subaccount`

**Auth:** Bearer JWT required (the vendor approving their own subaccount creation)
**Body:** `{ store_id }`
**Behavior (Session 1 stub):**
1. Verify caller's auth user owns `stores.id = store_id`
2. Verify `stores.kyc_status = 'approved'`
3. Verify `stores.cooling_period_ends_at <= NOW()`
4. Verify `stores.frozen = false`
5. **Mock:** generate fake `paystack_subaccount_code = 'ACCT_mocked_' || random_suffix`
6. INSERT into `paystack_subaccounts` (store_id, code, mocked bank info from request)
7. UPDATE `stores.paystack_subaccount_id = <new>.id`, `paystack_subaccounts_enabled = true`
8. Return `{ subaccount_code, store_id }`

**Live behavior (Session 4):** replace the mock at step 5 with `POST https://api.paystack.co/subaccount` carrying the platform's secret key.

### 4.2 `initiate-storefront-payment`

**Auth:** Anonymous OK (storefront customers aren't logged in). Anti-abuse: existing IP rate-limit pattern from `ai-chat`.
**Body:** `{ store_id, items: [{ product_id, quantity, unit_price_kobo, product_name }], customer_email, customer_phone, customer_name? }`
**Behavior (Session 1 stub):**
1. Validate store exists, `paystack_subaccounts_enabled = true`, `frozen = false`
2. Look up the vendor's tier via `user_subscriptions` → `subscription_tiers.name` (lowercase)
3. Look up `platform_fee_config` for that tier
4. Look up `paystack_subaccounts` for that store
5. **Compute totals — IN THIS EXACT ORDER. Each take amount is computed (and capped where applicable) BEFORE deriving the customer total. Don't shortcut to a percentage formula on the customer side or you re-introduce the capped-cap windfall bug:**
   1. `subtotal_kobo = sum(items[i].quantity × items[i].unit_price_kobo)`
   2. `paystack_take_kobo = floor(subtotal_kobo × paystack_wholesale_bps / 10_000)`
   3. `storehouse_take_uncapped_kobo = floor(subtotal_kobo × basis_points / 10_000)`
   4. `storehouse_take_kobo = min(storehouse_take_uncapped_kobo, cap_kobo)` ← capped here
   5. `customer_total_kobo = subtotal_kobo + storehouse_take_kobo + paystack_take_kobo` ← uses CAPPED storehouse value
   6. `vendor_net_kobo = subtotal_kobo` (the customer pays the takes on top; vendor net is the subtotal)

   Sanity invariant the function MUST assert before proceeding: `customer_total_kobo == vendor_net_kobo + storehouse_take_kobo + paystack_take_kobo`. If it doesn't, throw — it means math drift.
6. Velocity check: query `vendor_velocity_limits` for this store. If `current_day_volume_kobo + customer_total_kobo > daily_cap_kobo`, reject with 429.
7. Free-tier monthly cap check: if tier is free and `current_month_volume_kobo + customer_total_kobo > monthly_volume_cap_kobo`, reject with 429.
8. `requires_review = (customer_total_kobo >= large_transaction_review_threshold_kobo)`
9. INSERT `orders` row (`status='pending'`, generated `paystack_reference`)
10. INSERT `order_items` row(s) (`vendor_can_fulfill = NOT requires_review`)
11. INSERT `paystack_split_transactions` row(s) (`status='pending'`, `requires_review`, `review_status = requires_review ? 'pending' : 'not_required'`, plus the four amount columns from step 5)
12. **Mock:** return `{ authorization_url: 'https://paystack-mock.local/redirect/' || reference, reference, public_key: 'pk_mock' }`

**Live behavior (Session 5):** replace step 12 with a real call to `POST https://api.paystack.co/transaction/initialize`. The exact body sent to Paystack:

```json
{
  "email": "<customer_email>",
  "amount": "<customer_total_kobo>",
  "currency": "NGN",
  "reference": "<orders.paystack_reference>",
  "subaccount": "<vendor's paystack_subaccount_code>",
  "transaction_charge": "<storehouse_take_kobo + paystack_take_kobo>",
  "bearer": "subaccount",
  "metadata": {
    "order_id": "<orders.id>",
    "store_id": "<store_id>",
    "customer_phone": "<customer_phone>",
    "customer_name": "<customer_name>"
  }
}
```

Field meanings:
- `amount` — the full amount the customer pays. **MUST equal `customer_total_kobo` from step 5**, not `subtotal_kobo`.
- `subaccount` — the vendor's `paystack_subaccount_code` (e.g. `ACCT_xxx`). Paystack routes the funds here after taking its slice.
- `transaction_charge` — the **platform slice** in kobo. Paystack subtracts this from `amount` before settling to the subaccount; the platform slice covers Paystack's wholesale fee + Storehouse's take. Computed as `storehouse_take_kobo + paystack_take_kobo`.
- `bearer: "subaccount"` — tells Paystack the subaccount (vendor) bears the transaction fee, NOT the platform. Combined with our `transaction_charge` value, this gives us the split shown in the Section 2 worked examples.
- `metadata.order_id` — used by the webhook handler in 4.3 to route `charge.success` events back to the right `orders` row.

The response from Paystack returns `{ status, message, data: { authorization_url, access_code, reference } }`. The edge function returns `authorization_url` and `reference` to the browser; the browser then either redirects to `authorization_url` or hands the access code to PaystackPop.

**Why bearer is "subaccount":** if we set `bearer: "account"` (the platform), Paystack would deduct the fee from Storehouse's settlement, not from the customer payment going to the vendor. With `bearer: "subaccount"`, the fee is taken from the vendor's portion before the subaccount receives funds — which is what we want, because the customer already paid the fee inflated above subtotal.

### 4.3 `paystack-subaccount-webhook`

**Auth:** Paystack HMAC SHA-512 signature in `x-paystack-signature` header, verified against `PAYSTACK_SECRET_KEY` env var (same pattern as the existing subscription `paystack-webhook` function).
**Body:** Paystack event payload
**Behavior:**

1. **Verify HMAC.** If invalid → 401.

2. **Idempotency claim (two-step, NOT just `ON CONFLICT DO NOTHING`).** The naive single-step idempotency creates a window where a mid-flow crash leaves a row with `processed_at = NULL` and the next retry returns 200 without doing anything — orphaning the event. Replace with claim-then-check:

   ```sql
   -- Step 2a: Try to claim. ON CONFLICT preserves the existing row.
   INSERT INTO paystack_webhook_events
     (paystack_reference, event_type, payload, processed_at)
   VALUES ($1, $2, $3, NULL)
   ON CONFLICT (paystack_reference, event_type) DO NOTHING;

   -- Step 2b: Read the row's processed_at to decide what to do.
   SELECT processed_at FROM paystack_webhook_events
   WHERE paystack_reference = $1 AND event_type = $2;
   ```

   Branch on the value of `processed_at`:
   - **`NOT NULL`** — already handled by a prior delivery. Return 200 immediately. (This is the happy idempotent retry path.)
   - **`NULL` and we just inserted (no conflict)** — proceed to step 3.
   - **`NULL` and there was a conflict** — a prior delivery started but never finished (crash, timeout, or in-progress concurrent delivery). Two choices, depending on how aggressive we want to be:
     - **(chosen) Retry the handler.** Run step 3. The handler itself MUST be idempotent at the row level (every UPDATE must be safe to repeat — e.g. `UPDATE orders SET status='paid', paid_at=NOW() WHERE paystack_reference=$1 AND status != 'paid'`). This is the safer choice and matches Paystack's own retry posture (they retry events for up to 72 hours).
     - (rejected) Treat as duplicate and 200. Risk: silent data loss if the prior delivery genuinely crashed mid-flow.

3. **Handle the event** (handler-level idempotent UPDATEs everywhere):
   - **`charge.success`** (Session 1 stub):
     - `UPDATE orders SET status='paid', paid_at=NOW() WHERE paystack_reference=$1 AND status='pending'`
     - `UPDATE paystack_split_transactions SET status='success', settled_at=NOW() WHERE paystack_reference=$1 AND status='pending'`
     - The `requires_review` flag was set at initiate-time (4.2 step 8); `order_items.vendor_can_fulfill` was set in 4.2 step 10 accordingly. The webhook does NOT toggle `vendor_can_fulfill` — the reviewer does that via 4.5/4.6.
     - **Velocity counter increment** (chosen approach: option (a) atomic increment on success):
       - For each `paystack_split_transactions` row tied to this reference, increment the corresponding vendor's `vendor_velocity_limits` by `amount_total_kobo`:
         ```sql
         UPDATE vendor_velocity_limits
         SET current_day_volume_kobo =
               CASE WHEN current_day_resets_at <= NOW()
                    THEN $amount  -- reset and start fresh
                    ELSE current_day_volume_kobo + $amount
               END,
             current_day_resets_at =
               CASE WHEN current_day_resets_at <= NOW()
                    THEN date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos')
                         + INTERVAL '1 day' AT TIME ZONE 'Africa/Lagos'
                    ELSE current_day_resets_at
               END,
             current_month_volume_kobo =
               CASE WHEN current_month_resets_at <= NOW()
                    THEN $amount
                    ELSE current_month_volume_kobo + $amount
               END,
             current_month_resets_at =
               CASE WHEN current_month_resets_at <= NOW()
                    THEN date_trunc('month', NOW() AT TIME ZONE 'Africa/Lagos')
                         + INTERVAL '1 month' AT TIME ZONE 'Africa/Lagos'
                    ELSE current_month_resets_at
               END,
             updated_at = NOW()
         WHERE store_id = $store_id;
         ```
       Reset detection happens inline via the CASE expressions; no separate cron needed for the per-tx counter advance. (A nightly cron may still be useful to denormalize `days_since_approval` from `stores.kyc_approved_at` — that's a separate concern from volume tracking.)
       **Why option (a) over option (b) "compute from orders on demand":** the velocity check in 4.2 step 6 runs on every cart submission and must be fast. A live `SELECT SUM(...) FROM orders WHERE store_id=? AND created_at >=` query gets slow as the orders table grows; the denormalized counter is `O(1)`. The handler-side increment is the cost we pay for fast checks elsewhere. The handler is idempotent because we only run it once per claim (step 2's claim is the gate).
   - **`transfer.success`** (Session 1 stub): no-op for now; will mark vendor settlements as confirmed in Session 7.
   - **`charge.failed`** (Session 1 stub):
     - `UPDATE orders SET status='failed' WHERE paystack_reference=$1 AND status='pending'`
     - `UPDATE paystack_split_transactions SET status='failed' WHERE paystack_reference=$1 AND status='pending'`
     - Velocity counters are NOT incremented on failure.

4. **Mark processed.** Final step before returning 200:
   ```sql
   UPDATE paystack_webhook_events
   SET processed_at = NOW()
   WHERE paystack_reference = $1 AND event_type = $2;
   ```

5. Return 200.

**Failure modes covered:**
- Paystack retries an event we've already handled → step 2b returns `processed_at NOT NULL` → 200 with no work.
- Paystack retries an event whose handler started but crashed → step 2b returns `processed_at NULL` with conflict → handler runs again; row-level idempotent UPDATEs make it safe.
- Two simultaneous deliveries of the same event → both try the INSERT in step 2a; one succeeds and runs the handler, the other hits the conflict, sees `processed_at NULL` mid-flow, and re-runs the (idempotent) handler. Worst case is two successful identical UPDATEs — no data corruption.
- Network blip after step 4 but before HTTP 200 reaches Paystack → Paystack retries; step 2b sees `processed_at NOT NULL` → 200 immediately.

**Note:** This webhook is **separate** from the existing `supabase/functions/paystack-webhook/` (which handles subscriptions). Reasoning: the subscription webhook has hard-coded subscription-only event handlers and a different lookup pattern (`profiles` table). Splitting keeps blast radius small and lets the existing subscription flow stay frozen during this work. Both webhooks can be registered with Paystack via separate webhook URLs.

### 4.4 `resolve-bank-account`

**Auth:** Bearer JWT required
**Body:** `{ bank_code, account_number }`
**Behavior (Session 1 stub):** return `{ account_name: 'MOCK ACCOUNT NAME', verified: true }` without calling Paystack.
**Live behavior (Session 4):** call `GET https://api.paystack.co/bank/resolve?account_number=...&bank_code=...` (free, public-key-authenticated).

### 4.5 `approve-transaction-for-fulfillment`

**Auth:** Bearer JWT required, caller must be the hard-coded reviewer user_id (Paul)
**Body:** `{ paystack_split_transaction_id, review_notes? }`
**Behavior:**
1. Verify caller is the configured reviewer
2. UPDATE `paystack_split_transactions SET review_status='approved', reviewer_id, reviewed_at=NOW(), review_notes`
3. UPDATE `order_items SET vendor_can_fulfill=true WHERE order_id = <split_tx.order_id> AND store_id = <split_tx.store_id>`
4. Return success

### 4.6 `reject-transaction-and-freeze`

**Auth:** Bearer JWT required, reviewer-only
**Body:** `{ paystack_split_transaction_id, rejection_reason }`
**Behavior:**
1. Verify caller is the configured reviewer
2. UPDATE `paystack_split_transactions SET review_status='rejected', reviewer_id, reviewed_at=NOW(), review_notes=rejection_reason`
3. UPDATE `stores SET frozen=true, frozen_reason=<text>, frozen_at=NOW(), frozen_by=<reviewer>`
4. UPDATE `paystack_subaccounts SET active=false WHERE store_id=<store_id>`
5. **Mock:** log "would call Paystack /subaccount/<code> with active=false here" (Session 4 wires the live call)
6. Stub for refund flow — out of scope Session 1
7. Return success

### 4.7 `initiate-marketplace-payment`

**Behavior:** return `503 { error: 'Marketplace not yet enabled' }`. Wired up when marketplace activates (separate effort — see `ENABLE_MARKETPLACE` flag).

---

## 5. Feature flags

Two independent env vars on the Supabase edge runtime:

| Var | Default | Effect |
|---|---|---|
| `ENABLE_PAYSTACK_SUBACCOUNTS` | unset (treated as off) | Gates 4.1, 4.2, 4.3, 4.4, 4.5, 4.6. When off, all six return `503 { error: 'Subaccount system not enabled' }` immediately after the OPTIONS handler. |
| `ENABLE_MARKETPLACE` | unset (treated as off) | Gates 4.7. Independent of the subaccount flag. |

**Per-store override:** `stores.paystack_subaccounts_enabled BOOLEAN DEFAULT FALSE`. Even with the global flag ON, a specific store only routes through the subaccount flow if its `paystack_subaccounts_enabled = true`. Lets us gradually roll out one vendor at a time during Sessions 5-6.

**To enable globally:**
```bash
supabase secrets set ENABLE_PAYSTACK_SUBACCOUNTS=true --project-ref yzlniqwzqlsftxrtapdl
```

**To enable for a specific vendor:**
```sql
UPDATE stores SET paystack_subaccounts_enabled=true WHERE id=<store-uuid>;
```

**To re-disable in an emergency:**
```bash
supabase secrets unset ENABLE_PAYSTACK_SUBACCOUNTS --project-ref yzlniqwzqlsftxrtapdl
```
All six edge functions immediately return 503; any in-flight transactions complete normally because the flag is checked at request entry only, not mid-flow.

---

## 6. Deprecation of existing flow (Session 6 plan)

The current Cart.tsx → PaystackPop with vendor's own key → sales table flow stays UNCHANGED in Session 1. **Files NOT touched in Session 1:**

- `src/components/Cart.tsx`
- `src/contexts/CartContext.tsx`
- `src/pages/StorefrontPage.tsx`
- `src/utils/onlineStoreSales.ts`
- `src/components/Checkout.jsx`
- `src/components/CheckoutDemo.jsx`
- `supabase/migrations/20250123_marketplace_ready_schema.sql`

**Session 6 will:**
1. Modify `Cart.tsx:177-340` (`handlePaystackPayment`) to call `POST /functions/v1/initiate-storefront-payment` instead of `PaystackPop.setup({ key: store.paystackPublicKey })`. The returned `authorization_url` will be loaded into PaystackPop using the **platform's** public key.
2. Move `saveOnlineStoreOrder` logic into the edge function — the success-callback in the browser becomes a thin "show confirmation" handler. Order rows are written by the webhook authoritatively.
3. Hide the vendor-paystack-key configuration UI in Settings (the `paystack_public_key` / `paystack_test_mode` fields on `stores`). The columns stay in DB for rollback.
4. Keep `Cart`, `CartContext`, and `StorefrontPage` UX intact — only the plumbing changes.

**Cart UX is fine** — Cart.tsx renders, totals, promo codes, customer-info collection are all reusable. Only the Paystack init point swaps.

---

## 7. BLAST RADIUS

Per guardrail #7. Explicit accounting of what gets touched and what does not.

### Files/tables/functions TOUCHED in Session 1 (creating)

**New SQL migration file (single file, additive only):**
- `supabase/migrations/<timestamp>_paystack_subaccounts_schema.sql`

**New edge function directories (six new):**
- `supabase/functions/create-paystack-subaccount/`
- `supabase/functions/initiate-storefront-payment/`
- `supabase/functions/paystack-subaccount-webhook/`
- `supabase/functions/resolve-bank-account/`
- `supabase/functions/approve-transaction-for-fulfillment/`
- `supabase/functions/reject-transaction-and-freeze/`
- `supabase/functions/initiate-marketplace-payment/` (the 503 stub)

**New docs:**
- `docs/PAYSTACK-SUBACCOUNTS-DESIGN.md` (this file)
- `PAYSTACK-DEBUG.md` (Step 3)

### Existing tables MODIFIED in Session 1

- `stores` — additive nullable columns ONLY (10 new columns, all nullable with safe defaults)

### Existing tables/files NOT TOUCHED in Session 1

| Item | Reason untouched |
|---|---|
| `users` table | Marketplace columns there are orphan; new work uses `stores` |
| `products` table | Existing flows depend on it; subaccount work doesn't need new columns yet |
| `sales` table | Storefront denormalization stays live. Replaced in Session 6, not Session 1 |
| `payment_transactions` table | Currently subscription-only; we'll extend in Session 7 |
| `subscription_tiers` table | Read-only lookup; we add seeded rows to NEW `platform_fee_config` instead |
| `user_subscriptions` table | Read-only lookup for tier name |
| `marketplace_analytics`, `moderation_queue`, `subscriptions` (orphan) | Leave alone per inventory recommendations |
| `auth.users` | Standard Supabase managed table; only FK references |
| `Cart.tsx`, `CartContext.tsx`, `StorefrontPage.tsx`, `onlineStoreSales.ts` | Session 6 work, NOT Session 1 |
| `Checkout.jsx`, `CheckoutDemo.jsx`, `TestPayment.jsx` | Demo/test fixtures; out of scope |
| `services/marketplace.ts`, `MarketplaceSettings.tsx` | Orphan; out of scope |
| `paystack-webhook/index.ts` (existing, subscription-only) | Subscription flow stays untouched |
| `verify-transaction/index.ts`, `verify-subscription/index.ts`, `manage-subscription/index.ts` | Subscription Paystack flow; untouched |
| `ai-chat/index.ts`, `send-agent-message/index.ts`, `generate-business-summary/index.ts` | Chat/insights flows; untouched |
| Other edge functions | All untouched |

**No `ALTER COLUMN`, `DROP COLUMN`, `DROP TABLE`, `RENAME` anywhere. No new indexes on existing tables. No RLS policies on existing tables.** (Per guardrails 1, 3, 4.)

### Edge function deploy plan

All six new functions deploy to Supabase with `ENABLE_PAYSTACK_SUBACCOUNTS` UNSET — they will immediately return 503 to anyone hitting them. Production behavior is therefore unchanged: Cart.tsx never calls these endpoints, customers never see them, the existing storefront flow continues exactly as today.

---

## 8. Out of scope this session (build later)

| Session | Scope |
|---|---|
| 2 | KYC onboarding form UI; vendor agreement workflow |
| 3 | Admin review dashboard for KYC + transaction reviews |
| 4 | Live Paystack API calls for `create-paystack-subaccount` and `resolve-bank-account` |
| 5 | Live Paystack API call for `initiate-storefront-payment`; full webhook idempotency wiring |
| 6 | Storefront customer checkout cutover (Cart.tsx update, hide vendor-paystack-key UI) |
| 7 | Notification system (Telegram/email); webhook live wiring; settled_at tracking |
| 8 | Velocity cap enforcement live wiring; vendor-facing fulfillment UI |
| Phase 2 (weeks out) | Smile Identity integration; remove manual KYC bottleneck |
| Session 10+ | Refund / dispute handling |
| When marketplace activates | Marketplace cart UX; `initiate-marketplace-payment` real implementation |
| Separate ticket | `sale_channel` / `sales_channel` typo + CHECK constraint extension |

---

## 9. Pre-flight checklist (before running migration)

These checks must pass before applying the migration. Per guardrails 5, 6, 9.

**Step 1 — Naming conflict check (guardrail 6):**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'orders','order_items','paystack_subaccounts','vendor_kyc',
    'bank_accounts','paystack_split_transactions','paystack_webhook_events',
    'platform_fee_config','vendor_velocity_limits'
  );
```
Expected: zero rows. If any return, halt and report.

**Step 2 — Vault key precondition check (guardrail 5):**
```sql
SELECT name FROM vault.secrets WHERE name = 'vendor_kyc_key';
```
Expected: one row. If zero, run the precondition setup from Section 3.5 first.

**Step 3 — Dry-run inspection (guardrail 9):**
The migration file's leading comment block lists every CREATE TABLE / ALTER TABLE / CREATE INDEX / CREATE POLICY statement in plain English. Read it as a checklist before applying. The first run must be against a non-prod environment if available; otherwise, take a manual snapshot before applying:
```sql
SELECT pg_export_snapshot();  -- copy the snapshot id; useful for rollback discussion
```

**Step 4 — `npm run check:chat` and `npm run build` must pass** on the branch before any commit (guardrail 8).

**Step 5 — Service-role key sanity check before edge function deploys:**
The edge functions need `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already configured for other functions), and a new `PAYSTACK_PLATFORM_SECRET_KEY` env var when we go live in Session 4. Session 1 stubs don't need the Paystack key yet — flag noted.

---

## 10. Rollback procedure if migration causes issues

The migration is additive — rollback is straightforward but requires manual SQL since we don't checkpoint with `pg_dump`. Sequence:

```sql
-- 1. Drop new tables (no FKs from existing tables point at them, so order doesn't matter)
DROP TABLE IF EXISTS paystack_split_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS paystack_subaccounts CASCADE;
DROP TABLE IF EXISTS vendor_kyc CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS paystack_webhook_events CASCADE;
DROP TABLE IF EXISTS platform_fee_config CASCADE;
DROP TABLE IF EXISTS vendor_velocity_limits CASCADE;

-- 2. Drop additive columns from stores (use IF EXISTS for safety)
ALTER TABLE stores
  DROP COLUMN IF EXISTS paystack_subaccount_id,
  DROP COLUMN IF EXISTS kyc_status,
  DROP COLUMN IF EXISTS kyc_submitted_at,
  DROP COLUMN IF EXISTS kyc_approved_at,
  DROP COLUMN IF EXISTS cooling_period_ends_at,
  DROP COLUMN IF EXISTS frozen,
  DROP COLUMN IF EXISTS frozen_reason,
  DROP COLUMN IF EXISTS frozen_at,
  DROP COLUMN IF EXISTS frozen_by,
  DROP COLUMN IF EXISTS paystack_subaccounts_enabled;

-- 3. Drop the decrypt function
DROP FUNCTION IF EXISTS decrypt_vendor_kyc_field(BYTEA);

-- 4. (Optional) Remove the vendor_kyc_key from vault if cleanly rolling back
-- SELECT vault.delete_secret('vendor_kyc_key');
```

The new edge functions can be deleted via `supabase functions delete <name> --project-ref yzlniqwzqlsftxrtapdl` if they need to come down. With the feature flag default-OFF, leaving them deployed and inert is also safe.

---

## 11. Why we're confident this won't break production

1. **Feature-flag-default-OFF.** Edge functions return 503 immediately if `ENABLE_PAYSTACK_SUBACCOUNTS !== 'true'`. No env var = no behavior.
2. **`stores.paystack_subaccounts_enabled DEFAULT FALSE`.** Even with the global flag flipped, every existing store has the per-store override at FALSE. Manual UPDATE per vendor required to opt in.
3. **No `ALTER COLUMN`, no `DROP`, no `RENAME` on existing tables.** Only nullable column additions.
4. **No new RLS policies on existing tables.** New tables get policies; existing tables untouched.
5. **No new indexes on existing tables.** Avoids any chance of performance shift during index build.
6. **Existing storefront flow (Cart.tsx → vendor's PaystackPop key → sales table) unchanged.** Customer checkouts continue to work exactly as today.
7. **Existing subscription Paystack flow (`paystack-webhook`, `verify-transaction`, etc.) untouched.** Different event handlers, different webhook URL — no overlap.
8. **Migration ships in a single transaction.** If any statement fails, the whole thing rolls back automatically.

---

## 12. Summary

Session 1 builds the schema + edge function skeleton for the new Paystack-subaccount-split storefront flow. Everything is additive, gated, and inert by default. Cart.tsx, the existing storefront, and the existing subscription flow are all untouched. The cutover happens in Session 6.

After your approval of this design, Step 3 produces:
1. The SQL migration (verified against guardrails 1–6, with the vault-key precondition documented in 5 and the conflict check from 6)
2. Seven edge function stubs (matching the rebuilt-`generate-business-summary` pattern; sixth is the marketplace 503 stub)
3. `PAYSTACK-DEBUG.md` skill file for future sessions
4. `npm run check:chat` and `npm run build` both pass
5. Stop without deploying or committing — show you the SQL and the seven function files for review

---

## 13. Open verification items (resolve in Session 4 before live transactions)

This section tracks design assumptions that need validation against external systems. None of these block Session 1 because Session 1 is mock-only — no live Paystack call is made. They MUST be resolved before Session 4 (live wiring) ships.

### 13.1 Paystack wholesale-fee base — `amount` vs `subtotal`?

**The assumption baked into Sections 2 and 4.2:**

```
paystack_take_kobo = floor(subtotal_kobo × paystack_wholesale_bps / 10_000)
```

i.e. Paystack's 1.5% wholesale fee is applied to the vendor-facing **subtotal**, not the inflated `amount` (which equals `subtotal + storehouse_take + paystack_take`).

**Why this matters:** if Paystack actually applies the 1.5% to `amount` rather than the implied subtotal, our `paystack_take_kobo` is computed against the wrong base, and we end up under-billing the customer for the fee. Worse, the formula becomes self-referential:

```
paystack_take_kobo = (subtotal_kobo + storehouse_take_kobo + paystack_take_kobo) × 150 / 10_000
```

That's a circular dependency. It's algebraically solvable (single-variable linear equation) but the closed form is non-obvious enough that the edge function would need either:

- **Algebraic closed form** (assuming wholesale applies to `amount` and storehouse take is uncapped):
  ```
  Let t = paystack_wholesale_bps, s = storehouse_bps. All in bps.
  amount = subtotal + storehouse_take + paystack_take
  paystack_take = amount × t / 10000
  storehouse_take = subtotal × s / 10000   (uncapped; capped case is messier)
  ⇒ amount × (1 - t/10000) = subtotal × (1 + s/10000)
  ⇒ amount = subtotal × (10000 + s) / (10000 - t)
  ⇒ paystack_take = amount × t / 10000
  ⇒ storehouse_take = subtotal × s / 10000
  ```
  Cap-hit case: replace `s/10000` with `min(subtotal × s / 10000, cap_kobo) / subtotal` (effective rate after cap), then re-solve. Messy but tractable.

- **Or iterative / fixed-point computation** in the edge function — converges in a few iterations because the wholesale rate is small (1.5%).

**What we need to verify, and how:**
1. Read Paystack's split-payment documentation specifically for the `bearer: "subaccount"` flow. Confirm whether the platform's stated wholesale fee (1.5%) is computed against `amount` or against `amount - transaction_charge`.
2. Run a test transaction in Paystack's test mode with known inputs (e.g. ₦10,000 subtotal, Free tier values), capture the actual settlement breakdown from the Paystack dashboard, and reconcile against both formulas. Whichever matches is the truth.
3. If wholesale applies to `amount`: rewrite Section 2's formula and update Section 4.2 step 5 to use the corrected (algebraic or iterative) computation. Update worked Examples A and B with corrected numbers. Update the sanity invariant in step 5.
4. If wholesale applies to subtotal (current assumption): document the verification result here and move on.

**Until verification:** the mock authorization_url returned in Session 1 step 12 means no money moves and no formula error has consequences. Session 4 (live Paystack wiring) is the gate — the verification MUST happen before Session 4 deploys to production.

**Owner:** Paul + Claude during Session 4 prep.

---

Awaiting your "approved, proceed to step 3" before any of that happens.
