# C1 Remediation Plan — Tenant Isolation (RLS) + Bank-Number Exposure

> **Status:** DIAGNOSIS + PROPOSED SQL. **Nothing applied.** All DB access used to
> build this was read-only (catalog introspection + `SET LOCAL ROLE` impersonation
> inside `BEGIN … ROLLBACK`). Verified live against production project
> `yzlniqwzqlsftxrtapdl` on 2026-06-04.
>
> Per the audit-doc-trust rule, the audit's proposed SQL (docs/AUDIT.md C1) was
> treated as a **claim to verify**, not truth. Three places where it is wrong or
> incomplete are corrected below (§3). Code/live win.
>
> ⚠️ **No staging clone exists yet.** This plan CANNOT go to prod without one — the
> lockout failure mode is silent (RLS that doesn't match the app's query returns
> zero rows with no error). Staging mechanism (branch vs backup-restore) is a
> separate decision.

---

## 0. BREACH CONFIRMED (live attacker simulation, PRODUCTION, read-only)

**Environment:** database `postgres`, cluster `main`, project `yzlniqwzqlsftxrtapdl`
(production). The Supabase MCP connection is the `postgres` role with
`rolbypassrls=true`, so every attacker query below explicitly dropped privilege to
`anon`/`authenticated` via `SET LOCAL ROLE` with the JWT-claims GUC set to match a
real (or absent) identity. The role each query ran as is shown in its own result,
not assumed. All queries wrapped in `BEGIN … ROLLBACK`; nothing written.

### As `anon` (the public key that ships in the browser; `auth.uid()` = null)

| Query | Result | Meaning |
|---|---|---|
| `SELECT count(*) FROM public.stores` | **16** | every store (16 rows / 16 tenants) |
| `SELECT count(*) FROM public.sales`  | **58** | every sale, all tenants |
| `SELECT id, business_name, user_id, account_number FROM public.stores LIMIT 5` | **5 rows** | other merchants' store + owner IDs |

The 5 store rows anon received:

| business_name | id | user_id (owner) | account_number |
|---|---|---|---|
| Carlos stores | 6083e513-… | d5497873-… | null |
| Chops&Shakes | 6c92c69c-… | cb339a5e-… | null |
| Cles_kreashun | 7d30db74-… | 2b71764a-… | null |
| Digital Maryanne | ccf3f95e-… | c16d7edf-… | null |
| DIVINE MERCY NIGERIA LIMITED | 70f17f5c-… | 9844f239-… | null |

`running_as = anon`, `auth_uid = null` confirmed in the result sets. If RLS were
protecting these tables, anon should have gotten `0`. It got everything.

> `account_number` came back `null` for these 5 rows — those merchants simply
> haven't set a manual-transfer bank account, NOT that it is hidden. The column is
> fully anon-readable; any merchant who has set one would have it exposed.

### As `authenticated` owner `d5497873-…` (Carlos stores' owner; JWT `sub` set so `auth.uid()` = them)

| Measure | Result |
|---|---|
| `count(*) FROM sales` (what this owner sees) | **58** |
| `count(*) FROM sales WHERE user_id = auth.uid()::text` (their OWN sales) | **0** |

**Cross-tenant leak proven.** A logged-in owner reads all 58 sales across the
platform while owning 0 of them. 58 (anon) = 58 (authenticated) = 58 (total) → no
isolation at any level. The only "scoping" is the client-side `.eq('user_id', uid)`
filter in browser JS — removable in devtools or bypassable by calling PostgREST
directly.

**Verdict: C1 is real and Critical, not theoretical.**

---

## 1. Per-table live state (verified)

| Table | RLS now | Scoping column → **type** | Existing policies | Cast needed? |
|---|---|---|---|---|
| `stores` | **off** | `user_id` → **text** (owner); `id` → uuid | **none** | `auth.uid()::text` |
| `users` | **off** | `id` → **text** | **none** | `auth.uid()::text` |
| `sales` | **off** | `user_id` → **text** | ✅ 4 owner policies, already `(user_id = (auth.uid())::text)` | already correct |
| `product_variants` | **off** | `user_id` → **text** | ✅ 4 owner policies, already `::text` | already correct |
| `staff_members` | **off** | **`store_owner_uid` → text** (NOT `store_id`) | **none** | `auth.uid()::text` |
| `staff_activity_logs` | **off** | **`store_owner_uid` → text** (NOT a `store_id` join) | **none** | `auth.uid()::text` |
| `products` | **on** ✅ | `user_id` → text | ✅ owner + public storefront read | (reference template) |

**Advisor (live):** 10× `rls_disabled_in_public` ERROR, 2× `policy_exists_rls_disabled`
ERROR (`sales`, `product_variants` — policies present but inert because RLS off),
1× `sensitive_columns_exposed` ERROR (`stores.account_number`).

**Existing policy predicates (verified via pg_policies):** `sales` and
`product_variants` policies all use `(user_id = (auth.uid())::text)` on each verb,
role `{public}`. `products` has owner policies + `"Anyone can view public products"
USING ((is_public = true) AND (is_active = true) AND (quantity > 0))` — the working
template for the storefront read pattern.

**Blast radius (live counts):** stores 16 / 16 owners; users 24; sales 58;
staff_members 2; ai_chat_messages 1,450 / 146 conversations.

---

## 2. How the app actually queries each table (lockout-safety basis)

| Table | Authenticated owner | Public / anon | Service / edge |
|---|---|---|---|
| `stores` | dashboard `.eq('user_id', uid)`; own row by `id` | **storefront `.select('*')` by slug / subdomain / custom_domain + `is_public=true`** (StorefrontPage.tsx 121-162) | F3 / webhooks read by id (service_role) |
| `users` | own row `.eq('id', uid)` (supabase-hooks.js:96); updates by `id` (BusinessSettings, StoreQuickSetup) | **marketplace `.eq('store_slug', slug).eq('store_visible', true)`** (marketplace.ts:126) | — |
| `sales` | `.eq('user_id', uid)` (supabaseSales.ts) | none | webhook dual-write (service_role) |
| `product_variants` | owner CRUD `.eq('user_id', uid)` | storefront via `product_variants_view` (SECURITY DEFINER view — bypasses table RLS) | — |
| `staff_members` | **owner-authenticated** `.eq('store_owner_uid', uid)` incl. **PIN login** (StaffPinLogin.tsx:67 passes `currentUser.uid` — owner already logged in) | **none anon** | — |
| `staff_activity_logs` | owner-scoped via `store_owner_uid` (text) | none | — |

**Key safety findings**
- **Staff PIN flow runs inside the owner's authenticated session.** `StaffPinLogin.tsx:67`
  → `authenticateStaffWithPin(currentUser.uid, pin)`. The owner logs in first; staff
  PIN-switch happens within that session, so `auth.uid()` = owner = `store_owner_uid`.
  A `staff_members` policy `store_owner_uid = auth.uid()::text` does NOT lock out the
  PIN flow. There is no anon staff read.
- **Storefront `stores` read is anon** and needs the `is_public` read policy to keep
  working.
- **`product_variants` storefront path goes through a SECURITY DEFINER view**, so
  enabling table RLS won't break it (verify on staging regardless).

---

## 3. Three audit corrections (audit SQL is wrong/incomplete here)

1. **Staff tables link via `store_owner_uid` (text), NOT `store_id`.** The audit's
   proposed `staff_members` / `staff_activity_logs` policies reference
   `staff_members.store_id` joined to `stores.id` — **those columns do not exist**.
   Live columns: `staff_members(id uuid, store_owner_uid text, name, phone, email,
   pin, role, is_active, …)`; `staff_activity_logs(id uuid, store_owner_uid text,
   staff_id uuid, action_type, …)`. Correct scoping is a **direct**
   `store_owner_uid = auth.uid()::text` — no join. The audit's join-based policy would
   fail to apply.

2. **`users` is dual-purpose — needs a public marketplace anon policy.** The audit
   proposed only `users_self_all USING (id = auth.uid()::text)`. But `users` doubles
   as the **marketplace storefront-profile table**: `marketplace.ts:126` reads it as
   anon by `store_slug` + `store_visible=true`. A self-only policy would return zero
   rows to anon and **break the public marketplace**. A second policy
   `users_public_marketplace_read FOR SELECT TO anon USING (store_visible = true)` is
   required.

3. **`stores.account_number` is intentionally-public manual-transfer data — the real
   leak is the OTHER private columns.** `account_number` (with `bank_name`,
   `account_name`) is the merchant's **manual bank-transfer payment account**, set by
   the owner with `is_public: true` (StoreSettings.tsx:333-337) and **deliberately
   shown to customers** for bank-transfer checkout (StorefrontPage.tsx:196-198 →
   1238). It is NOT the Paystack settlement/KYC account (that lives in
   `paystack_subaccounts` / `bank_accounts`). The advisor flag is technically true but
   semantically a feature. Moving `account_number` out of `stores` (the audit's
   suggestion) would **break manual-transfer checkout**. The real `stores` exposure is
   that `select('*')` under an anon `is_public` policy drags the whole row — including
   genuinely-private columns — to anon (see §4).

---

## 4. Bank-number / column-exposure analysis (Option A vs B)

Full `stores` column inventory split by intended audience:

| Public-by-design (OK on storefront) | Genuinely sensitive — should NOT reach anon |
|---|---|
| business_name, logo_url, store_slug, subdomain, custom_domain, bank_name, **account_number**, account_name, delivery_*, minimum_order, business_hours, days_of_operation, about_us, instagram_url, facebook_url, payment_methods, paystack_enabled, paystack_public_key, paystack_test_mode, paystack_subaccounts_enabled, wa_fallback_minutes, chat_widget_enabled | **user_id** (owner identity), **kyc_status / kyc_submitted_at / kyc_approved_at / kyc_rejected_at / kyc_rejection_reason**, **frozen / frozen_at / frozen_reason / frozen_by**, **domain_verification_token**, **is_admin**, paystack_subaccount_id, is_verified, created_at, updated_at |

- **Option A (preferred, lowest end-state risk):** create a `public_stores` view (and a
  `public_users_marketplace` view) exposing ONLY public-by-design columns; grant
  `SELECT` to anon; repoint the 3 StorefrontPage queries + the marketplace query at
  the views. Then the anon `is_public` RLS policy on the base table can be dropped
  (anon never reads the base table). Private columns become unreachable by anon
  regardless of `select('*')`. **Cost:** touches frontend (repoint a few queries).
- **Option B (RLS-only, interim):** `stores_public_read TO anon USING (is_public=true)`.
  Keeps storefront working immediately but **still exposes the sensitive columns above**
  to anyone who can read a public store row. The audit itself flags this as
  insufficient. **Not the end state.**

**Recommendation:** ship **Option B as the interim** (Stage 6 — closes all cross-tenant
writes and most read exposure immediately), then **Option A as the follow-up** (Stage 8 —
closes the residual column leak). Confirm you want the view-repoint (A) vs accepting B's
residual exposure.

---

## 5. Grants — what's safe to REVOKE

All six tables currently grant **full DML to both anon and authenticated**
(SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER). Once RLS is on and verified:

- **Safe to REVOKE from `anon`:** INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on
  all six — no legitimate anon path writes these tables (storefront/marketplace are
  SELECT-only; sales writes come via service_role webhook or the authenticated owner).
- **Keep anon SELECT only where a public read policy exists** (`stores`, `users`);
  REVOKE anon SELECT on `sales`, `staff_members`, `staff_activity_logs`,
  `product_variants` (no anon read path).
- **Do NOT broadly revoke from `authenticated`:** the owner dashboard does full CRUD as
  `authenticated`; RLS policies scope it to own rows. Revoking authenticated
  DELETE/UPDATE would break legitimate owner edits.
- `service_role` untouched (webhooks / edge).

Grants are **defense-in-depth, applied LAST** (Stage 7) — after RLS verified on every
table. A premature anon-SELECT revoke on `stores`/`users` would break the
storefront/marketplace before the read policy is confirmed.

---

## 6. Staged rollout order (one table at a time, app watched)

Lowest-risk / already-correct-policy tables first (prove the mechanism); public-facing
tables last (highest lockout blast radius). Never all at once.

| Stage | Table | Why this order | Risk |
|---|---|---|---|
| 0 | *(staging clone)* | Set up staging first — non-negotiable | — |
| 1 | `product_variants` | Policies already correct; storefront uses SECURITY DEFINER view (insulated). Pure ENABLE. | Low |
| 2 | `sales` | Policies already correct; no anon path. Pure ENABLE. | Low |
| 3 | `staff_activity_logs` | Owner-only, no public path, low traffic | Low |
| 4 | `staff_members` | Owner-only; PIN flow runs authenticated (verified) — but it is the auth gate, watch closely | Med |
| 5 | `users` | Dual-purpose: self + public marketplace — needs 2 policies | **High** |
| 6 | `stores` | Dual-purpose: owner + storefront — highest traffic, the bank-number table | **High** |
| 7 | grants | REVOKE anon DML (+ scoped SELECT) after all RLS verified | Med |
| 8 | `stores`/`users` column-safe views (Option A) | Closes the column leak the `is_public` policy leaves open | Med |

---

## 7. Proposed SQL per stage — UNAPPLIED

Each block is independently runnable (its own transaction). Convention matches existing
policies: role **`public`** with `auth.uid()`-based predicates (Supabase's existing
`sales`/`products` policies use `{public}`, which evaluates false for anon) rather than
the audit's `TO authenticated`, to stay consistent with what already works in this DB.

### Stage 1 — product_variants (policies already exist; enable only)
```sql
-- UNAPPLIED. Storefront reads variants via product_variants_view (SECURITY DEFINER) — unaffected.
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
```

### Stage 2 — sales (policies already exist; enable only)
```sql
-- UNAPPLIED. Existing 4 policies already use (user_id = (auth.uid())::text). No policy change.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
```

### Stage 3 — staff_activity_logs
```sql
-- UNAPPLIED. Real scoping column is store_owner_uid (text), NOT a store_id join.
ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_logs_owner_all ON public.staff_activity_logs
  FOR ALL TO public
  USING (store_owner_uid = auth.uid()::text)
  WITH CHECK (store_owner_uid = auth.uid()::text);
```

### Stage 4 — staff_members
```sql
-- UNAPPLIED. PIN login runs in the owner's authenticated session (auth.uid()=owner=store_owner_uid).
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_members_owner_all ON public.staff_members
  FOR ALL TO public
  USING (store_owner_uid = auth.uid()::text)
  WITH CHECK (store_owner_uid = auth.uid()::text);
```

### Stage 5 — users (self + public marketplace — TWO policies)
```sql
-- UNAPPLIED. id is text. Marketplace reads users as anon by store_slug+store_visible — MUST keep working.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_all ON public.users
  FOR ALL TO public
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Preserves the public marketplace profile read (marketplace.ts:126). Anon reads only visible rows.
-- NOTE: like stores, this exposes the full row to anon for visible users — the column-safe view
-- (Stage 8) is the follow-up to limit columns. Confirm `store_visible` is the right gate column.
CREATE POLICY users_public_marketplace_read ON public.users
  FOR SELECT TO anon
  USING (store_visible = true);
```

### Stage 6 — stores (owner + storefront)
```sql
-- UNAPPLIED. user_id is text. Storefront reads as anon by slug/subdomain/domain + is_public=true.
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY stores_owner_all ON public.stores
  FOR ALL TO public
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Interim public read (Option B): keeps storefront working immediately. Still exposes private
-- columns (kyc_*, frozen_*, user_id, domain_verification_token, is_admin) to anon — Stage 8 closes that.
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);
```

### Stage 7 — grants (defense-in-depth, AFTER all RLS verified)
```sql
-- UNAPPLIED. Run only once Stages 1-6 are verified working in prod.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.stores, public.users, public.sales, public.staff_members,
     public.staff_activity_logs, public.product_variants
  FROM anon;
-- Remove anon SELECT where there is NO public read path:
REVOKE SELECT ON public.sales, public.staff_members,
                 public.staff_activity_logs, public.product_variants
  FROM anon;
-- Keep: anon SELECT on stores + users (gated by the public read policies above);
--       all authenticated DML (owner dashboard); all service_role.
```

### Stage 8 — column-safe public views (Option A; closes the column leak)
```sql
-- UNAPPLIED. Follow-up: repoint StorefrontPage (3 queries) and marketplace.ts to these views,
-- exposing ONLY public-by-design columns; then anon never reads the base tables.
CREATE OR REPLACE VIEW public.public_stores
WITH (security_invoker = true) AS
  SELECT id, store_slug, subdomain, custom_domain, business_name, logo_url,
         bank_name, account_number, account_name,          -- intentionally public for manual transfer
         delivery_areas, delivery_fee, minimum_order, business_hours, days_of_operation,
         about_us, instagram_url, facebook_url, payment_methods,
         paystack_enabled, paystack_public_key, paystack_test_mode,
         paystack_subaccounts_enabled, wa_fallback_minutes, chat_widget_enabled
  FROM public.stores
  WHERE is_public = true;   -- EXCLUDES: user_id, kyc_*, frozen_*, domain_verification_token, is_admin
-- (Define public_users_marketplace similarly from the marketplace.ts select list.)
```

---

## 8. Post-apply check per stage (the real app query that proves no lockout)

Run as the relevant role on staging (and watch the live app after each prod stage).
PASS = rows returned for a legit owner/visitor.

| Stage | Check (as authenticated owner unless noted) | PASS criteria |
|---|---|---|
| 1 product_variants | Owner dashboard product list; `select * from product_variants where user_id=<owner>` as that owner | owner sees own variants; storefront product page (anon, via view) still renders variants |
| 2 sales | Dashboard sales/reports load (`.eq('user_id',uid)`); record a sale | own sales visible; insert succeeds; another owner's sales NOT visible |
| 3 staff_activity_logs | Open staff activity view | own logs visible; cross-owner empty |
| 4 staff_members | **Staff PIN login** (critical) + StaffManagement list | PIN auth still succeeds (owner session); staff list non-empty; cross-owner empty |
| 5 users | (a) login → own profile loads (supabase-hooks:96); (b) **anon**: open a marketplace store by slug (marketplace.ts:126) | (a) own row returns; (b) marketplace store still loads as anon |
| 6 stores | (a) dashboard loads store (`.eq('user_id',uid)`); (b) **anon**: open `/store/:slug`, custom domain, subdomain | (a) own store loads + editable; (b) all 3 storefront strategies still resolve |
| 7 grants | Re-run 1-6; attempt anon write to `stores` | legit paths still PASS; anon INSERT/UPDATE rejected |
| 8 views | Storefront + marketplace via views; inspect anon payload | public fields present, `kyc_status`/`user_id` absent |

**Cross-tenant probe (any stage, as authenticated owner A):**
`select count(*) from <table>` should return only A's rows, not all 16 tenants'.
(This is exactly the test that returned 58/owns-0 in §0 before the fix.)

---

## 9. Rollback per table (fast un-lock if a tenant is locked out)

Per-table, instant, no data touched:
```sql
-- Immediate un-lock for table X (reverses one stage):
ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- Policies remain defined but inert (harmless); re-enabling later needs only ENABLE again.

-- Grants-stage rollback is the inverse GRANT:
--   GRANT INSERT, UPDATE, DELETE, SELECT ON public.<tables> TO anon;
```
Each stage enables exactly one table, so a lockout is isolated to that table and
reversed by a single `DISABLE ROW LEVEL SECURITY`. The CLAUDE.md "promote last good
Vercel deploy" note is NOT the right lever — this is a DB-side change; the lever is
`DISABLE ROW LEVEL SECURITY` on the offending table. Keep a psql session ready during
each prod stage.

---

## 10. Open decisions / caveats

1. **Staging clone does not exist yet.** This plan cannot reach prod without it — the
   lockout failure mode is silent (empty results, no error). Decide staging mechanism
   (Supabase branch vs backup-restore) separately.
2. **Two runtime assumptions to confirm on staging:** (a) `users.store_visible` is the
   correct marketplace gate column; (b) `product_variants_view` truly insulates the
   storefront from base-table RLS. Both inferred from code, provable only at runtime.
3. **Bank-number recommendation is Option A (column-safe view)** but it touches frontend
   — confirm view-repoint vs accepting Option B's residual column exposure as interim.
4. **Out of C1 scope but flagged:** 4 other tables also show `rls_disabled_in_public`
   (`ai_chat_rate_limits`, `green_api_pool`, `whatsapp_debug_log`,
   `sales_units_backup_20260530`). Not tenant-isolation core. `sales_units_backup_20260530`
   should likely just be dropped; the others need their own analysis.

---

_Generated 2026-06-04. Read-only diagnosis; no changes applied to code or database._
