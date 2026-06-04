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
