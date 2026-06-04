# Storehouse / SmartStock — Permanent Debugging & Audit Reference

> **Generated:** 2026-06-04 by a six-agent read-only audit (Lead + Storefront,
> Dashboard+Shared, Database, Edge+Integrations, Verifier).
> **Ground truth:** the checked-out branch **`main` @ `c92cdea`** ("feat(paystack):
> enable Free tier card payments"). Prior docs (CODEBASE_MAP.md, PAYSTACK-DEBUG.md,
> WORKING-PATTERNS.md, CLAUDE.md session logs) were snapshotted on the older
> `feat/kyc-wizard-v1` and are **stale** — they were treated as claims to verify, not
> truth. Where code and docs disagree, **code wins**; the gaps are recorded in §3.5.
> **Method:** dead-code via exhaustive 0-reference grep across ALL call sites; live DB
> via Supabase MCP **read-only** introspection (`pg_proc`, `pg_policies`,
> `pg_class.relrowsecurity`, `information_schema` grants, the security advisor) on
> project `yzlniqwzqlsftxrtapdl`. `knip`/`madge`/`tsc` are **not installed** in this
> mirror; `vite`/`eslint` are present but `eslint`/`vite build` were sandbox-denied
> (environment artifact, not a code defect). The repo is an intentionally read-only
> mirror — any EACCES / read-only-fs error is an environment artifact.
>
> **EVERY fix in this document is PROPOSED, never applied.** This was a look-only
> audit. Nothing in the repo or database was changed. The single write in the entire
> run is this file.
>
> ## ⚠️ A static audit CANNOT prove the live payment path works end-to-end.
> All fee-math and split-routing verdicts here are static (code + prior spike logs).
> A real **live-mode Paystack test transaction** (test card `4084 0840 8408 4081`,
> compare the verify-API `fees_split` against the F3 breakdown) is still required
> before trusting the money path with real merchants.

---

# PART 3 — FINDINGS

> Persisted first (per the brief) because it is the most important content.
> Two axes per finding: **Severity** (Critical = blocks onboarding, loses money, or
> leaks data | High | Med | Low) and **Confidence** (Proven = artifact attached |
> Likely | Suspected). Suspected items carry the exact ≤2-min check.

## 3.1 — The four CRITICALs (in priority order)

---

### C1 — [CRITICAL / Proven] Tenant isolation is broken: RLS DISABLED on core tenant tables; anon+authenticated have full table grants; merchant bank account numbers exposed

**What.** Row-Level Security is **turned off** on the core multi-tenant tables, and the
public PostgREST roles (`anon`, `authenticated`) hold full DML grants on them. The
entire dashboard's tenant scoping is a **client-side** `.eq('user_id', uid)` filter
using the browser-embedded anon key. With RLS off, that filter is the *only* barrier —
remove it and the REST endpoint returns every tenant's rows.

**Evidence (live, 2026-06-04, project `yzlniqwzqlsftxrtapdl`):**
- `pg_class.relrowsecurity = false` on: `users`, `stores`, `sales`, `staff_members`,
  `staff_activity_logs`, `product_variants` (also `ai_chat_rate_limits`,
  `green_api_pool`, `whatsapp_debug_log`, `sales_units_backup_20260530`).
- Supabase security advisor: `rls_disabled_in_public` **ERROR ×10** (lists the tables
  above), `policy_exists_rls_disabled` **ERROR ×2** (`sales`, `product_variants` have
  owner-scoped policies written but RLS off → the policies are **inert**),
  `sensitive_columns_exposed` **ERROR ×1**: *"Table `public.stores` is exposed via API
  without RLS and contains potentially sensitive column(s): `account_number`."*
- `information_schema.role_table_grants` (run by the Verifier): **both `anon` and
  `authenticated`** hold `SELECT/INSERT/UPDATE/DELETE` (+ TRUNCATE/REFERENCES/TRIGGER)
  on all six tables. No compensating REVOKE.
- Client scoping is purely client-side: `src/lib/supabase-hooks.js` (`useStore`,
  `useProducts`, `useSales`), `src/services/supabaseSales.ts`,
  `src/services/supabaseProducts.js` all filter with `.eq('user_id', uid)` where `uid`
  is supplied by the (tamperable) client. The anon key ships in the JS bundle.
- **Blast radius (live counts):** `stores` 16 rows / 16 distinct owners; `users` 24 / 24;
  `sales` 58; `staff_members` 2; `ai_chat_messages` 1,450 / 146 conversations.
  `distinct_owners == rows` for stores and users → **every tenant is exposed**, not a
  subset.

**Why Critical.** Any internet user with the public anon key (it is, by design, public)
can read or write **every merchant's** store config, sales, user PII, and — via
`stores.account_number` — **settlement bank account numbers**, by calling PostgREST
directly and omitting the `user_id` filter. This is a cross-tenant data + financial-PII
breach, confirmed by direct introspection and the platform's own advisor.

**Root cause.** `sales` and `product_variants` *have* correct owner-scoped policies in
the migration files, but RLS was disabled in production (out-of-band, via dashboard).
`stores`/`users` never had RLS enabled live. This is migration-vs-live **drift**
(see §3.6) — the migrations describe a more secure state than production actually runs.

#### PROPOSED FIX — exact SQL (⚠️ UNAPPLIED — TEST BEFORE APPLYING)

> **⚠️ TEST-BEFORE-APPLY WARNING.** The scoping columns are **`text`**, not `uuid`
> (verified live: `stores.user_id`, `sales.user_id`, `users.id`,
> `product_variants.user_id` are all `text`; `stores.id` and `staff_activity_logs.staff_id`
> are `uuid`). `auth.uid()` returns `uuid`. **Every policy below casts `auth.uid()::text`.**
> If you instead write `auth.uid() = user_id` Postgres raises `operator does not exist:
> uuid = text` and the query fails. Worse: **enabling RLS on a table whose live client
> queries don't line up with the new policy will lock every user out of their own data
> with no error in the UI — just empty results.** Apply on a branch/staging clone first,
> run the app's read paths against it, and roll out one table at a time with the app
> watched. `product_variants` and `sales` already have policies — for those you only need
> to ENABLE RLS (after confirming the existing policy predicates use the `::text` cast).

```sql
-- ============================================================================
-- PROPOSED tenant-isolation remediation for C1.  DO NOT run blind.
-- Run inside a transaction on a STAGING CLONE first; verify app read paths;
-- then promote one table at a time.  Columns are TEXT — note the ::text casts.
-- ============================================================================
BEGIN;

-- ---- stores -----------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
-- Owner full access (owner identified by stores.user_id = auth uid, both as text):
CREATE POLICY stores_owner_all ON public.stores
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
-- Public storefront needs to read ONLY public stores (no bank columns should be
-- selected by the storefront query — audit the storefront select list separately):
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);
-- NOTE: stores.account_number must NOT be reachable by anon. Either (a) move
-- settlement columns to a separate RLS-protected table, or (b) rely on a column-
-- restricted view for the public storefront. Enabling RLS alone still lets an
-- authenticated *owner* read their own row; the anon public-read policy above is
-- scoped to is_public rows and still exposes account_number to anyone who can read
-- a public store row. STRONGLY prefer moving account_number out of `stores`.

-- ---- users ------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_all ON public.users
  FOR ALL TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- ---- sales (policies already exist; just enable + verify they use ::text) ----
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
-- Existing migration policies are owner-scoped (user_id = auth.uid()::text). If they
-- are NOT cast to text they will error — drop & recreate:
-- DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;  -- (repeat per verb)
-- CREATE POLICY sales_owner_all ON public.sales FOR ALL TO authenticated
--   USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- ---- product_variants (policies exist; enable + verify cast) -----------------
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
-- variants_*_own policies already present; confirm predicate uses ::text against
-- product_variants.user_id (text). Storefront reads variants via product_variants_view
-- (a SECURITY DEFINER view — see C-misc); confirm that path still works post-enable.

-- ---- staff_members / staff_activity_logs ------------------------------------
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
-- Scope staff rows to the owning store's owner. staff_members has no user_id; it
-- links via store. Confirm the actual FK column name before applying:
CREATE POLICY staff_members_owner_all ON public.staff_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s
                 WHERE s.id::text = staff_members.store_id::text
                   AND s.user_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s
                 WHERE s.id::text = staff_members.store_id::text
                   AND s.user_id = auth.uid()::text));

ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_logs_owner_read ON public.staff_activity_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_members m
                 JOIN public.stores s ON s.id::text = m.store_id::text
                 WHERE m.id = staff_activity_logs.staff_id
                   AND s.user_id = auth.uid()::text));

-- ---- revoke the over-broad table grants (defense in depth) -------------------
-- The public roles should not hold blanket DML once RLS is the gate. Tighten to
-- the minimum each surface needs (verify nothing legitimate breaks first):
-- REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--   ON public.stores, public.users, public.sales, public.staff_members,
--      public.staff_activity_logs, public.product_variants
--   FROM anon;

COMMIT;
-- After COMMIT: re-run the security advisor; rls_disabled_in_public for these
-- tables should clear. Then exercise: owner dashboard read/write, storefront public
-- read, staff PIN flow. Watch for silent empty-result regressions.
```

---

### C2 — [CRITICAL / Proven] KYC reviewer RPCs (and affiliate-increment RPCs) are PUBLIC-executable with no internal owner/reviewer check — privilege escalation

**What.** `approve_kyc_review`, `reject_kyc_review`, `grant_velocity_override` are
`SECURITY DEFINER`, granted EXECUTE to `PUBLIC` + `anon` + `authenticated`, with **no
internal check that the caller is the reviewer/owner** (only a state check). Any
authenticated (and per ACL, even anonymous) user can call them.

**Evidence (live `pg_proc`, 2026-06-04):**
- ACL on `approve_kyc_review`, `reject_kyc_review`, `grant_velocity_override`,
  `submit_kyc_v1`, `check_chat_quota`, `get_user_tier`, and
  `increment_affiliate_clicks/signup/conversion`:
  `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres,
  service_role=X/postgres}` — the leading `=X` = **PUBLIC EXECUTE**.
- `proconfig = null` on all of them → **no `search_path` pinned** (search-path-hijack
  exposure; bodies use unqualified table names).
- Verifier read `prosrc` for the three KYC RPCs: **no `auth.uid()` reviewer/owner
  guard** — `approve_kyc_review` flips `vendor_kyc.status='approved'` **and**
  `stores.kyc_status='approved'` for any `p_kyc_id`; the only gate is a status check
  (`status='submitted'`), which is a state check, not an authorization check.
- The migration file comments claim *"PUBLIC has no EXECUTE"* — **factually false**;
  no `REVOKE` is ever issued (plpgsql defaults EXECUTE to PUBLIC).
- **Contrast (correctly hardened):** `approve_review`, `reject_review_and_freeze`,
  `record_successful_payment`, `complete_subaccount_onboarding` have ACL
  `{postgres=X, service_role=X}` and `proconfig = {search_path=public}`. So the
  split-transaction RPC set was secured; the KYC + affiliate + chat set was missed.
- Supabase advisor corroborates: `anon_security_definer_function_executable` **WARN ×39**,
  `authenticated_security_definer_function_executable` **×39**,
  `function_search_path_mutable` **×53**.

**Why Critical.**
- **Self-approve KYC:** any user calls `approve_kyc_review(<their own kyc id>)` →
  `stores.kyc_status='approved'`, satisfying the F2/F3 onboarding gate (chains with C4).
- **Raise own AML caps:** `grant_velocity_override(<own store>, huge caps)` defeats
  velocity limiting.
- **Freeze any competitor:** `reject_kyc_review(<victim kyc>, freeze=true)` → DoS a rival
  merchant.
- **Inflate own affiliate earnings:** `increment_affiliate_conversion(<own affiliate>,
  commission)` with no owner check.

#### PROPOSED FIX (UNAPPLIED)
```sql
-- For each: remove PUBLIC execute, pin search_path, add a caller check inside the body.
REVOKE ALL ON FUNCTION public.approve_kyc_review(uuid, text)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_kyc_review(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_velocity_override(uuid, bigint, bigint, bigint, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_affiliate_clicks(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_affiliate_signup(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_affiliate_conversion(uuid, bigint) FROM PUBLIC, anon, authenticated;
-- Then ALTER each: ALTER FUNCTION ... SET search_path = public;
-- And recreate the KYC reviewer functions with an internal guard, e.g.:
--   IF auth.uid() <> 'dffba89b-869d-422a-a542-2e2494850b44'::uuid  -- Phase-1 single reviewer
--      THEN RAISE EXCEPTION 'forbidden_not_reviewer'; END IF;
-- Affiliate increments: add an owner check (affiliate belongs to auth.uid()) OR make
-- them service_role-only and call them from a trusted edge function.
```
**Note:** the reviewer endpoints (`approve-transaction-for-fulfillment`,
`reject-transaction-and-freeze`) already enforce `REVIEWER_USER_ID` at the edge layer —
but the **KYC** RPCs are reachable directly via PostgREST RPC, bypassing any edge gate.
That direct-RPC path is the hole.

---

### C3 — [CRITICAL / Proven] `verify-subscription` grants a paid tier on a client-supplied email that is never bound to the caller's JWT identity

**What.** The function trusts a `customerEmail` from the request body, looks up a Paystack
subscription by that email, and writes the resulting paid tier to the **JWT caller's**
`user_id` — without ever checking that the email belongs to the caller.

**Evidence (`supabase/functions/verify-subscription/index.ts`, deployed ACTIVE v76,
`verify_jwt:true`):**
- `:16` `const { customerEmail, planCode, subscriptionCode } = await req.json()` — email
  is client-controlled.
- `:37` `supabase.auth.getUser(jwt)` authenticates `user` — but `user.email` is **never
  compared** to `customerEmail`, and is never used.
- `:92` Paystack subscription matched on the client-supplied email
  (`sub.customer.email === customerEmail && sub.plan.plan_code === planCode`).
- `:238` the tier grant writes `user_subscriptions` keyed on JWT `user.id`.
- Verifier: the `subscriptionCode` branch bypasses **both** the 5-minute recency window
  **and** the email filter — supply any valid `subscriptionCode` and the matched tier is
  written to your own `user.id`.
- Reachability confirmed: called from `src/components/SubscriptionUpgrade.tsx:657`
  (backup polling loop).

**Why Critical.** An authenticated attacker submits someone else's email (or a
self-created test-mode subscription's code) and **grants themselves a paid tier** off a
payment they didn't make. The payer identity (email) and grantee identity (JWT user_id)
are fully decoupled.

**Sibling (Med / Proven).** `verify-transaction` (the safer `onSuccess` path) *does*
verify the transaction server-side against Paystack, but (a) does **not** bind
`transaction.customer.email` to the JWT user, and (b) does **not** check the paid amount
against the tier price (`planCode` is client-supplied, `verify-transaction/index.ts:172`).
A user could pay the cheapest plan and pass a more expensive `planCode`.

#### PROPOSED FIX (UNAPPLIED)
- In `verify-subscription`: ignore body `customerEmail`; derive the email from the
  verified JWT (`user.email`); reject if the Paystack subscription's `customer.email`
  ≠ `user.email`. Remove or also-bind the `subscriptionCode` fast-path.
- In `verify-transaction`: assert `transaction.customer.email === user.email` and
  `transaction.amount >= <tier price for the resolved planCode>`; resolve `planCode`
  server-side from the verified amount rather than trusting the client.

---

### C4 — [CRITICAL / Proven] Public, unauthenticated `/spike/paystack-v2` route wired to the live payment function with a hardcoded production store

**What.** A spike whose own commit message says *"do not merge"* (f51e91a) is merged into
`main` and exposed as a **public** route that calls the live storefront-payment edge
function against a hardcoded real store.

**Evidence:**
- `src/AppRoutes.jsx:53` `const V2SpikeTest = lazy(() => import('./pages/V2SpikeTest.tsx'))`.
- `src/AppRoutes.jsx:556` `<Route path="/spike/paystack-v2" element={<V2SpikeTest />} />`
  sits in the **public block** (grouped with `/store/:slug`, `/invoice/:id`, `/a/:shareCode`
  under the comment *"Public storefront - accessible without login"*); the nearest
  `</ProtectedRoute>` closes at line **534**, above it — **no auth gate**.
- `src/pages/V2SpikeTest.tsx:5-6` hardcodes `STORE_ID='d93cd891-7e0a-47a8-9963-5e2a00a2591f'`
  + `PRODUCT_ID='926335ce-…'`; `:16` `supabase.functions.invoke('initiate-storefront-payment', …)`;
  `:51` `new PaystackPop()`. No `import.meta.env.DEV` / `NODE_ENV` guard; `lazy()` does
  **not** tree-shake it out of prod (it code-splits into a reachable chunk).
- Live confirmation that the hardcoded store passes every per-store F3 gate:
  `paystack_subaccounts_enabled=true, frozen=false, kyc_status='approved',
  active_subaccounts=1`.
- `initiate-storefront-payment` is deployed ACTIVE v69 (`verify_jwt:false`, anonymous).

**Why Critical.** Anyone who knows the URL can create real `orders`/`order_items`/
`paystack_split_transactions` rows and trigger live Paystack `initialize` calls against
that merchant's subaccount.

**⚠️ RESIDUAL GATE (verify out-of-band).** F3 returns `503 feature_disabled` unless the
global edge secret **`ENABLE_PAYSTACK_SUBACCOUNTS = 'true'`**. Per the CLAUDE.md handoff
this is `false` in production, which would make the spike **503 today**. I could not read
edge-function secrets (read-only audit). **Severity stays CRITICAL** because (a) it is an
unauthenticated public route wired to a live money endpoint against an approved real
store, and (b) it becomes live the instant that flag flips — which this codebase is
actively driving toward (Free-tier card payments just shipped). **Confirm the flag with
`supabase secrets list --project-ref yzlniqwzqlsftxrtapdl | grep ENABLE`.**

#### PROPOSED FIX (UNAPPLIED)
Delete `src/pages/V2SpikeTest.tsx`, its lazy import (`AppRoutes.jsx:53`), and its route
(`AppRoutes.jsx:556`). If kept for QA, wrap in `<ProtectedRoute>` **and** gate behind an
admin/`import.meta.env.DEV` check, and never hardcode a production store id.

## 3.2 — High-severity findings

### H1 — [HIGH / Proven] Legacy `paystack-webhook` uses wrong signature crypto (plain SHA-512, not HMAC) — still deployed
- `supabase/functions/paystack-webhook/index.ts:46-49` computes
  `crypto.subtle.digest('SHA-512', secretKey + body)` — a salted hash of the
  concatenation, **not** HMAC-SHA512 — and compares with non-constant-time `!==` (`:54`).
  Paystack signs with HMAC-SHA512.
- The new `paystack-webhook-router` (deployed ACTIVE **v4**, the newest deploy) does it
  correctly: `crypto.subtle.importKey({name:'HMAC',hash:'SHA-512'})` + `sign` over the
  **raw** body (`req.text()` before `JSON.parse`) + constant-time `timingSafeEqualHex`
  (`paystack-webhook-router/index.ts:46-67, 82-91`).
- Legacy `paystack-webhook` is **still ACTIVE (v71, `verify_jwt:false`)**; so is
  `paystack-subaccount-webhook` (v58).
- **Honest framing (Verifier correction):** a wrong-algorithm check is **not** a
  signature *bypass* — an attacker still cannot produce a value matching an unguessable
  hash. Its real impact is that it would **401-reject all genuine Paystack subscription
  webhooks**. So this is a **latent functional bug**, not an active breach. Its
  consequence depends entirely on **which URL the Paystack dashboard actually calls** —
  which I cannot read.
- **Doc-vs-code:** `docs/MARKETPLACE-INVENTORY-2026-05-08.md` calls the legacy webhook
  *"HMAC SHA-512 … security audit-grade"* — **false**; code wins.

**⚠️ RESIDUAL GATE (verify out-of-band).** Check the Paystack dashboard webhook URL.
- If it points at `paystack-webhook-router` → legacy is dead-wrong standby code (lower
  severity; undeploy it).
- If it still points at the legacy `paystack-webhook` → **all subscription webhooks are
  silently failing** (partly masked by the client-driven `verify-subscription` fallback,
  which is itself flawed — see C3).

**PROPOSED FIX:** confirm the dashboard points at `paystack-webhook-router`; then
undeploy/delete `paystack-webhook` and `paystack-subaccount-webhook`.

### H2 — [HIGH / Proven] `whatsapp-webhook` has no signature/auth verification
- `supabase/functions/whatsapp-webhook/index.ts` (deployed ACTIVE, `verify_jwt:false`)
  reads the body, looks up the shop by phone, calls Claude (Anthropic), and sends a
  WhatsApp reply — with **no** Twilio `X-Twilio-Signature` / 360dialog shared-secret
  check. Anyone can POST forged payloads to burn Claude + Twilio credits and inject
  messages. Per-shop `increment_chat_usage` limits blast radius but not forgery.
- **PROPOSED FIX:** verify the Twilio `X-Twilio-Signature` (HMAC of URL+params with the
  auth token) / the 360dialog webhook secret before processing.

### H3 — [HIGH (launch) / Proven] F3's three inserts are not transactional; no orphan-reconcile cron
- `supabase/functions/initiate-storefront-payment/index.ts` inserts `orders`,
  `order_items`, `paystack_split_transactions` as three separate PostgREST calls with no
  surrounding transaction (self-documented at the insert block + TODO). Partial failure
  leaves orphan `pending` orders or orders without ledger rows. No `initiate_storefront_order`
  RPC and no reconcile cron exist yet.
- Acceptable for the current mock/pre-volume state; **must land before real merchant
  volume.** **PROPOSED FIX:** wrap the three inserts in one `SECURITY DEFINER` RPC
  (`initiate_storefront_order`) + an orphan-reconcile cron.

### H4 — [HIGH / Proven] Affiliate fraud via permissive INSERT policies + public increment RPCs
- Live policies: `affiliate_sales` INSERT `WITH CHECK (true)` (`sales_insert_service`),
  `affiliate_clicks` INSERT `WITH CHECK (true)` (`clicks_insert_all`). Combined with the
  public `increment_affiliate_*` RPCs (C2), an authenticated user can forge attributed
  sales/clicks and inflate their own commission.
- **PROPOSED FIX:** restrict these INSERTs to `service_role`; add owner checks to the
  increment RPCs (C2).

## 3.3 — Medium / Low findings

| ID | Sev/Conf | Finding | Evidence | Proposed fix |
|----|----------|---------|----------|--------------|
| M1 | Med/Proven | F3 trusts client `unit_price_kobo`; no server-side product-price re-read | `initiate-storefront-payment/index.ts:179, 334-341` | Look up `products.price` by `product_id` server-side; ignore client price |
| M2 | Med/Proven | Dispute/refund/`transfer.failed` events silently no-op'd | `_shared/paystack-router.ts` (no `charge.dispute.*`/`refund.*` case → 'unknown'); subaccount-handler 96-103 | Add dispute/refund handlers (freeze / balance adjust) before real money |
| M3 | Med/Proven | `generate-embedding` unauthenticated, OpenAI-cost | `generate-embedding/index.ts` (no auth) | JWT or rate-limit |
| M4 | Med/Proven | `ai_chat_messages`/`ai_chat_conversations` wide-open policies (RLS *on*, policies `USING(true)`) → cross-tenant chat PII read+write | live `pg_policies`: `temp_allow_all_messages` (ALL true), `Everyone can view all messages` (SELECT true), `Allow all message inserts`; advisor `rls_policy_always_true` ×18 | Replace `USING(true)` with a per-conversation server-issued token scheme. **Mechanism note:** this is a *policy* fix, NOT enable-RLS (RLS is already on) |
| M5 | Med/Proven | `payment_transactions` SELECT `USING(true)` policy variants present in migrations; live SELECT is `auth.uid()=user_id` (OK) but verify no stray permissive policy | live `pg_policies` on `payment_transactions` (3 policies, owner-scoped) | Confirm only owner-scoped SELECT remains |
| M6 | Med/Proven | `verify-transaction` no amount-vs-tier check, no email→JWT bind | `verify-transaction/index.ts:172, 211-224` | See C3 sibling |
| M7 | Med/Proven | `check_chat_quota` SECURITY DEFINER, granted `anon`, no owner check, no `search_path` | live `pg_proc` ACL | REVOKE anon; add owner check; pin search_path |
| L1 | Low/Proven | `VITE_SUPABASE_SERVICE_ROLE_KEY` read in client | `src/lib/supabase.js:6,14` (benign today; footgun if the VITE_-prefixed var is ever set → service key in bundle) | Delete the line + log ref |
| L2 | Low/Proven | `supabase.raw(...)` runtime-bug — but only in DEAD code | `subscriptionService.ts:277` `incrementAIChatUsage`, `supabase-variants.ts:292` `getLowStockVariants`; no `raw` in supabase-js v2; 0 callers | Delete the dead functions |
| L3 | Low/Proven | Cost/profit PIN uses trivial non-crypto hash in localStorage | `pinService.ts:61-72` (gates display only) | Acceptable v1; switch to the stubbed `ApiPinService` when needed |
| L4 | Low/Proven | Staff write-RBAC is cosmetic (`return true`) | `StaffContext.tsx:101-129` | Enforce server-side (RLS) if cashier write-restriction is required |
| L5 | Low/Proven | Subaccount card path drops promo/discount | `Cart.tsx:517-523, 625` (sends no discount; hardcodes `discount:0`) | Disable promo UI on that path or thread discount through F3 (server-validated) |
| L6 | Low/Proven | Subaccount fee breakdown not shown before commit | `Cart.tsx:587` (`subaccountBreakdown` set only after F3 call fires the popup) | Pre-fetch a quote / compute closed-form for display before Pay click |
| L7 | Low/Proven | Legacy v1 own-key path: client `Math.random` ref + marks order paid without server verify | `Cart.tsx:247`; `onlineStoreSales.ts:88` | Migrate own-key merchants to verify-on-server, or deprecate path |
| L8 | Low/Proven | `PublicInvoiceView` exposes full customer PII keyed only on raw invoice UUID (no share token), writes `viewed_at` on view | `PublicInvoiceView.tsx:42-49, 61-68` | Add a `public_token`-gated query (mirror `ContributionPublicView`'s `share_code`), or confirm anon-SELECT RLS on `invoices` |
| L9 | Low/Proven | 6 `security_definer_view`s | advisor: `product_variants_view`, `product_review_stats`, `invoice_summary`, `member_payment_status`, `public_product_reviews`, `store_conversations` | Review each; recreate as `security_invoker` where the caller's RLS should apply |
| L10 | Low/Proven | In-memory IP rate limiters are per-isolate, not global | F1/F2/F3 `rateLimitBuckets = new Map` | Move to Upstash/Redis before scale |
| L11 | Low/Proven | `BYPASS_KYC_FOR_SMOKE` bypasses KYC gate in F2/F3 | self-documented in both functions | Confirm unset in prod before merchant #2 (`supabase secrets list`) |
| L12 | Low/Proven | Hardcoded single `REVIEWER_USER_ID` | reviewer endpoints | `reviewers` table (planned) |

## 3.4 — Findings the brief flagged that are CLEARED with evidence

- **Business-tier missing `platform_fee_config` row → NOT a live blocker.** Live
  `platform_fee_config`: `free`(100bp), `starter`(50bp), `pro`(0bp), all `active=true`;
  **no `business` row**. But `supabase/functions/_shared/tier-resolver.ts:68-71` maps any
  non-`{free,starter,pro}` tier (incl. `business`) to `free` **before** the fee lookup,
  and `get_user_tier` does the same. So Business merchants resolve to the active Free
  row. **Residual risk:** if the Free row is ever deactivated, all Free+Business checkout
  returns `500 no_fee_config_for_tier`.
- **Sentry is WIRED, not abandoned.** `@sentry/react ^10.34.0`, `@sentry/vite-plugin
  ^4.6.2`, `@sentry/node ^10.38.0` in `package.json`; `src/main.jsx:21,24` imports and
  calls `initializeSentry()` first; `src/lib/sentry.ts` is real. *Recommend confirming the
  DSN env var is set in Vercel so events actually ship.*
- **WhatsApp + Claude are IN-REPO.** Live WhatsApp logic = `whatsapp-webhook` edge fn +
  `src/components/WhatsAppAISettings.tsx`; provider = **Twilio + 360dialog** (no Green
  API anywhere — doc claim stale); AI brain = **Claude Haiku**
  (`whatsapp-webhook/index.ts:5,146,170-178`, model `claude-3-haiku-20240307`). The doc's
  "Anthropic not found" is wrong. (Could not check a separate `~/storehouse-whatsapp-ai`
  repo — sandbox blocked the home dir; if it exists it would be additive.)
- **`get_user_tier` overload hazard is NOT live.** Live `pg_proc` shows **only** the
  `(p_user_id uuid)` overload; the old broken `(text)` overload is gone. Downgrade that
  hypothesis.
- **Auth handshake itself is sound.** Login → Supabase auth UID is correct
  (`authService-supabase.js:408`). The weakness is downstream tenant scoping (C1), not
  the auth flow.

## 3.5 — Doc-vs-code discrepancies

| # | Doc claim | Reality (code/live wins) |
|---|-----------|--------------------------|
| 1 | CLAUDE.md S7/S8: "Cart.tsx Pay-with-Card not built yet" | **Built** — `Cart.tsx:1126-1163`, full `handleSubaccountPayment` |
| 2 | CODEBASE_MAP §8: "24 local / 18 deployed edge fns" | **25 fns + `_shared` (26 dirs); 20 deployed ACTIVE**; new `paystack-webhook-router` + `provision-subdomain` not in doc |
| 3 | Docs describe **two** Paystack webhooks | **Three** receivers deployed; router (commit 6752d4d) supersedes both |
| 4 | CODEBASE_MAP §12: "Anthropic/Claude not found" | **Claude Haiku wired** in `whatsapp-webhook` |
| 5 | CODEBASE_MAP §12: WhatsApp = "Green API" | **Twilio + 360dialog**; no Green API in code |
| 6 | CLAUDE.md: `PaymentMethodsManager` is LEGACY | **LIVE** — rendered by `BusinessSettings.tsx:924` (the other three — `PaymentSettings`, `PaystackHelp`, `PaymentLinkCard` — *are* dead) |
| 7 | CLAUDE.md S11: "Free tier card payments enabled" | Edge gates removed, but **UI still locks Free out** of KYC/bank onboarding (`PaymentSetup.tsx:74`) — see H/Med below |
| 8 | KYC RPC migration comments: "PUBLIC has no EXECUTE" | **False** — never REVOKE'd; PUBLIC-executable (C2) |
| 9 | `MARKETPLACE-INVENTORY`: legacy webhook "HMAC, audit-grade" | **False** — plain SHA-512 (H1) |
| 10 | CLAUDE.md migration counts / "schema-2026-04-28 baseline" | Baseline file is a **1-line empty stub**; real base schema lives only in live DB (drift, §3.6) |
| 11 | Docs imply RLS protects tenant tables | **RLS OFF** on stores/sales/users/staff/product_variants (C1) |
| 12 | f51e91a "do not merge" | **Merged to main**, public route (C4) |

**Frontend Free-tier lockout (escalated separately):** `PaymentSetup.tsx:74`
`if (!tier || tier.tier_id === 'free')` → `tier_locked` → forces `/upgrade`. This
contradicts the Session-11 edge change (Free card payments enabled). **[High/Likely]** —
a Free merchant cannot *reach* the subaccount onboarding the edge layer now permits.
**Proposed fix:** drop `|| tier.tier_id === 'free'` at `:74` or render a Free-specific
card. **≤2-min check:** confirm intended Free behavior with product.

## 3.6 — Dead code (3 buckets)

> Verifier cleared every candidate with a fresh 0-ref grep across src + supabase +
> scripts + index.html + public + package.json + configs, and against external
> invocation (webhooks, cron, dynamic/lazy/string refs). Backups/`.old`/`_OLD`
> excluded as non-shipping (listed in §5). Counts corrected vs the Dashboard agent's
> first pass (7 Conversations*, not 12; 4 AIChatWidget*, not 5).

### Bucket A — CONFIRMED-DEAD (0 external refs; safe to delete after your sanity-check)
**Components:** `ConversionAnalytics`, `AgentChatInterface`, `SimpleAgentChat`,
`StoreWhatsAppSettings`, `AIChatAnalytics`, `PaymentSettings`, `PaystackHelp`
(transitive via PaymentSettings), `PaymentLinkCard`, `BusinessSettings_OLD`,
`FirebaseTest`, `ChatTakeoverPanel` (transitive via EnhancedConversations),
`ConversationAnalytics` (transitive), `EnhancedConversations`, `ConversationsViewerSafe`,
`ChatResponse` (transitive via ChatHistory).
**7 dead `Conversations*`:** `ConversationsDebug`, `ConversationsPageFixed`,
`ConversationsSimplified`, `ConversationsUltraSimple`, `ConversationsViewer`,
`ConversationsViewerSafe`, `ConversationsViewerSimple`.
**4 dead `AIChatWidget*`:** `-enhanced-bubble`, `-fixed`, `-quota-fix`, `.enhanced`.
**Pages:** `ChatHistory` (all refs commented "Removed"), `AIChatAnalyticsPage`,
`TestPaymentStatus`.
**lib/hooks/services:** `lib/authService.js` (live is `authService-supabase.js`),
`lib/supabase-auth.ts`, `lib/dataValidation.ts`, `hooks/useReliableMessaging`,
`hooks/useSmartImage`, `services/paymentAlertService`, `services/pushNotificationService`
(live push = deployed `send-push-notification` edge fn, not this file),
`services/salesWithStaffService`, `services/firebaseProducts`,
`services/whatsappIntegration.ts` (dead service file — its only importer is the dead
`EnhancedConversations`; the WhatsApp **feature** is live via the edge fn, so the *file*
is dead but the *feature* is not).
**Edge dev-helpers (NOT in the 20 deployed):** `apply-migration`, `run-migration`,
`check-tier-limits`, `update-free-tier`, `upgrade-existing-users`.
**Broken-but-dead ref:** `ChatResponse.tsx:127` invokes `'send-email'`, which has **no**
function directory and is **not deployed** — genuine broken reference, but the call site
is dead, so it never executes.
**Storefront:** `CheckoutDemo.jsx` (0 refs).

### Bucket B — EXTERNALLY-INVOKED / KEEP (look orphaned, are not)
- **Deployed webhook/cron/edge functions** invoked by Paystack/Twilio/360dialog/cron, not
  by `functions.invoke`: `paystack-webhook-router`, `paystack-subaccount-webhook`,
  `paystack-webhook` (legacy — keep until dashboard URL confirmed, then undeploy per H1),
  `send-daily-reports` (cron via `CRON_SECRET`), `whatsapp-webhook`,
  `send-push-notification`, the reviewer endpoints, `provision-subdomain`.
- **Marketplace WIP (CODEBASE_MAP §20 — do NOT delete):** `marketplace.ts`,
  `MarketplaceSettings.tsx`, `initiate-marketplace-payment`, `paystack_split_transactions`,
  `marketplace_analytics`, `search_marketplace_products`, and the shared review RPCs
  `approve_review` / `reject_review_and_freeze` / `record_successful_payment`.
- **Modal-mounted pages (not router-routed, reached via App.jsx):** `TestPayment`
  (App.jsx:7,4056 behind a localStorage dev toggle), `ExpensesPage` (App.jsx:81,4044),
  `MoneyPage` (App.jsx:83,6405) — all LIVE.
- **`firebase.js`** — reachable only via the dev `/image-test` route → SmartPicture →
  smartImage → firebase; keep until that dev surface is removed.

### Bucket C — SUSPECTED (needs the listed ≤2-min check before deleting)
- `incrementAIChatUsage` (`subscriptionService.ts:277`) — dead + targets a likely-wrong
  column; **check:** grep the `ai-chat` edge fn / `aiUsageService` for the real increment,
  then delete.
- The 5 edge dev-helpers above — **check:** they are absent from the deployed list (✓
  confirmed via `list_edge_functions`); safe to move to `scripts/` or delete.
- `send-email` — **check:** `supabase functions list` for `send-email`; if absent, the
  invoke in `ChatResponse.tsx` is dead-and-broken (call site already dead).

---
<!-- PART 3 + RLS SQL persisted above this line first, per the brief. -->

---

# PART 1 — SYSTEM MAP

## 1.1 Stack
- **Frontend:** React + Vite SPA (mixed `.jsx`/`.tsx` — 175 `.tsx`, 28 `.jsx`, 102 `.ts`),
  deployed on **Vercel** (`smartstock-v2`). No Tailwind compiler in the build (the
  `tailwind.css` import is dead — inline styles dominate new work).
- **Backend:** **Supabase** — Postgres 17.6 (project `yzlniqwzqlsftxrtapdl`, region
  eu-west-1), Edge Functions (Deno), Storage (kyc-photos bucket), Auth.
- **Payments:** **Paystack** — subaccount splits (storefront), subscriptions (SaaS
  tiers); frontend uses **PaystackPop v2** (`@paystack/inline-js`) for the new card flow
  and v1 inline.js for the legacy own-key flow.
- **AI:** **OpenAI** (in-app chat + embeddings) and **Anthropic Claude Haiku** (WhatsApp
  AI brain).
- **Messaging:** **Twilio + 360dialog** for WhatsApp; **Web Push (VAPID)** for
  notifications.
- **Monitoring:** **Sentry** (`@sentry/react` + vite plugin, wired in `main.jsx`).
- **Legacy:** **Firebase** (auth/products migration remnants — mostly dead; reachable
  only via a dev image-test route).
- **CDN/images:** **ImageKit** (+ Supabase Storage).

## 1.2 Repos / trees
- Primary: `~/smartstock-audit` (read-only mirror of the app repo). Production project name
  `smartstock-v2` on Vercel.
- A second Supabase project exists (`rosies-takeaway`, INACTIVE) — not in scope.
- A possible separate `~/storehouse-whatsapp-ai` repo could not be inspected (sandbox);
  the in-repo WhatsApp implementation is complete and self-sufficient regardless.

## 1.3 Directory map (top level)
| Path | Purpose |
|------|---------|
| `src/` | React/Vite frontend (pages, components, contexts, hooks, lib, services, utils, locales, styles, data) |
| `supabase/functions/` | 25 edge functions + `_shared/` modules |
| `supabase/migrations/` | 70 `.sql` files (+ 2 `.bak`) — see §4 ledger |
| `docs/` | Design/debug/spec docs (this file is the audit reference) |
| `public/` | Vite static assets |
| `scripts/` | Operational bash + node helpers (incl. KYC reviewer scripts, chat integrity) |
| `functions/` | **Legacy Firebase** functions (separate `node_modules`, own `tsconfig`) |
| `tools/`, `ux-tools/`, `e2e/`, `tests/`, `monitoring/` | utilities, e2e, monitoring |
| `*.md` (root) | 154 historical planning/strategy docs — not referenced by code |
| `.env.example`, `.env.production.local`, `.env.vercel` | env templates |

## 1.4 "Where things live" index (feature → files / functions / tables)
| Feature | Frontend | Edge function(s) | RPC(s) | Table(s) |
|---------|----------|------------------|--------|----------|
| **Storefront + cart** | `pages/StorefrontPage.tsx`, `components/Cart.tsx`, `contexts/CartContext.tsx`, `components/OrderConfirmation.tsx`, `pages/OrderReturn.tsx` | `initiate-storefront-payment` (F3) | — | `orders`, `order_items`, `paystack_split_transactions`, `products`, `stores` |
| **Storefront payment (split)** | `Cart.tsx` `handleSubaccountPayment` + PaystackPop v2 | `initiate-storefront-payment`, `paystack-webhook-router` → `_shared/paystack-subaccount-handler` | `record_successful_payment`, `complete_subaccount_onboarding` | `paystack_subaccounts`, `vendor_velocity_limits`, `platform_fee_config`, `paystack_webhook_events` |
| **Vendor onboarding / KYC** | `pages/PaymentSetup.tsx`, `components/payments/SubaccountWizard.tsx` | `create-paystack-subaccount` (F2), `resolve-bank-account` (F1) | `submit_kyc_v1`, `approve_kyc_review`, `reject_kyc_review`, `grant_velocity_override`, `update_kyc_after_approval`, `encrypt/decrypt_vendor_kyc_field` | `vendor_kyc`, `bank_accounts`, `vendor_velocity_overrides` |
| **Reviewer** | bash scripts in `scripts/kyc/` | `approve-transaction-for-fulfillment`, `reject-transaction-and-freeze` | `approve_review`, `reject_review_and_freeze` | `paystack_split_transactions`, `stores` (freeze) |
| **SaaS subscription (Pro/Starter)** | `components/SubscriptionUpgrade.tsx`, `UpgradeModal.tsx`, `services/subscriptionService.ts` | `manage-subscription`, `verify-subscription`, `verify-transaction`, `paystack-webhook-router` → `_shared/paystack-subscription-handler`; legacy `paystack-webhook` | `get_user_tier`, `create_default_subscription`, `can_add_product*` | `subscription_tiers`, `user_subscriptions`, `payment_transactions` |
| **Tier resolution** | `subscriptionService.ts:getUserTier` | (shared) `_shared/tier-resolver.ts` | `get_user_tier` | `user_subscriptions`, `platform_fee_config` |
| **Auth / tenant** | `contexts/AuthContext.jsx`, `lib/authService-supabase.js`, `components/ProtectedRoute.jsx` | — | `handle_new_user` (trigger) | `auth.users`, `users`, `stores` |
| **Dashboard data** | `App.jsx`, `lib/supabase-hooks.js`, `services/supabaseProducts.js`, `services/supabaseSales.ts` | — | `get_sales_summary`, `get_low_stock_products`, `decrement_variant_quantity` | `products`, `sales`, `product_variants`, `stores` |
| **AI chat** | `components/AIChatWidget.tsx`, `dashboard/ConversationsSimplifiedFixed.tsx`, `pages/ConversationsPage.tsx` | `ai-chat`, `send-agent-message`, `generate-embedding` | `check_ai_chat_quota`, `send_agent_message`, `initiate_agent_takeover`, `search_documentation_vector` | `ai_chat_conversations`, `ai_chat_messages`, `ai_chat_usage`, `documentation` |
| **WhatsApp** | `components/WhatsAppAISettings.tsx`, `pages/WhatsAppAI.tsx` | `whatsapp-webhook`, `send-daily-reports` | `track_whatsapp_message` | `whatsapp_*` tables, per-shop `whatsapp_settings` |
| **Contributions/Ajo** | `components/contributions/*`, `services/contributionService.ts` | — | `update_member_payment_status`, `check_inactive_members` | `contribution_groups/members/payments/payouts` |
| **Invoices** | `pages/Invoices.tsx`, `CreateInvoice.tsx`, `InvoiceDetail.tsx`, `PublicInvoiceView.tsx` | — | `generate_invoice_number`, `update_invoice_status`, `mark_overdue_invoices` | `invoices`, `invoice_items`, `invoice_payments` |
| **Affiliates/referrals** | `pages/Affiliate*`, `services/affiliateService.ts`, `referralService.ts` | — | `increment_affiliate_*`, `deduct_affiliate_earnings`, `update_referral_milestones` | `affiliates`, `affiliate_*`, `referrals`, `referral_*` |
| **Staff** | `contexts/StaffContext.tsx`, `pages/StaffManagement.tsx`, `services/staffService.ts` | — | — | `staff_members`, `staff_activity_logs` |
| **Subdomains** | signup / `StoreSettings.tsx` (fire-and-forget) | `provision-subdomain` (→ Vercel API) | — | `stores.subdomain` |

---

# PART 2 — DATA-FLOW TRACES (critical paths)

## 2.1 Storefront card payment (the live money path)
1. Customer on `pages/StorefrontPage.tsx` (`/store/:slug` or merchant subdomain) adds items;
   `CartContext` stores `price` in **kobo**.
2. `components/Cart.tsx` `handleCheckout` (`:788`) selects path by `paymentMethod`. The
   split card path requires `subaccountCardEnabled` (`:87-91`):
   `VITE_ENABLE_PAYSTACK_SUBACCOUNTS==='true'` AND `store.paystack_subaccounts_enabled`
   AND `store.kyc_status==='approved'` AND `!store.frozen`.
3. `handleSubaccountPayment` (`:482`) → `supabase.functions.invoke('initiate-storefront-payment',
   { store_id, items:[{product_id, product_name, quantity, unit_price_kobo}], customer_* })`.
4. **F3** `initiate-storefront-payment/index.ts`: feature flag → IP rate-limit →
   per-store gates (`paystack_subaccounts_enabled`, `frozen`, `kyc_status='approved'`
   unless `BYPASS_KYC_FOR_SMOKE`) → active subaccount → velocity row + daily/monthly caps
   (with override lookup) → fee math (customer-absorb closed form: `customer_total =
   (subtotal + flat)/0.985`; `storehouse_take = min(floor(subtotal×bps/10000), cap)`;
   `transaction_charge = storehouse_take + paystack_take`; `bearer:'account'`) → **3
   non-transactional inserts** (`orders`, `order_items`, `paystack_split_transactions`)
   → Paystack `POST /transaction/initialize` → returns `{authorization_url, access_code,
   reference, breakdown}`.
5. Cart prefers `new PaystackPop().newTransaction({ accessCode })` (`:601`); falls back to
   `window.location = authorization_url`. **It does not recompute fees client-side** — it
   trusts F3's breakdown. On success it does **not** write the order — the webhook is
   authoritative.
6. Paystack → **`paystack-webhook-router`** (single URL): HMAC-SHA512 over raw body
   (constant-time) → `_shared/paystack-router.ts` routes `charge.success` with `data.reference`
   `ord_*` to the subaccount handler → `record_successful_payment` RPC (atomic claim on
   `paystack_webhook_events` UNIQUE(reference,event_type) → `orders.status='paid'` →
   split `status='success'` → velocity update). Dual-writes `sales` + `upsert_customer`
   (migration 20260527).
- **Risks on this path:** non-atomic inserts (H3), client-trusted `unit_price_kobo` (M1),
  legacy webhook crypto if the dashboard URL is wrong (H1), disputes unhandled (M2). And
  the public spike route (C4) hits step 4 directly.

## 2.2 Pro/Starter subscribe
1. `components/SubscriptionUpgrade.tsx` → PaystackPop (public key) charges the SaaS plan.
2. `onSuccess` → `supabase.functions.invoke('verify-transaction', { reference, planCode })`
   (`:555`) — verifies the txn server-side against Paystack `GET /transaction/verify`,
   requires `success` + <10-min age, then writes `user_subscriptions` for JWT `user.id`.
   (Gaps: no amount-vs-tier check, no email→JWT bind — M6.)
3. Backup poll → `verify-subscription` (`:657`) every 5s/2min — **flawed (C3):** keys on
   client `customerEmail`, grants to JWT `user.id` without binding them.
4. Webhook side: `subscription.*`/`invoice.*` events → `paystack-webhook-router` →
   `_shared/paystack-subscription-handler` (pre-claims `paystack_webhook_events` for
   idempotency). Legacy `paystack-webhook` (bad HMAC, H1) is the pre-router handler.
5. Tier read everywhere via `get_user_tier` RPC (past_due + 7-day grace), surfaced by
   `subscriptionService.getUserTier` (`data?.[0]`, correct for a table-returning RPC).

## 2.3 Auth + tenant resolution
1. Login via Supabase Auth → `AuthContext.currentUser.uid` (`authService-supabase.js:408`).
2. Dashboard reads scope by `.eq('user_id', uid)` (client-side) across
   `supabase-hooks.js`/`supabaseProducts.js`/`supabaseSales.ts`. Store-scoped tables
   (conversations, paystack_subaccounts, vendor_kyc) use a stores-by-`user_id`→by-`store_id`
   two-step (`PaymentSetup.tsx:84-101`).
3. **This is the breach surface (C1):** with RLS off and full anon/authenticated grants,
   the client `.eq` filter is the only isolation — bypassable by calling PostgREST
   directly. Defense-in-depth (server RLS) is absent.

## 2.4 KYC → subaccount onboarding
1. `PaymentSetup.tsx` (`/settings/payments`): Card 2 (KYC) → `submit_kyc_v1` RPC; Card 1
   (bank) → `SubaccountWizard.tsx` → `resolve-bank-account` (F1) then
   `create-paystack-subaccount` (F2) → `complete_subaccount_onboarding` RPC (sets
   `stores.paystack_subaccounts_enabled=true`, creates velocity row).
2. Reviewer (Paul, single `REVIEWER_USER_ID`) runs `scripts/kyc/*` →
   `approve_kyc_review`/`reject_kyc_review`. **C2:** these RPCs are also directly callable
   by anyone via PostgREST, bypassing the reviewer gate.
3. **Frontend gate bug (§3.5 #7):** `PaymentSetup.tsx:74` hard-locks Free tier out of
   reaching this flow at all.

## 2.5 Webhook handling (current topology)
- **Single intended URL:** `paystack-webhook-router` (deployed v4) → HMAC verify once →
  `_shared/paystack-router.ts` disambiguates by `event.event` prefix + payload shape:
  `subscription.`/`invoice.` → subscription handler; `transfer.` → subaccount; `charge.*`
  → subaccount if `data.subaccount`/`ord_` ref, else subscription if `data.plan`.
- **Legacy standbys still deployed:** `paystack-webhook` (subscription, **bad HMAC** H1),
  `paystack-subaccount-webhook` (correct HMAC).
- **Unhandled:** `charge.dispute.*`, `refund.*`, `transfer.failed/reversed` → 'unknown' →
  logged + 200 no-op (M2).

---

# PART 4 — DEBUGGING QUICK-REFERENCE (symptom → suspect location)

| Symptom | First suspect | Where to look | Related finding |
|---------|---------------|---------------|-----------------|
| One merchant sees another's data / data leak report | RLS off on tenant tables | `pg_class.relrowsecurity`; client `.eq('user_id')` in `supabase-hooks.js` | **C1** |
| Bank/settlement account number exposed | `stores.account_number` API-exposed, RLS off | advisor `sensitive_columns_exposed`; `stores` policies | **C1** |
| A user has a paid tier they didn't pay for | `verify-subscription` email not bound to JWT | `verify-subscription/index.ts:16,37,92,238` | **C3** |
| KYC approved without reviewer / store frozen unexpectedly / velocity caps raised | KYC RPCs PUBLIC-executable | `pg_proc` ACL on `approve_kyc_review` etc.; bodies lack `auth.uid()` check | **C2** |
| Affiliate commissions inflated | public `increment_affiliate_*` + `WITH CHECK(true)` inserts | `pg_proc` ACL; `affiliate_sales`/`affiliate_clicks` policies | **C2/H4** |
| Real Paystack orders against a store nobody initiated | `/spike/paystack-v2` public route | `AppRoutes.jsx:556`, `V2SpikeTest.tsx` | **C4** |
| Storefront checkout returns 503 | `ENABLE_PAYSTACK_SUBACCOUNTS` off, or per-store flag | F3 top gates; `supabase secrets list` | C4 residual |
| Subscription webhooks silently not applying | Paystack dashboard pointed at legacy `paystack-webhook` (bad HMAC) | `paystack-webhook/index.ts:46-54`; dashboard URL | **H1** |
| Webhook returns `bad_signature` | secret mismatch OR body modified in transit | `paystack-webhook-router` HMAC block | H1 |
| Duplicate payment rows | idempotency only in router/RPC; legacy had none | `paystack_webhook_events` UNIQUE(reference,event_type) | H1 |
| Chargeback/refund did nothing | unhandled event types | `_shared/paystack-router.ts` (no dispute case) | M2 |
| Forged WhatsApp messages / Claude+Twilio cost spike | `whatsapp-webhook` has no signature check | `whatsapp-webhook/index.ts` serve handler | H2 |
| OpenAI cost spike from embeddings | `generate-embedding` unauthenticated | `generate-embedding/index.ts` | M3 |
| Orphan `pending` orders / orders without ledger | F3's 3 non-transactional inserts | `initiate-storefront-payment/index.ts` insert block | H3 |
| Customer charged wrong amount on storefront | F3 trusts client `unit_price_kobo` | `initiate-storefront-payment/index.ts:179,334` | M1 |
| Free-tier merchant can't reach bank/KYC setup | UI hard-locks Free | `PaymentSetup.tsx:74` | §3.5 #7 |
| `business`-tier checkout 500 `no_fee_config_for_tier` | only if Free fee-config row deactivated | `platform_fee_config`; `tier-resolver.ts:68` | §3.4 |
| Chat PII visible across stores / anyone posts to any chat | `ai_chat_messages` `USING(true)` policies | `pg_policies` on `ai_chat_messages`/`ai_chat_conversations` | M4 |
| Dashboard money 100× off | sales unit (kobo vs naira) writer/reader mismatch | `App.jsx:3098/3164`, migration 20260530, `supabaseSales.ts` | (units, ref CLAUDE.md S9) |
| Tier shows wrong after upgrade | `get_user_tier` grace logic / `user_subscriptions` newest-row | `get_user_tier` RPC; `ORDER BY created_at DESC LIMIT 1` | §3.4 |
| `send-email` invoke fails | function never existed/deployed | `ChatResponse.tsx:127` (dead call site) | §3.6 Bucket C |
| Migration replay fails / `supabase db push` errors | extensive recorded-vs-live drift | §3.6 / §4; CLAUDE.md drift note | §4 |
| Sentry events missing | DSN env var not set in Vercel (code is wired) | `lib/sentry.ts`, `main.jsx:21,24` | §3.4 |

**Emergency procedures** (from CLAUDE.md, unchanged): rollback via Vercel
Deployments → Promote last good; edge-function restore from `.ts.*-stable` backups;
never run DELETE/UPDATE without WHERE.

---

# PART 4B — MIGRATION LEDGER (one line each)

> Source: the Database teammate's read of `supabase/migrations/`. 70 `.sql` + 2 `.bak`.
> The real value is the drift call-out (§3.6 / below), not the per-file prose.

Substantive migrations cover: payment_transactions + plan codes + grandfathering
(`20241226*`, `20241230*`); chat quota/analytics/abuse/vector-search
(`20241230000004`, `20250101`, `20251203*`, `20251206`, `create_ai_chat_tracking_tables`,
`create_ai_response_cache`); reviews (`20250103`, `20251209*`); **affiliate program**
(`20250115` — 6 SECDEF fns, no search_path, `increment_*` granted authenticated,
sales/clicks INSERT `CHECK(true)` → H4); marketplace-ready schema (`20250123`);
**subscription tiers canonical** (`20251205` — free/starter/pro/business, declares a
`UNIQUE(user_id)` that is **not live**, `get_user_tier(TEXT)` old overload); auth user
creation (`20251211`); sales table + columns + FK + validate trigger (`20260318*`,
`20260329*`, `add-sales-channel`); chat message storage + visitor cols + **store-scoped
SELECT + INSERT CHECK(true)** (`20260319`); duplicate chat-enhancement trio
(`20260322_chat_enhancements`, `_full`, `_working_migration`); translations ×2
(`20260331`, `20260409` dup); contributions (`20260331`, `20260402`); business summaries
(`20260409`); **timestamptz fix of 39 cols** (`20260502`); **paystack subaccount
foundation** (`20260509` — 9 tables, RLS vendor-scoped + Paul reviewer, decrypt fn, seed
free/starter/pro fee config); the 4 hardened split RPCs (`20260510`–`20260513`); paystack
logs (`20260514`); KYC v1 (`20260515*` storage bucket, super-admin sub, **submit_kyc_v1
no search_path/no REVOKE**, encryption helpers, vendor_kyc extensions, velocity
overrides); **KYC reviewer RPCs `20260516*` — approve/reject/grant: no search_path, no
REVOKE → C2**; `get_user_tier(uuid)` rewrite with grace (`20260516`);
`update_kyc_after_approval` hardened (`20260518`); webhook RPC dual-write sales
(`20260527`); **sales units → kobo backfill** (`20260530`, + backup table); subdomain
backfill (`20260601`).
**DEAD/stub:** `schema-2026-04-28.sql` (1-line empty — real base schema is live-only),
`update_subscription_tiers.sql` (columns don't exist live), `fix-auto-subscription.sql`
(manual-commit style), the 2 `.bak` files.

---

# PART 5 — FILE CENSUS

> Scope: every file excluding `node_modules/` and `.git/`. Columns: **tracked?** (git),
> **referenced?**, **role**, **dead-code bucket** if unreferenced (A confirmed-dead /
> B externally-invoked-keep / C suspected). 1,297 git-tracked files (excl. node_modules).
> Per-file dead/live for `src/` is in §3.6; this part summarizes by group and lists the
> unreferenced/untracked/ignored sets.

## 5.1 `src/` summary (tracked)
| Group | Count | Referenced? | Notes |
|-------|------:|-------------|-------|
| `*.tsx` | 175 | mostly Y | dead set in §3.6 Bucket A |
| `*.ts` | 102 | mostly Y | services/hooks/lib/utils; dead set in §3.6 A |
| `*.jsx` | 28 | mostly Y | incl. `CheckoutDemo.jsx` (DEAD), `FirebaseTest.jsx` (DEAD) |
| `*.js` | 20 | mostly Y | incl. `lib/authService.js` (DEAD — live is `authService-supabase.js`) |
| `*.css` | 70 | partial | no Tailwind compiler; `styles/tailwind.css` is a **dead import** (`main.jsx:5`) |
| `*.json`/`*.svg`/`*.md` | 4 | Y/N | `locales/strings.json` etc. live; in-tree `.md` is a doc |

## 5.2 Dead-weight backup/legacy files in `src/` (24 — all git-tracked, all DEAD, Bucket A)
```
src/App.jsx.backup
src/App.jsx.backup-20260305-135754
src/App.jsx.backup-business-name-fix
src/App.jsx.sales-fix-backup
src/components/AIChatWidget.tsx.backup-push-relay
src/components/BusinessSettings.tsx.backup
src/components/BusinessSettings.tsx.backup-save-fails-silent
src/components/BusinessSettings.tsx.old
src/components/BusinessSettings_OLD.tsx
src/components/Dashboard.tsx.backup-20260305-131539
src/components/Dashboard.tsx.backup-20260305-135907
src/components/Dashboard.tsx.backup-business-name-fix
src/components/MoreMenu.tsx.backup-before-modal-fix
src/components/MoreMenu.tsx.pre-modal-fix
src/components/OnlineStoreSetup.tsx.backup-business-name-fix
src/components/StoreQuickSetup.tsx.backup-business-name-fix
src/components/StoreSettings.tsx.backup-business-name-fix
src/components/StoreSettings.tsx.backup-load-save-fix
src/components/StoreSettings.tsx.backup-save-fails-silent
src/data/documentation.ts.backup
src/pages/BusinessInsights.tsx.backup-security-fix
src/pages/LandingPage.tsx.backup
src/styles/BusinessSettings.css.old
src/utils/imagekit.ts.DEPRECATED
```
**PROPOSED:** delete or move to a `.gitignore`d `legacy/`. ⚠️ Do NOT touch the live
counterparts (`App.jsx`, `Dashboard.tsx`, `BusinessSettings.tsx`, `StoreSettings.tsx`,
`MoreMenu.tsx`, `LandingPage.tsx`, `BusinessInsights.tsx`, `imagekit.ts`).

## 5.3 `supabase/functions/` census (25 fns + `_shared`; deployed = 20 ACTIVE)
| Function | Deployed? | Invoked by | Bucket |
|----------|-----------|------------|--------|
| `initiate-storefront-payment` | ACTIVE v69 | Cart.tsx, V2SpikeTest.tsx | LIVE (B) |
| `create-paystack-subaccount` | ACTIVE v67 | SubaccountWizard | LIVE (B) |
| `resolve-bank-account` | ACTIVE v62 | SubaccountWizard | LIVE (B) |
| `paystack-webhook-router` | ACTIVE v4 | Paystack dashboard URL | LIVE (B) |
| `paystack-subaccount-webhook` | ACTIVE v58 | legacy URL | KEEP-til-confirmed (B) |
| `paystack-webhook` | ACTIVE v71 | legacy URL | broken-crypto; undeploy after URL check (H1) |
| `verify-subscription` | ACTIVE v76 | SubscriptionUpgrade | LIVE (B) — flawed C3 |
| `verify-transaction` | ACTIVE v69 | SubscriptionUpgrade | LIVE (B) |
| `manage-subscription` | ACTIVE v69 | SubscriptionUpgrade | LIVE (B) |
| `approve-transaction-for-fulfillment` | ACTIVE v57 | reviewer scripts | LIVE (B) |
| `reject-transaction-and-freeze` | ACTIVE v57 | reviewer scripts | LIVE (B) |
| `initiate-marketplace-payment` | ACTIVE v57 | reserved (stub) | WIP-KEEP (B, §20) |
| `ai-chat` | ACTIVE v158 | AIChatWidget | LIVE (B) |
| `generate-embedding` | ACTIVE v69 | search | LIVE (B) — M3 unauth |
| `generate-business-summary` | ACTIVE v78 | BusinessInsights | LIVE (B) |
| `send-agent-message` | ACTIVE v68 | chat takeover | LIVE (B) |
| `send-push-notification` | ACTIVE v65 | ai-chat relay + dashboard | LIVE (B) |
| `send-daily-reports` | ACTIVE v76 | cron (CRON_SECRET) | LIVE (B) |
| `whatsapp-webhook` | ACTIVE v69 | Twilio/360dialog webhook | LIVE (B) — H2 no sig |
| `provision-subdomain` | ACTIVE v3 | signup/StoreSettings | LIVE (B) |
| `apply-migration` | not deployed | — | DEAD helper (A) |
| `run-migration` | not deployed | — | DEAD helper (A) |
| `check-tier-limits` | not deployed | — | DEAD helper (A) |
| `update-free-tier` | not deployed | — | DEAD helper (A) |
| `upgrade-existing-users` | not deployed | — | DEAD helper (A) |
| `_shared/` | n/a | router + F1/F2/F3 + ai-chat | LIVE (B) |
| `send-email` (referenced, NO DIR) | not deployed, no source | `ChatResponse.tsx:127` (dead call) | broken-but-dead (C) |

## 5.4 Other trees
| Group | tracked? | role / bucket |
|-------|----------|---------------|
| `supabase/migrations/` (70 + 2 `.bak`) | Y | §4B ledger; stubs/dups noted (A) |
| 154 root `*.md` | Y | historical planning docs — not load-bearing; archival |
| `docs/*.md` | Y | design/spec/debug; this file = audit ref |
| `functions/` (Firebase) | Y | legacy image functions; own node_modules+tsconfig; not in Vite app |
| `scripts/`, `tools/`, `ux-tools/` | Y | ops (KYC reviewer, chat integrity, UX) — LIVE-ops (B) |
| `e2e/`, `tests/`, `monitoring/`, `public/` | Y | test/monitoring/static — LIVE (B) |
| `.env.example` | Y | template |
| `.env.production.local`, `.env.vercel` | **tracked/committed** | ⚠️ verify no live secrets in git (out of read-only scope to open) |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` | Y | legacy Firebase config |
| `vercel.json` | Y | live deploy config |

## 5.5 Untracked / git-ignored
- **Untracked (not ignored):** `.claude/worktrees/` (transient agent worktrees; startup
  `git status` showed `?? .claude/worktrees/`) + a `worktree-landing-page` worktree.
  **Do NOT delete without confirming no in-flight work** — transient tooling, not source.
- **Git-ignored:** `node_modules/` (root + `functions/`), build output, local env
  artifacts (per `.gitignore`). Not inspected; none proposed for deletion.

---

# APPENDIX — Sanity-check lists (your call before acting)

**CONFIRMED-DEAD (delete after your review):** §3.6 Bucket A (7 Conversations*, 4
AIChatWidget*, ~13 components, 3 pages, ~10 lib/hooks/services, `CheckoutDemo.jsx`); the
24 backup/`.old`/`_OLD`/`.DEPRECATED` files (§5.2); 5 undeployed edge dev-helpers; dead
migrations (`schema-2026-04-28.sql` stub, `update_subscription_tiers.sql`, 2 `.bak`,
duplicate chat migrations); `/spike/paystack-v2` route + `V2SpikeTest.tsx` (C4).

**EXTERNALLY-INVOKED / KEEP (look orphaned, are not):** all 20 deployed edge functions
(webhooks, cron, reviewer endpoints, `provision-subdomain`); Marketplace WIP per
CODEBASE_MAP §20 (`marketplace.ts`, `MarketplaceSettings.tsx`,
`initiate-marketplace-payment`, `paystack_split_transactions`, `marketplace_analytics`,
`search_marketplace_products`, `approve_review`, `reject_review_and_freeze`,
`record_successful_payment`); modal-mounted pages `TestPayment`/`ExpensesPage`/`MoneyPage`;
`firebase.js` (dev image-test route); `paystack-subaccount-webhook` (keep until router URL
confirmed); `.claude/worktrees/` + `worktree-landing-page`.

**REQUIRES YOUR OUT-OF-BAND CONFIRMATION (un-introspectable in a read-only audit):**
1. `ENABLE_PAYSTACK_SUBACCOUNTS` prod value (gates C4 severity) — `supabase secrets list`.
2. Paystack dashboard webhook URL — router vs legacy (gates H1 severity).
3. `BYPASS_KYC_FOR_SMOKE` unset in prod (L11).
4. Sentry DSN env var set in Vercel (wired Sentry must actually ship events).
5. `.env.production.local` / `.env.vercel` are committed — verify no live secrets in git.

_End of AUDIT.md._

