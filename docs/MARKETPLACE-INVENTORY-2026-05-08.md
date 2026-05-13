# Marketplace Inventory — 2026-05-08

Discovery doc produced before designing the Paystack subaccount integration. Goal: catalog every marketplace-related artifact already in the codebase so the new work merges with the existing foundation rather than duplicating or conflicting with it.

**Method:** Read-only inspection of `supabase/migrations/`, `supabase/functions/`, and `src/`. No code changed, no migrations created, no branch made.

**Headline finding:** Storehouse already has a substantial **marketplace-ready schema** (analytics, moderation, subscription, store/product visibility columns) plus a service layer (`services/marketplace.ts`) and a settings UI (`MarketplaceSettings.tsx`) — all hidden behind a `MARKETPLACE_ENABLED = false` feature flag. Separately, the **online store / cart / checkout flow IS live in production** today via `Cart.tsx` + `StorefrontPage.tsx` + `onlineStoreSales.ts`, but it bypasses the marketplace tables entirely and writes directly to the `sales` table. **There is no `orders` table.** Online store payments today go straight to the merchant's own Paystack account (no platform cut, no subaccount, no split).

---

## (a) Tables already in DB

### From `20250123_marketplace_ready_schema.sql` (343 lines, applied ~Jan 2025)

#### Columns added to existing tables

**`users`** — marketplace columns:
- `store_slug TEXT` — unique URL slug (e.g. `storehouse.app/@mystore`)
- `store_visible BOOLEAN DEFAULT FALSE` — toggle for marketplace listing
- `store_description TEXT`
- `store_banner_url TEXT`
- `subscription_tier TEXT DEFAULT 'free' CHECK IN ('free','basic','pro')`
- `verified BOOLEAN DEFAULT FALSE`
- Indexes: `idx_users_store_slug` (unique partial), `idx_users_marketplace` (partial on `store_visible=true`)

**`products`** — marketplace columns:
- `public_visible BOOLEAN DEFAULT FALSE`
- `category TEXT`
- `tags TEXT[]`
- `view_count INTEGER DEFAULT 0`
- `inquiry_count INTEGER DEFAULT 0`
- `boost_score INTEGER DEFAULT 0` — for premium placement
- `last_viewed_at TIMESTAMPTZ`
- `approved_for_marketplace BOOLEAN DEFAULT TRUE`
- `approval_status TEXT CHECK IN ('pending','auto_approved','manual_approved','rejected')`
- `search_vector tsvector` — full-text search
- Indexes: `idx_products_marketplace` (partial), `idx_products_search` (GIN on tsvector)
- Trigger: `trigger_update_product_search` keeps `search_vector` current

#### New tables

**`marketplace_analytics`** — per-event tracking
- Columns: `id` UUID PK, `user_id` UUID → users, `product_id` UUID → products, `store_id` UUID → users, `event_type` CHECK IN `('store_view','product_view','product_click','inquiry','share')`, `referrer`, `user_ip`, `user_agent`, `metadata` JSONB, `created_at`
- 3 indexes on (store/product/created_at)
- RLS enabled. SELECT: `store_id::text = auth.uid()::text` (own only). INSERT: `WITH CHECK (true)` (anyone can record an event)

**`subscriptions`** — Paystack-aware subscription tiers
- Columns: `id`, `user_id` UUID NOT NULL → users, `tier` CHECK IN `('free','basic','pro')`, `price_kobo`, `status` CHECK IN `('active','cancelled','expired','pending')`, `started_at`, `expires_at`, `paystack_subscription_code`, `paystack_customer_code`, `paystack_authorization_code`, `metadata` JSONB, timestamps
- 2 indexes: by user/status, by paystack code
- RLS: SELECT/INSERT own only

**`moderation_queue`**
- `id`, `product_id`, `store_id`, `report_type` CHECK IN `('spam','inappropriate','fake','prohibited','copyright','other')`, `reporter_id`, `reason`, `status` CHECK IN `('pending','reviewing','approved','rejected','removed')`, `reviewed_by`, `reviewed_at`, `admin_notes`, `created_at`
- RLS: anyone can INSERT, only authenticated can SELECT

#### Helper functions

- `generate_store_slug(business_name TEXT) RETURNS TEXT` — slugifies, ensures uniqueness against `users.store_slug`
- `update_product_boost_scores() RETURNS void` — sets `products.boost_score` to 100/50/0 based on the user's `subscription_tier` (Pro/Basic/Free)
- `search_marketplace_products(...)` — returns ranked products joining `products` ↔ `users` with full-text search, category/location/price filters, and a relevance score combining ts_rank + boost_score + freshness

### From `20241226000001_payment_transactions.sql` (116 lines)

**`payment_transactions`** — generic Paystack payment tracker
- Columns: `id`, `user_id` UUID NOT NULL → auth.users, `amount` DECIMAL (naira), `currency` (default 'NGN'), `status` (`pending|success|failed|refunded`), `payment_provider` (default 'paystack'), `payment_reference` UNIQUE, `payment_method`, `authorization_code`, `subscription_id` → `user_subscriptions`, `tier_id` → `subscription_tiers`, `billing_cycle`, `paystack_response` JSONB, `customer_email`, `customer_code`, description, ip_address, user_agent, attempted_at, completed_at, failed_at, refunded_at, created_at, updated_at
- RLS: own SELECT; service role INSERT/UPDATE
- Function: `get_user_payment_history(p_user_id UUID)`

### From `add-sales-channel.sql` (86 lines)

**`sales`** column added:
- `sales_channel TEXT DEFAULT 'in-store'` with CHECK IN `('in-store','whatsapp','instagram','facebook','website','tiktok','referral','other')`
- 2 indexes
- Function: `get_sales_by_channel(p_user_id, start, end)`

### What's NOT in any migration

- **No `orders` table.**
- **No `order_items` table.**
- **No `cart` / `carts` table.**
- **No `checkout_sessions` table.**
- **No `paystack_subaccounts` table.**
- **No splits / fee / commission tracking columns** anywhere except the affiliate program (which is for referral commissions on subscriptions, NOT order splits).
- The `sales` table has no `paystack_split_code`, `platform_fee`, `merchant_fee`, or related columns.

---

## (b) Code in repo — state-of-completion table

| File | Lines | What it does | Routed/mounted? | State |
|---|---|---|---|---|
| `src/services/marketplace.ts` | 511 | Service layer for marketplace: slug generation (RPC), store visibility, public-store fetch, product visibility, full-text search (RPC), analytics tracking, store-analytics aggregation, subscription plan listing, product-limit check. **All gated behind `MARKETPLACE_ENABLED = false`.** | ❌ Not imported anywhere | **Orphan.** Functional but disabled. |
| `src/components/MarketplaceSettings.tsx` | 266 | Settings UI for toggling marketplace store visibility, customizing slug/description/banner, viewing subscription tier. Uses `services/marketplace.ts`. | ❌ Not imported in `App.jsx`, `AppRoutes.jsx`, or any other page | **Orphan.** Built but not wired into the live settings panel. |
| `src/components/MarketplaceSettings.css` | — | Styles for above | ❌ | Orphan. |
| `src/types/marketplace.ts` *(referenced by `services/marketplace.ts:11`)* | — | Type defs for `MarketplaceProduct`, `PublicStore`, `StoreProfile`, `MarketplaceSearchFilters`, etc. | Used only by `services/marketplace.ts` | Orphan downstream. |
| `src/contexts/CartContext.tsx` | 143 | React context for shopping cart state on the storefront. Items in kobo, qty tracking, persisted to `sessionStorage`. | ✅ Wrapped around `<StorefrontPage>` content via `<CartProvider>` | **Live.** Used by Cart.tsx + StorefrontPage.tsx. |
| `src/components/Cart.tsx` | 1130 | Cart sidebar UI for storefront. Renders cart items, calculates totals/discounts/promos, handles checkout flow, **calls Paystack inline.js directly using the merchant's own `paystackPublicKey`**, on success calls `saveOnlineStoreOrder` to write rows to `sales` table. | ✅ Mounted by `StorefrontPage.tsx` | **Live in production.** |
| `src/components/Checkout.jsx` | 266 | Standalone "Checkout" component that runs Paystack inline.js for an arbitrary product+amount. Used only by `CheckoutDemo.jsx` and `TestPayment.jsx`. | ⚠️ Only via demo/test pages | **Live for tests; not part of customer flow.** |
| `src/components/CheckoutDemo.jsx` | 102 | Demo page wrapping `Checkout.jsx`. | ⚠️ Routed but for testing only | Test fixture. |
| `src/components/sales/CartDrawer.tsx` | 115 | A separate cart drawer for the in-app sales-recording flow (NOT the storefront — for the merchant entering items at point of sale). | ✅ Used inside in-app sales modules | Live; unrelated to storefront cart. |
| `src/pages/StorefrontPage.tsx` | 2663 | Public customer-facing storefront at `/store/:slug`. Lists products, handles variants, mounts Cart sidebar, runs AI chat widget. | ✅ Routed at `/store/:slug` | **Live in production.** Uses `stores.store_slug` (NOT `users.store_slug`). |
| `src/utils/onlineStoreSales.ts` | 170 | `saveOnlineStoreOrder()` — writes one row per cart item to the `sales` table with `payment_method='card'\|'transfer'`, `sale_channel='online-store'` *(misspelling — see Gaps)*. Decrements product/variant inventory via RPCs. Upserts customer via `upsert_customer` RPC. | ✅ Called from `Cart.tsx:251, 361` | **Live.** This is the bridge between storefront cart and the sales table. |
| `src/pages/TestPayment.jsx` | — | Dev page demonstrating Paystack flow. | Routed in dev | Test fixture. |

### Existing Paystack-related code (NOT marketplace, but adjacent)

| File | What |
|---|---|
| `src/utils/paystackSettings.ts` | Reads `stores.paystack_public_key`, `paystack_test_mode`, etc.; exposes `getActivePublicKey()` |
| `supabase/functions/verify-transaction/index.ts` | Verifies a Paystack transaction reference (used by subscription checkout flow) |
| `supabase/functions/verify-subscription/index.ts` | Looks up Paystack subscription state |
| `supabase/functions/manage-subscription/index.ts` | Cancels/changes Paystack subscriptions |
| `supabase/functions/paystack-webhook/index.ts` | Receives Paystack webhooks for `subscription.create`, `charge.success`, `subscription.disable`, etc. **Uses HMAC SHA-512 signature verification.** Handles subscription lifecycle, NOT marketplace orders. |

### Storefront cart flow (live today)

```
Customer → /store/:slug → StorefrontPage
                              │
                              ├─ <CartProvider>
                              │     └─ <Cart>
                              │           └─ handlePaystackPayment()
                              │                 ├─ window.PaystackPop.setup({ key: store.paystackPublicKey, ... })
                              │                 │     ↑ Customer pays the MERCHANT directly.
                              │                 │       No platform involvement, no subaccount, no split.
                              │                 └─ on success → saveOnlineStoreOrder()
                              │                                       └─ INSERT INTO sales (one row per cart item)
                              │                                            payment_method='card', payment_status='paid',
                              │                                            sale_channel='online-store'
                              │                                       └─ RPC decrement_product_quantity (per item)
                              │                                       └─ RPC upsert_customer
                              └─ AIChatWidget
```

---

## (c) Edge functions

**No marketplace/cart/order/checkout edge functions exist.**

`ls supabase/functions/ | grep -iE "marketplace|cart|order|checkout"` returns nothing. Confirmed.

The whole online-store-order flow runs **client-side**: Paystack inline.js in the browser → success callback → frontend writes to `sales` table directly via the Supabase JS client (using the customer's anon-key request, since storefront customers are unauthenticated).

---

## (d) Wired vs orphan

### LIVE (in production today)

- `stores.store_slug` (NOTE: **on `stores` table, not `users` table**)
- `stores.paystack_enabled`, `paystack_public_key`, `paystack_test_mode`
- `sales.sales_channel` (the column in DB; the live writer at `onlineStoreSales.ts:91` actually misspells it as `sale_channel` — pre-existing bug)
- `payment_transactions` table (used by subscription checkout flow via `verify-transaction` / `paystack-webhook`)
- `subscriptions` table (used by signup flow; one row per user, free tier 100-year `expires_at`)
- `Cart.tsx`, `CartContext.tsx`, `StorefrontPage.tsx`, `onlineStoreSales.ts` (storefront cart flow)
- `Checkout.jsx`, `CheckoutDemo.jsx`, `TestPayment.jsx` (dev/test only)

### ORPHAN (in repo, never reachable)

- `services/marketplace.ts` — never imported
- `MarketplaceSettings.tsx` + `.css` — never imported
- `types/marketplace.ts` — only consumed by the orphan service
- `marketplace_analytics` table — no writes (`trackMarketplaceEvent` is in the orphan service)
- `moderation_queue` table — no writes anywhere
- `users.store_slug`, `users.store_visible`, `users.store_description`, `users.store_banner_url`, `users.subscription_tier`, `users.verified` — all unused. **The live store-slug system uses `stores.store_slug`, NOT this column.**
- `users.subscription_tier` is shadowed by `user_subscriptions.tier_id` (live) — see conflicts below
- `products.public_visible`, `category`, `tags`, `view_count`, `inquiry_count`, `boost_score`, `last_viewed_at`, `approved_for_marketplace`, `approval_status`, `search_vector` — all defined and indexed but no production code reads or writes them. (One exception: `services/marketplace.ts:184, 214` writes `public_visible` but that service is orphan.)
- `update_product_boost_scores()`, `search_marketplace_products()`, `generate_store_slug()` RPCs — defined in the migration; only the orphan `services/marketplace.ts` calls them
- `subscriptions` table is partially wired (signup creates a row), but the live subscription flow uses `user_subscriptions` instead

### Pre-existing bug found during this discovery (NOT IN SCOPE TO FIX)

**`onlineStoreSales.ts:91`** writes `sale_channel: 'online-store'` but:
1. The actual column is `sales_channel` (extra `s`) per `add-sales-channel.sql:9`
2. The `sales_channel` CHECK constraint at `add-sales-channel.sql:31-40` does NOT include `'online-store'` — only `'in-store','whatsapp','instagram','facebook','website','tiktok','referral','other'`

So either every online-store order INSERT silently drops the channel attribution (PostgREST ignores unknown columns) or it errors and the order falls through. Worth investigating separately.

---

## (e) Gaps and conflicts with the planned Paystack subaccount design

A Paystack subaccount integration typically requires the following the platform must own:

1. **Per-store Paystack subaccount IDs** stored against the merchant
2. **Order entity** (because a single Paystack transaction can cover multiple line items, and the platform needs an authoritative order record for refunds, dispute, fulfillment)
3. **Transaction-level fee ledger** (platform fee + merchant net per transaction)
4. **Server-side payment initialization** — the split must be set on the Paystack side at transaction-init time; can't be done from a public storefront browser page using the merchant's public key
5. **Webhook handling for `charge.success`** to authoritatively settle order state
6. **Refund flow** that respects the split

### Conflicts and gaps vs current state

| Concern | Current state | Gap / decision needed |
|---|---|---|
| Per-store Paystack identity | `stores.paystack_public_key`, `paystack_enabled`, `paystack_test_mode` exist. NO `paystack_subaccount_code` column. | **Add `stores.paystack_subaccount_code TEXT`** (and probably `paystack_settlement_bank`, `paystack_account_number`, `paystack_account_name`, `subaccount_status`, `subaccount_percentage_charge`). |
| Order entity | **No `orders` table.** Storefront orders are denormalized into `sales` (one row per cart item). | **Decision:** create a real `orders` + `order_items` pair, OR continue denormalizing into `sales` with new aggregate-id and split-fee columns. Recommendation: create `orders` — multi-item refunds and reconciliation become unmanageable in the denormalized model. |
| Fee ledger | None. `payment_transactions` is per-Paystack-call but tied to subscription_id, not to storefront orders. | **Add platform-fee + merchant-net columns** to whichever table represents an order (or extend `payment_transactions` if reusing). |
| Server-side payment init | Currently `PaystackPop.setup()` runs in the customer's browser using the **merchant's** public key. Cannot inject a `subaccount` or `transaction_charge` from there safely (the public key belongs to the merchant, not the platform). | **Need a new edge function** (e.g. `initialize-storefront-payment`) that uses the **platform's** Paystack secret key, injects `subaccount` + optional `transaction_charge` or `bearer`, and returns an `authorization_url` or initialization data the browser can pass to PaystackPop. |
| Webhook for storefront orders | `paystack-webhook/index.ts` exists but only handles subscription events (`subscription.create`, `charge.success` for subscriptions, `subscription.disable`, etc.). It looks up users in the `profiles` table — different lookup pattern than what an order webhook would need. | **Extend the existing webhook** to also handle storefront-order `charge.success` events (route by `metadata.order_id`), OR create a separate `paystack-order-webhook`. Recommendation: extend existing — Paystack only sends to one webhook URL per project. |
| Refund flow | Doesn't exist. | New work. Out of scope for first pass; design but defer. |

### Conflicts with the orphan marketplace foundation

- **`services/marketplace.ts:404-453` `getSubscriptionPlans()`** hardcodes pricing in kobo (`500000` = ₦5,000 Basic, `1500000` = ₦15,000 Pro). The live in-app pricing (per `STOREHOUSE-DEBUG.md` Section 5) is now Free/Starter/Pro at ₦0/₦5,000/₦10,000 (different tier names + Pro is ₦10k not ₦15k). Different schema, different tier names (`basic` vs `Starter`). **The orphan marketplace pricing is stale** — don't reuse without updating.
- **`users.subscription_tier`** (orphan, defined by marketplace migration) overlaps with **`user_subscriptions.tier_id`** (live, used by `aiUsageService.ts`, `getUserTier()`, etc.). The live tier system already exists. The orphan column should NOT be used by new code.
- **`users.store_slug`** (orphan column from marketplace migration) is shadowed by **`stores.store_slug`** (live column on a different table). The orphan column can be ignored.
- **`generate_store_slug()` RPC** uses `users.store_slug` for uniqueness check (line 231: `WHERE store_slug = final_slug` against `public.users`). The live slug system writes to `stores.store_slug`. **The RPC's uniqueness check is broken in practice** because it's checking the wrong table. If reused, fix this first.

### Things that ARE useful to keep / extend

- **`marketplace_analytics`** table is well-designed for tracking storefront/product views/clicks/inquiries. Ready to start writing if/when we add a "track this view" trigger to the storefront. Indexes already in place.
- **`payment_transactions`** is generic enough to hold storefront-order Paystack records too — its schema doesn't force a subscription. We'd just nullify `subscription_id` / `tier_id` for order rows, and add a new column like `order_id` if/when we create an `orders` table.
- **`paystack-webhook/index.ts`** — its HMAC verification code is solid (security audit-grade). Extending it for order events is cheaper than building a new webhook.
- **`products.public_visible`** column is what the orphan marketplace would have used — but the **live storefront flow already filters products** via `products.is_public` (different column, see `OnlineStoreSetup.tsx:872` etc). Worth confirming whether to consolidate on one or keep both.

---

## (f) Recommendations

### Keep and extend

1. **`payment_transactions` table** — add nullable `order_id UUID` (FK to a new `orders` table, when created); add `paystack_subaccount_code TEXT`, `platform_fee_kobo INTEGER`, `merchant_net_kobo INTEGER`. Use this table for storefront-order payment records too.
2. **`paystack-webhook/index.ts`** — extend the `switch` to also handle `charge.success` events with `metadata.order_id` set. Route order-webhook events to a new handler function inside the same file.
3. **`Cart.tsx` + `onlineStoreSales.ts`** — these are the live flow. Plan: replace the `PaystackPop.setup({ key: store.paystackPublicKey })` block with a fetch to a new edge function (`initialize-storefront-payment`) that returns initialization data with the subaccount + split set. Then PaystackPop can run with the platform's public key. `onlineStoreSales.ts` becomes the success-callback handler that creates an `orders` row (and per-item `order_items` rows) instead of denormalizing into `sales` directly. Sales row writes can move to webhook-driven post-payment confirmation.
4. **`stores` table** — add the new Paystack-subaccount columns here (the live store-identity table). NOT on `users`.

### Deprecate or leave alone

5. **Marketplace migration's orphan columns on `users`** (`store_slug`, `store_visible`, `store_description`, `store_banner_url`, `subscription_tier`, `verified`) — leave alone. Don't write to them. If we ever need them, migrate the data from `stores` first. **Do NOT use `generate_store_slug()` RPC** — its uniqueness check is against the wrong table.
6. **`services/marketplace.ts` + `MarketplaceSettings.tsx`** — leave orphan for now. They don't affect production. Revisit if/when we open the public-discovery marketplace (separate from per-store storefronts that already work). Don't import these into the new subaccount work.
7. **`subscriptions` table** (orphan) — leave alone. Live subscription system uses `user_subscriptions`.
8. **`moderation_queue` table** — leave alone until the public-discovery marketplace launches.
9. **`marketplace_analytics` table** — leave alone for now, but **earmark for storefront view-tracking** later. Schema fits.

### New work needed

10. **New edge function: `initialize-storefront-payment`** — accepts `{ store_id, items[], customer{}, total_kobo }`, computes the order, looks up the merchant's `stores.paystack_subaccount_code`, calls Paystack `/transaction/initialize` with `subaccount` + split params, returns the transaction reference + access code for the browser to launch.
11. **New table: `orders`** — `id`, `store_id`, `customer_*`, `subtotal_kobo`, `discount_kobo`, `total_kobo`, `platform_fee_kobo`, `merchant_net_kobo`, `paystack_reference`, `paystack_subaccount_code`, `status` (`pending|paid|cancelled|refunded`), `created_at`, `paid_at`, `cancelled_at`. RLS: store-owner SELECT own; service-role INSERT/UPDATE.
12. **New table: `order_items`** — `id`, `order_id` FK, `product_id`, `variant_id`, `product_name`, `quantity`, `unit_price_kobo`, `line_total_kobo`. Replaces the denormalized-into-sales pattern.
13. **New columns on `stores`** for Paystack subaccount: `paystack_subaccount_code`, `paystack_settlement_bank_code`, `paystack_account_number`, `paystack_account_name`, `paystack_subaccount_status`, `paystack_subaccount_percentage_charge`.
14. **Pre-existing bug to fix when convenient (separate ticket):** `onlineStoreSales.ts:91` `sale_channel` → `sales_channel` typo, AND the channel CHECK constraint needs `'online-store'` added to its allowed-list. Or: rename channel to one of the existing allowed values like `'website'`. Don't bundle with subaccount work.

---

## Summary

- The marketplace **schema scaffolding** (analytics, moderation, subscription, store/product visibility) is in place but **disconnected from production code**.
- The marketplace **service layer + settings UI** are built but unimported (`MARKETPLACE_ENABLED = false`).
- The **storefront / cart / Paystack flow IS live** but works via merchant-owned Paystack accounts with NO platform split, NO subaccount, NO `orders` entity. Writes one denormalized row per cart item to the `sales` table.
- For the Paystack subaccount work: **don't reuse the orphan marketplace foundation directly** — the schema overlaps awkwardly with live code, the slug uniqueness RPC is broken, and the pricing is stale. Add new tables (`orders`, `order_items`) and new `stores` columns instead, extend `payment_transactions` and `paystack-webhook`. Replace the browser-side `PaystackPop` init with a server-side `initialize-storefront-payment` edge function.

Files this doc was built from:
- `supabase/migrations/20250123_marketplace_ready_schema.sql`
- `supabase/migrations/20241226000001_payment_transactions.sql`
- `supabase/migrations/add-sales-channel.sql`
- `src/services/marketplace.ts`
- `src/components/MarketplaceSettings.tsx`
- `src/contexts/CartContext.tsx`
- `src/components/Cart.tsx`
- `src/components/Checkout.jsx`
- `src/components/CheckoutDemo.jsx`
- `src/utils/onlineStoreSales.ts`
- `src/pages/StorefrontPage.tsx`
- `supabase/functions/paystack-webhook/index.ts` (cross-reference)
- `supabase/functions/verify-transaction/index.ts` (cross-reference)
- `supabase/functions/verify-subscription/index.ts` (cross-reference)
- `supabase/functions/manage-subscription/index.ts` (cross-reference)
- `STOREHOUSE-DEBUG.md` Section 5 (live pricing/tier baseline)

Last verified: 2026-05-08. Re-verify before designing the subaccount work — especially the storefront-cart flow and the pre-existing `sale_channel` bug.
