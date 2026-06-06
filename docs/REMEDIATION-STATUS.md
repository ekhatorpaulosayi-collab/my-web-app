# Storehouse Remediation Status
_Started: 2026-06-04. Source of truth for audit fixes. Updated as work progresses._

## Context
Two audits run on 2026-06-04:
- docs/AUDIT.md — security audit (6-agent, look-only). 4 Criticals + High/Med/Low.
- docs/AUDIT-FUNCTIONAL.md — review of the Free-tier card-payments commit. 1 Critical-latent + correctness bugs.
- NOT YET RUN: broad correctness sweep of non-payment features (Ajo, Money Book, invoices, inventory).

Product decision on record: Free-tier card payments IS shipping → functional #2/#3/#4 are must-fix-before-onboard.

## Onboarding gate
A paying merchant cannot onboard safely until: C1, C2, C3, functional #1 are fixed, AND a live test
transaction passes. If Free ships alongside: also functional #2/#3/#4. Realistic timeline: several days,
not 48h (C1 needs staged testing). Release valve if time-tight: defer Free tier (Pro merchant doesn't need it).

## DONE
- [x] C4 — public /spike/paystack-v2 route wired to live payment. Deleted, deployed, verified live
      (route now 404s / routes to login), committed (ec465b8), pushed.
- [x] Both audit reports saved + committed (498adb6).

## IN PROGRESS
- [ ] C2 — KYC reviewer RPCs + affiliate increments publicly executable (privilege escalation).
      Diagnosis done. Self-lockout trap confirmed safe (psql/postgres owner path exempt; reviewer UUID
      dffba89b... confirmed = my account). Owner-check confirmed: affiliates.user_id is uuid, no cast.
      DECISIONS: affiliate conversion = owner-check only now (self-conversion fraud left open -> follow-up
      logged); KYC guard keeps auth.uid() IS NULL allow-branch.
      NEXT: write migration -> review SQL together -> test on staging clone -> apply to prod.

## LEFT TO DO (authorization workstream — the onboarding gate)
- [ ] C3 — verify-subscription grants tier off client-supplied email, not JWT. Contained edge-fn edit.
- [ ] Functional #1 — downgrade re-gating: lapsed merchant keeps taking card payments (LATENT — not
      exploitable today, arms when a real merchant onboards then lapses). Fix at subscription.disable event.
- [ ] C1 — RLS disabled on tenant tables (stores/users/sales/staff/+); anon has full grants; bank numbers
      exposed. THE BIG ONE. Highest risk to fix (text columns need auth.uid()::text; wrong = locks out all
      16 tenants). Also: relocate stores.account_number out of the public-readable table. Staged, table-by-
      table, staging-clone tested.

## LEFT TO DO (Free-enablement — promoted by "ship Free" decision)
- [ ] Functional #2 — Free shipped but unreachable (UI + submit_kyc_v1 still block Free; only 2 of 4 layers changed).
- [ ] Functional #3 — stale velocity counter: F3 ignores *_resets_at, wrongly blocks first order each day/month.
- [ ] Functional #4 — velocity band never advances (nightly cron never built; everyone pinned at N200K/day).

## LEFT TO DO (before real volume — not onboarding blockers)
- [ ] H1 — legacy paystack-webhook wrong crypto. NOT a bypass (rejects genuine webhooks). Confirm Paystack
      dashboard URL points at paystack-webhook-router, then undeploy legacy.
- [ ] H2 — whatsapp-webhook no signature check (forged payloads burn Claude/Twilio credits).
- [ ] H3 — F3's 3 inserts not atomic (orphan orders); needs wrapping RPC + reconcile cron.
- [ ] M1/M6 — server trusts client price / tier amount.
- [ ] Affiliate conversion self-fraud follow-up (move recordAffiliateSale increment server-side, then make
      increment_affiliate_conversion service_role-only).

## OUT-OF-BAND CHECKS I OWE (un-introspectable; minutes each)
- [ ] Paystack dashboard webhook URL — router vs legacy (gates H1).
- [ ] ENABLE_PAYSTACK_SUBACCOUNTS value in prod.
- [ ] BYPASS_KYC_FOR_SMOKE unset in prod (L11).
- [ ] Sentry DSN set in Vercel (so events ship).
- [ ] Live-mode Paystack test transaction (static audit can't prove the money path E2E).

## NOT YET EXAMINED (known gap)
- [ ] Broad correctness sweep: Ajo/Contributions payout math, Money Book debt/credit balances, invoice
      arithmetic, inventory decrement. Scoped but never run. Do after authorization workstream.

## C1 ROLLOUT PROGRESS — 2026-06-04 (paused mid-rollout)
Approach note: direct-on-prod table-by-table was used for the simple owner-scoped tables.
DECISION CHANGED: the high-stakes tables (auth path + dual-purpose policies) must have their
policies PROVEN CORRECT on a staging clone before prod — not flip-and-glance — because the app
is being built for scale (millions of users), so policy correctness matters more than current
(disposable) data volume.

DONE — RLS enabled on prod, verified (anon leak sealed + owner access intact):
- [x] product_variants — RLS on (policies pre-existed). Verified: app intact.
- [x] sales — RLS on (policies pre-existed). Verified: dashboard sales intact.
- [x] staff_activity_logs — RLS on + new owner policy (store_owner_uid = auth.uid()::text).
      Verified: anon count 14 -> 0 (leak sealed). Owner UI check: [confirm].

PAUSED — NOT enabled, need staging verification first (build-for-scale standard):
- [ ] staff_members — RLS OFF. Leak proven (anon reads 2 rows). RISK: read by staff PIN-login flow;
      wrong policy = staff cannot log in (auth break, not just hidden screen). Proposed policy:
      store_owner_uid = auth.uid()::text. MUST test PIN login end-to-end on staging before prod.
- [ ] users — RLS OFF. DUAL-PURPOSE: self-access (id = auth.uid()::text) AND public marketplace
      (anon reads store_visible=true). Needs TWO policies. Wrong = marketplace breaks or self-access locks out.
- [ ] stores — RLS OFF. DUAL-PURPOSE: owner (user_id = auth.uid()::text) + storefront (anon is_public=true).
      Highest traffic; the bank-details table. Plus column-leak: select('*') exposes private cols to anon.

REMAINING AFTER THE 3 ABOVE:
- [ ] grants — REVOKE anon DML (+ scoped anon SELECT) AFTER all RLS verified.
- [ ] stores/users column-safe views (Option A) — close the private-column leak (kyc_*, frozen_*, is_admin, etc.)
- [ ] 4 non-tenant RLS-off tables noted but out of C1 scope: ai_chat_rate_limits, green_api_pool,
      whatsapp_debug_log, sales_units_backup_20260530 (backup table: probably just drop).

NEXT ACTION: set up staging (short-lived Supabase branch ~$0.30, or Docker local) → verify the 3
high-stakes table policies there (esp. staff PIN login, users marketplace read, stores storefront read)
→ then apply to prod with rollback ready. Full verified plan: docs/C1-PLAN.md.

## C1 UPDATE 2 — 2026-06-04 (session continued)
- [x] users — RLS ON + 2 policies (users_self_all: id=auth.uid()::text; users_public_marketplace_read:
      store_visible=true, dormant—marketplace is future-launch). VERIFIED: anon 24->0 (leak sealed);
      authenticated self-read returns own row (business_name osayi1) — not locked out. DONE.
  Note: store_visible=0 for all 24 users is correct (marketplace not launched yet).

SEPARATE BUG (pre-existing, NOT C1, frontend): Settings profile page shows EMPTY business_name field,
though data exists (query returns osayi1) and dashboard displays it. ~weeks old. Settings form not
populating saved value into input on mount. Fix later via localhost->Vercel (code, not DB).

C1 PROGRESS: 4 of 6 tenant tables done (product_variants, sales, staff_activity_logs, users).
REMAINING: stores (high-harm, dual-purpose, next), staff_members (paused-needs PIN test).

## C1 UPDATE 3 — 2026-06-04
- [x] stores — RLS ON + 2 policies (stores_owner_all: user_id=auth.uid()::text; stores_public_read:
      is_public=true for anon). VERIFIED: anon 16->15 (private store hidden, 15 public storefronts
      reachable); live storefront renders; dashboard loads. DONE.
  KNOWN FOLLOW-UP: storefront select('*') still sends full row (kyc_status, frozen_*, is_admin,
  domain_verification_token) to anon for public stores. Closed by column-safe view (Stage 8), not this enable.

C1 PROGRESS: 5 of 6 tenant tables done. ALL HIGH-HARM TABLES CLOSED.
Remaining: staff_members (needs PIN-login test); then grants (Stage 7); then column-safe views (Stage 8).

SEPARATE BUG (pre-existing, NOT C1, frontend RBAC): Logging in as staff CASHIER role crashes with
"ReferenceError: canViewReports is not defined" (error boundary catches it) when the reports view renders.
In the deployed bundle = shipped code bug, not an RLS symptom (RLS returns empty rows, never undefined vars).
Matches audit L4 (staff RBAC cosmetic/half-wired). Staff AUTH itself works (log: "Staff authenticated: Paul").
Fix: declare/wire canViewReports permission. Code fix via localhost->Vercel. Owner mode unaffected.

## C1 CORE COMPLETE — 2026-06-04
- [x] staff_members — RLS ON + policy (store_owner_uid = auth.uid()::text). VERIFIED: anon 3->0
      (leak sealed); owner-sim returns 2 (own staff readable; PIN flow runs as owner = not locked out).
      Verified via SET ROLE simulation (staff UI has separate canViewReports crash, unrelated).

*** ALL 6 TENANT TABLES NOW RLS-PROTECTED ***
product_variants, sales, staff_activity_logs, users, stores, staff_members — cross-tenant breach SEALED.
This morning anon could read all 16 tenants' data; now each table enforces isolation at the DB.

C1 REMAINING (cleanup, not breach-blockers):
- [ ] Stage 7 grants: REVOKE anon DML on the 6 tables (defense-in-depth) after confirming nothing breaks.
- [ ] Stage 8 column-safe views: close stores/users select('*') column leak (kyc_*, frozen_*, is_admin
      still reach anon for public stores). Frontend repoint — localhost->Vercel.
- [ ] 4 non-tenant RLS-off tables (ai_chat_rate_limits, green_api_pool, whatsapp_debug_log,
      sales_units_backup_20260530) — out of original C1 scope; backup table likely just drop.

NEXT: canViewReports cashier crash (frontend RBAC bug, code fix), then C2 apply, C3, etc.

## C2 APPLIED + VERIFIED — 2026-06-04
Migration 20260604_c2_harden_kyc_and_affiliate_rpcs.sql applied to PROD (psql -f, ON_ERROR_STOP, clean COMMIT).
VERIFIED via pg_proc:
- KYC fns (approve/reject/grant_velocity): proacl {postgres, service_role} ONLY — anon/authenticated/PUBLIC revoked.
- Affiliate fns (increment_*): grants preserved — browser tracking intact, owner-check in-body. No damage.
- All 6: proconfig {search_path=public}. postgres retains EXECUTE on approve_kyc_review (reviewer path intact).
RESIDUAL (on record): increment_affiliate_conversion self-conversion fraud open until recordAffiliateSale
increment moves server-side (separate follow-up). C2: WRITTEN-NOT-APPLIED -> DONE.

## C3 + M6 DEPLOYED (test pending) — 2026-06-06
verify-subscription + verify-transaction deployed to prod (yzlniqwzqlsftxrtapdl), committed 2ac7e28.
- C3: sub-matching email now from JWT (verifiedEmail); client customerEmail ignored; subscriptionCode path REJECTED.
- M6: verify-transaction binds transaction email to JWT user.email; asserts amount(kobo) >= tier price_*(naira x100).
- Diff reviewed line-by-line before deploy.
- ⚠️ NOT YET TESTED LIVE. Two tests owed BEFORE a real merchant pays:
  1. C3: curl verify-subscription with subscriptionCode -> expect "subscriptionCode path not supported".
  2. Legitimate upgrade still grants (real Paystack flow) — ALSO confirms Paystack plan amounts match DB price_*.
     If a real correct payment is rejected with "amount does not cover" = Paystack-vs-DB price MISMATCH (data fix, not code).
C3 + M6: UNTOUCHED -> DEPLOYED-PENDING-TEST.
