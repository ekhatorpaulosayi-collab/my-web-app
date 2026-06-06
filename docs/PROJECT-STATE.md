# Storehouse — PROJECT STATE (single source of truth)

> **Generated:** 2026-06-06. Reconciled against **git log**, **live DB**, and **deployed
> edge-function state** (project `yzlniqwzqlsftxrtapdl`, read-only) — NOT trusted from the
> older docs alone. Where a doc disagreed with live/git, **live/git wins** and the
> correction is noted inline (search "CORRECTION").
>
> **HEAD:** `c9e4fbd` · branch `main` · working tree clean except the two uncommitted
> diagnostic docs from this session.
>
> **Supersedes for status purposes:** FINDINGS-LEDGER.md, REMEDIATION-STATUS.md,
> USER-FACING-PUNCHLIST.md, C1-PLAN.md. Those remain valid as *detail*; this file is the
> *current truth*. When they conflict with this file, this file is newer.

---

## 1. ONE-LINE STATUS

**PAID onboarding:** **NOT YET — one owed test.** All code/DB blockers (C1–C4, C2, C3+M6)
are done and verified live; the *only* thing left before a real paid merchant is the
**C3/M6 live payment test** (a correct payment could silently fail if Paystack plan
amounts ≠ DB tier prices). Clear that one test → paid onboarding is safe.

**FREE onboarding:** **NOT YET — one owed test.** The Free ungate is **live** (RPC + UI +
edge guards all open, verified). What blocks it is (a) a **Free end-to-end walkthrough**
(signup → KYC → reviewer approve → bank wizard → customer order), and (b) the **velocity
correctness bugs #3/#4 are still unfixed** — a Free storefront will wrongly reject the
first order after each daily/monthly reset and is permanently pinned at ₦200K/day. Free is
*reachable* but its checkout is *not yet correct*. Fix #3/#4 → run the walkthrough → safe.

**Cross-tenant data breach (C1): SEALED.** This morning's worst finding — anon could read
all 16 tenants' data and bank info — is closed and verified live.

---

## 2. DONE + VERIFIED (commit + evidence)

| Item | What it fixed | Commit(s) | Verified how (this session unless noted) |
|------|---------------|-----------|------------------------------------------|
| **C4** — public spike route | Deleted `/spike/paystack-v2` + `V2SpikeTest.tsx` (unauth route wired to live payment fn against a hardcoded prod store) | `ec465b8` | git log; FINDINGS-LEDGER verified `V2SpikeTest` absent + 0 refs in `AppRoutes.jsx`. Route now 404s/login. |
| **C1 core** — tenant RLS | RLS enabled + owner policies on all 6 tenant tables; cross-tenant read/write breach sealed | `ba1f8ac`→`cd1c0d4`→`4aaaf02`→`89d6160` | **LIVE (today):** `pg_class.relrowsecurity=true` on stores, users, sales, staff_members, staff_activity_logs, product_variants (6/6). Breach evidence + per-table verification in C1-PLAN.md §0. |
| **Cashier crash** | `canViewReports` ReferenceError fixed; reports hidden from cashier role | `edf9497` | git log; build green; FINDINGS-LEDGER confirmed guards in `Dashboard.tsx`/`App.jsx`. Staff *auth* works. |
| **C2** — KYC/affiliate RPC lockdown | `approve_kyc_review`, `reject_kyc_review`, `grant_velocity_override` revoked from PUBLIC/anon/authenticated + `search_path=public` pinned | `39bbd1f` (migration `20260604_c2_harden_kyc_and_affiliate_rpcs.sql`) | **LIVE (today):** those 3 fns ACL = `{postgres, service_role}` only, `proconfig={search_path=public}`. Affiliate increments intact (browser tracking preserved). |
| **C3 + M6** — tier-grant authz | `verify-subscription` matches Paystack sub by **JWT email** (client `customerEmail` ignored; `subscriptionCode` fast-path rejected); `verify-transaction` binds payer email to JWT user + asserts paid amount ≥ tier price | `2ac7e28` (+ docs `aa640ae`) | **LIVE:** both fns deployed ACTIVE, `verify_jwt:true` (verify-subscription v76, verify-transaction v69). Diff reviewed line-by-line. ⚠️ **runtime path NOT yet tested — see §3.** |
| **Free ungate (#2)** | Removed `tier IN ('starter','pro')` gate from `submit_kyc_v1`; admitted Free in `PaymentSetup.tsx:74` (`!tier` only). Edge F2/F3 guards were already removed by `c92cdea`. | `1411a25` (+ docs `c9e4fbd`); new migration `20260606_submit_kyc_v1_ungate_free.sql` | **LIVE (today):** `submit_kyc_v1` body has NO `subscription_required` / `v_has_paid_tier` (gate gone). UI verified by inspection + `vite build` green. |

**Honest count:** 6 workstreams done & verified-live. Two of them (C3/M6, Free) are
**deployed-but-not-runtime-tested** — see §3. Everything in §2 was checked against live
DB/edge state today, not taken from the docs.

**CORRECTIONS vs older docs:**
- FINDINGS-LEDGER (2026-06-04) listed **C3 UNTOUCHED** and **C2 WRITTEN-NOT-APPLIED**, and
  counted "only 2 findings closed." **Stale.** Live + git now show **C2 applied** (`39bbd1f`),
  **C3+M6 deployed** (`2ac7e28`), **Free ungated** (`1411a25`/`c9e4fbd`), **C1 core done**
  (`89d6160`). The ledger predates this work.
- The Free ungate was previously described as "code only, do not commit." **It is now
  committed AND deployed** (`1411a25`, `c9e4fbd`) — a later step took it live. Live wins.

---

## 3. ⚠️ OWED TESTS (deployed but unverified — these gate real use)

### TEST 1 — C3/M6 live payment  → **blocks PAID onboarding**
- **Why it gates:** M6 rejects a subscription grant unless `transaction.amount (kobo) ≥
  subscription_tiers.price_* (naira) × 100`. If any Paystack **plan amount** is set below
  the DB price (or units drift), a *correct* paying customer is rejected with *"Payment
  amount does not cover the requested subscription tier."* This is the first thing a paying
  merchant does — max-visible if wrong. No static check can prove it; needs a real charge.
- **Minimal steps to clear:**
  1. `verify-subscription` rejection check: `curl -X POST .../functions/v1/verify-subscription`
     with a valid JWT and body `{"subscriptionCode":"SUB_x"}` → expect
     `"subscriptionCode path not supported"`.
  2. Real upgrade: log in as a test merchant, upgrade to **each active paid tier**
     (Starter ₦5,000/mo, Pro ₦10,000/mo, Business ₦15,000/mo) with a Paystack **test card
     `4084 0840 8408 4081`**, confirm the tier activates (no "amount does not cover").
  3. If a correct payment IS rejected → it's a **data mismatch** (Paystack plan amount vs
     DB `subscription_tiers.price_*`), fix the data, not the code. (DB prices live:
     Starter 5000 / Pro 10000 / Business 15000 naira; Paystack plan codes are in
     `subscription_tiers.paystack_plan_code_monthly/_annual`.)

### TEST 2 — Free end-to-end walkthrough  → **blocks FREE onboarding**
- **Why it gates:** the ungate is live but never exercised by a real Free account, and the
  velocity gate (§4a #3/#4) is still buggy for Free specifically.
- **Minimal steps to clear:** with a Free test account: `/settings/payments` shows the
  Bank-setup + KYC cards (not the upgrade wall) → submit KYC (`submit_kyc_v1` should accept,
  no `subscription_required`) → reviewer approves (`./scripts/kyc/*` as reviewer UID) → bank
  wizard creates subaccount (F1→F2→`complete_subaccount_onboarding`) → place a customer
  storefront order → it settles. **Do this only after fixing #3/#4**, or the order flow will
  show false `daily_cap_exceeded`/`monthly_cap_exceeded`.

> Both tests also depend on out-of-band secrets being right: `ENABLE_PAYSTACK_SUBACCOUNTS`
> must be `true` in prod for any storefront card path (TEST 2), and `BYPASS_KYC_FOR_SMOKE`
> must be unset. See §6.

---

## 4. PENDING WORK (two tracks)

### (a) ONBOARDING-GATE — must clear before that user type onboards

| Pri | Item | Gates | Type | Note |
|-----|------|-------|------|------|
| 1 | **TEST 1** (C3/M6 live) | PAID | out-of-band → maybe data | §3 |
| 2 | **Functional #3** — velocity counter ignores `*_resets_at` | FREE checkout | edge | F3 `initiate-storefront-payment/index.ts:268,280` read volumes but never `*_resets_at`; reset only happens in settlement RPC *after* the gate. First order each day/month wrongly blocked. Fix: treat counter as 0 when `resets_at` ≤ now (mirror the settlement CASE). **Confirmed live: code has zero `*_resets_at` refs in F3.** |
| 3 | **Functional #4** — velocity band never advances | FREE checkout | edge (read-time) or DB (cron) | Seed hardcodes ₦200K/day, `days_since_approval=0`; promised nightly cron never built (0 cron rows touch it). Everyone pinned at ₦200K/day forever. Fix: derive band at read-time from approval date, or build the cron. |
| 4 | **TEST 2** (Free walkthrough) | FREE | out-of-band | §3 — run after #2/#3 above |
| 5 | **Functional #1** — downgrade re-gating | PAID (arms on first lapse) | edge | `_shared/paystack-subscription-handler.ts` `handleSubscriptionDisable` downgrades `user_subscriptions` but never pauses the subaccount → a lapsed merchant keeps taking card payments. **Latent today** (only Paul's store has a live subaccount). Decision owed (§5). |

> **Sequence for Free:** fix #3 → #4 → then the Free walkthrough (TEST 2). Do **not** open
> Free to real customers on a broken velocity gate. (Reachability and #3/#4 are mechanically
> independent but #2-reachability is the switch that exposes #3/#4 to customers.)

### (b) GRADUAL / BACKGROUND hardening — *not visible to users; only exploitable by a deliberate bad actor or latent. Safe to fix gradually while onboarding proceeds.*

| Item | What | Type | Why it can wait |
|------|------|------|-----------------|
| **C1 Stage 7** — REVOKE anon DML | defense-in-depth; RLS already blocks the reads/writes | DB | breach already sealed by RLS; this is belt-and-suspenders |
| **C1 Stage 8** — column-safe views | `stores`/`users` `select('*')` still sends private cols (kyc_*, frozen_*, is_admin, domain_verification_token) to anon for *public* stores | DB + frontend repoint | a column leak on already-public storefronts, not a cross-tenant breach; needs view + query repoint (C1-PLAN §4 Option A) |
| **Velocity cap tuning** | apply the agreed Free caps (§5) | DB/edge | numbers, not correctness; gated on the §5 decision |
| **Functional #5** | Free review threshold == monthly cap (both ₦500K live) → high-value review never fires | config | removes a fraud net, not user-visible |
| **Functional #6** | monthly cap meters customer-charged total, not goods sold (~₦487–492K of goods) | edge + DB / copy | messaging/semantics |
| **Functional #7** | velocity overrides don't compose (newest single-dim shadows older) | edge | low-frequency, needs 2 overlapping overrides |
| **Functional #8** | flat-fee threshold on subtotal not charged amount (~₦100 in a narrow band) | edge | needs live receipt; small |
| **Functional #9/#12** | F2 stale-success on downgrade / wasted queries | edge | cosmetic / perf |
| **Functional #10** | BIGINT fee cols typed `number`, returned as strings | edge | no live failure; future footgun |
| **Functional #11** | review-frozen order, no reviewer notification, single hardcoded reviewer | edge | only reachable via override above ₦500K |
| **Staff write-RBAC (L4)** | `StaffContext` `canEditProducts/Delete/Add` all `return true` → cashier can edit/delete products | frontend (+RLS) | a trust issue with *your own* staff, not a public exploit; visible only if you add staff |
| **submit_kyc_v1 search_path** | **NEW (live today):** `submit_kyc_v1.proconfig = null` → search_path NOT pinned (M7 class). The original migration lacked it; the ungate didn't add it. | DB | SECURITY DEFINER w/ unqualified names; low risk but worth pinning when next touched |
| **H1** legacy `paystack-webhook` bad HMAC | rejects genuine webhooks (not a bypass) | out-of-band + undeploy | depends on dashboard webhook URL (§6) |
| **H2** `whatsapp-webhook` no sig | forged payloads burn Claude/Twilio credits | edge | cost risk, rate-limited |
| **H3** F3 3 non-atomic inserts | orphan orders | edge + DB | acceptable pre-volume |
| **M1** F3 trusts client `unit_price_kobo` | no server price re-read | edge | real-money risk pre-volume |
| **M2** dispute/refund/`transfer.failed` no-op | unhandled events | edge | before real money |
| **M3/M4/M7, L1–L12** | embeddings auth, chat-PII policies, misc | mixed | see FINDINGS-LEDGER; none gate onboarding |
| **affiliate self-conversion** | `increment_affiliate_conversion` still anon/authenticated-executable (owner-check in body); self-conversion fraud open | DB/edge | **confirmed live today**; documented C2 residual. Move increment server-side then make service_role-only |
| Dead code / backups (§5.2 audit) | 24 `.backup`/`.old` files, dead components, 5 undeployed edge helpers | cleanup | hygiene |

---

## 5. OPEN DECISIONS YOU STILL OWE

1. **Free velocity caps — NOT applied.** Monthly **₦2M agreed**, daily **₦500K proposed but
   not applied**. **Live truth (today):** the only velocity row (Paul's store) carries
   `daily_cap_kobo = 20000000` (**₦200K**), `monthly_cap_kobo = NULL`; **zero rows in
   `vendor_velocity_overrides`.** The onboarding seed still ships ₦200K/day. So neither the
   ₦2M nor the ₦500K is live anywhere yet. Decide: (a) change the seed in
   `complete_subaccount_onboarding`, and/or (b) the read-time band derivation (#4), and/or
   (c) the Free `platform_fee_config.monthly_volume_cap_kobo` (currently ₦500K). These are
   the cap numbers #4 will enforce.
2. **Downgrade policy (#1):** when a paid merchant lapses, **pause** card-taking
   (set `paystack_subaccounts.active=false` / `stores.paystack_subaccounts_enabled=false`),
   **or** explicitly allow a lapsed merchant to keep charging on the Free schedule? The fix
   differs by answer; nothing happens on `subscription.disable` today.
3. **C1 bank-column exposure — Option A vs B (C1-PLAN §4):** Option B (interim, live now) keeps
   the storefront working but leaks private `stores` columns to anon for public stores.
   Option A (column-safe view + frontend repoint) closes it. Confirm you want the view repoint.
4. **Free review threshold (#5):** set Free's `large_transaction_review_threshold_kobo` below
   its monthly cap so high-value review can fire (currently both ₦500K → never fires).

---

## 6. KEY FACTS for a future session (no re-discovery needed)

**Project / infra**
- Supabase project ref: **`yzlniqwzqlsftxrtapdl`** (Postgres 17.6, eu-west-1). Free tier
  (upgrade to Pro $25/mo before real money / first paying subscriber — PITR + branching).
- Frontend: Vite React SPA on **Vercel** (`smartstock-v2`). Build = `vite build` (no `tsc`
  script; `tsc` not in node_modules). Lint = `eslint .`.
- Repo (writable working tree): `~/smartstock-v2`. Read-only mirrors exist at
  `~/smartstock-audit` and `~/smartstock-sweep` (byte-identical edge fns; used by the audits).

**Identities / IDs**
- **Reviewer / super-admin UID (Paul):** `dffba89b-869d-422a-a542-2e2494850b44`. Hardcoded
  as `REVIEWER_USER_ID` in the reviewer edge fns and substituted into split-tx RLS policies.
- **Paul's store (only live subaccount):** `d93cd891-7e0a-47a8-9963-5e2a00a2591f`
  (Pro, `paystack_subaccounts_enabled=true`, the only `vendor_velocity_limits` row).
- Blast-radius scale: 16 stores / 24 users / 58 sales / ~1,450 chat messages (as of audit).

**DB access (read-only via MCP; write via psql)**
- **Read-only introspection:** Supabase MCP tools (`execute_sql`, `list_tables`,
  `get_advisors`, `list_edge_functions`). MCP connects as `postgres` with
  `rolbypassrls=true` — to simulate an attacker, drop privilege via
  `SET LOCAL ROLE anon|authenticated` inside `BEGIN … ROLLBACK` (pattern in C1-PLAN §0).
- **Writes/migrations:** direct **psql** — connection string at `~/.supabase-paystack-dburl`
  (chmod 600; never echo/commit/paste it). Pattern:
  `psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 -f <migration>.sql`.

**Migration drift discipline (critical)**
- Local `supabase/migrations/` has ~70 files; prod `schema_migrations` records only a subset
  (rest applied via dashboard/psql, never recorded). **DO NOT run `supabase db push`** — it
  will replay ~35 backlog migrations and fail.
- **New work = NEW migration file at the next timestamp; never edit an applied migration in
  place.** RPCs are `CREATE OR REPLACE` (idempotent). After psql-applying, record it:
  `INSERT INTO supabase_migrations.schema_migrations (version,name,statements) VALUES (...,ARRAY[]::text[]);`
- Example just authored (NOT yet applied): `20260606_submit_kyc_v1_ungate_free.sql`
  (CORRECTION: the *deployed* ungate came via `1411a25`/`c9e4fbd`; confirm whether this exact
  file or an equivalent was the one psql'd — the live function body is gate-free either way).

**How C1 RLS was applied**
- Per-table, one at a time, app watched after each. Predicates use role **`public`** with
  `auth.uid()::text` casts (scoping columns are **text**, not uuid — `auth.uid()` is uuid).
  Staff tables scope by **`store_owner_uid`** (text), NOT a `store_id` join. Rollback per
  table = `ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;` (NOT a Vercel rollback — it's
  a DB change). Full staged plan + per-stage app-query checks: **C1-PLAN.md**.

**Edge functions (deployed, ACTIVE)** — 20 deployed; key ones:
- `verify-subscription` v76 (`verify_jwt:true`), `verify-transaction` v69 (`verify_jwt:true`),
  `initiate-storefront-payment` (F3, `verify_jwt:false`), `create-paystack-subaccount` (F2),
  `resolve-bank-account` (F1), `paystack-webhook-router` (correct HMAC, the intended URL),
  legacy `paystack-webhook` (bad HMAC — H1, undeploy after URL check),
  `paystack-subaccount-webhook`.
- **Deploy command:** `supabase functions deploy <name> --project-ref yzlniqwzqlsftxrtapdl`
  (Docker-not-running warning is informational; CLI uploads the bundle).

**Out-of-band checks still owed (un-introspectable; minutes each)**
1. `ENABLE_PAYSTACK_SUBACCOUNTS` value in prod edge secrets (gates the whole card path).
2. Paystack dashboard webhook URL → must point at `paystack-webhook-router`, not legacy (H1).
3. `BYPASS_KYC_FOR_SMOKE` unset in prod (L11).
4. `ENABLE_MARKETPLACE` unset (marketplace stays 501).
5. Sentry DSN set in Vercel (Sentry is wired; confirm events ship).
6. `.env.production.local` / `.env.vercel` are git-tracked — verify no live secrets committed.
- Check secrets: `supabase secrets list --project-ref yzlniqwzqlsftxrtapdl`.

**Deploy rules (from CLAUDE.md):** branch/stash → `npm run check:chat` → `npm run build` →
`vercel --prod --force --yes` → test on prod immediately. Emergency: Vercel Promote last-good
deploy; edge-fn restore from `.ts.*-stable` backups; DB rollback = `DISABLE ROW LEVEL SECURITY`
on the offending table (NOT a Vercel rollback).

---

_Read-only reconciliation. This file (and the session's diagnostic docs) are the only
writes. Not committed._
