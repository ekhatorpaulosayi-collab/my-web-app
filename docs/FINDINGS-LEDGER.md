# Storehouse — Complete Findings Ledger

> **Generated:** 2026-06-04. Single reconciled map of **every** finding from both audits,
> with status verified against **live DB** (read-only, project `yzlniqwzqlsftxrtapdl`),
> **git log**, and the working tree — NOT trusted from the status doc alone.
> **HEAD:** `2261902`. Working tree clean.
>
> **Sources reconciled:** `docs/AUDIT.md` (6-agent security audit),
> `docs/AUDIT-FUNCTIONAL.md` (#1–#12 Free-tier commit review),
> `docs/REMEDIATION-STATUS.md` (claimed progress — found heavily updated and
> mostly accurate for C1; verified below), git log.
>
> **Status vocabulary (strict):**
> - **DONE** — commit hash + verified live/working-tree state.
> - **IN-PROGRESS** — partially done; what's left is named.
> - **WRITTEN-NOT-APPLIED** — fix authored (file on disk) but NOT live (e.g. C2).
> - **UNTOUCHED** — no work beyond the audit write-up.
>
> Nothing is marked DONE without evidence. Where REMEDIATION-STATUS claims more or
> less than the audit lists, the gap is shown.

---

## COUNT SUMMARY

**Total findings: 28** (16 security from AUDIT.md + 12 functional from AUDIT-FUNCTIONAL.md)

| Status | Count | IDs |
|---|---:|---|
| **DONE** (verified) | **2** | C4, L4-crash(canViewReports) |
| **IN-PROGRESS** | **1** | C1 (6/6 tables sealed; grants + column-views remain) |
| **WRITTEN-NOT-APPLIED** | **1** | C2 |
| **UNTOUCHED** | **24** | C3, H1–H4, M1–M7, L1–L3, L5–L12, Functional #1–#12 (minus overlaps) |

> Honest reading: only **2 findings are fully closed.** C1 — the worst one — has its
> **breach sealed** (all 6 tenant tables RLS-on, verified live) but is **not 100% done**
> (defense-in-depth grants + the column-leak views remain). Everything else (24) is
> **untouched** beyond diagnosis. The "24 untouched" is the real number.

> **Note on overlap:** AUDIT.md L4 (cosmetic staff RBAC) and the
> `canViewReports` crash are related but distinct — L4-the-design-smell is UNTOUCHED;
> the specific crash it predicted is DONE. Listed separately, counted once each.
> AUDIT.md C3-sibling (verify-transaction) == Functional M6 == AUDIT M6 — same bug,
> listed under M6, cross-referenced, counted once.

---

## A. SECURITY AUDIT (docs/AUDIT.md) — 16 findings

### Criticals

| ID | Sev | Description | STATUS | Blocks onboarding? | Fix type |
|---|---|---|---|---|---|
| **C1** | CRIT | RLS disabled on 6 tenant tables; anon full grants; cross-tenant data + bank PII readable | **IN-PROGRESS** — all 6 tables now `rls_enabled=true` w/ policies, **verified live today** (product_variants 4, sales 4, staff_activity_logs 1, staff_members 1, stores 2, users 2). Breach SEALED. Commits `ba1f8ac`→`89d6160`. **Remaining:** Stage 7 anon-DML REVOKE (defense-in-depth) + Stage 8 column-safe views (kyc_*/frozen_*/is_admin still reach anon for public stores via `select('*')`). | **NO longer** — core isolation is live. (Was the #1 blocker this morning.) | DB (+ frontend repoint for Stage 8 views) |
| **C2** | CRIT | KYC reviewer RPCs + affiliate increments PUBLIC-executable; privilege escalation | **WRITTEN-NOT-APPLIED** — migration `supabase/migrations/20260604_c2_harden_kyc_and_affiliate_rpcs.sql` authored & reviewed. **Live re-checked today: NOT applied** (`search_path_pinned=false`, `anon_can_execute=true` on all 4 fns). | **YES** — self-approve-KYC defeats the onboarding gate; anyone can approve their own KYC / freeze a competitor / inflate affiliate earnings. | DB |
| **C3** | CRIT | `verify-subscription` grants paid tier off client-supplied email, not JWT identity | **UNTOUCHED** | **YES** — attacker grants self a paid tier off a payment they didn't make; corrupts the tier that gates onboarding. | edge-function |
| **C4** | CRIT | Public unauth `/spike/paystack-v2` route wired to live payment fn, hardcoded prod store | **DONE** — `ec465b8`. Verified: `V2SpikeTest.tsx` absent from tree, 0 refs in `AppRoutes.jsx`. | n/a (closed) | frontend |

### Highs

| ID | Sev | Description | STATUS | Blocks onboarding? | Fix type |
|---|---|---|---|---|---|
| **H1** | HIGH | Legacy `paystack-webhook` uses SHA-512 (not HMAC); rejects genuine webhooks; still deployed | **UNTOUCHED** | **NO** (not a bypass) — but gates correct subscription settlement. Depends on out-of-band webhook-URL check. | out-of-band check → then edge undeploy |
| **H2** | HIGH | `whatsapp-webhook` has no signature/auth verification (forged payloads burn Claude/Twilio credits) | **UNTOUCHED** | **NO** | edge-function |
| **H3** | HIGH | F3's 3 inserts non-transactional; orphan orders; no reconcile cron | **UNTOUCHED** | **NO** (acceptable pre-volume) — must land before real volume | edge-function + DB (RPC + cron) |
| **H4** | HIGH | Affiliate fraud via permissive INSERT policies (`WITH CHECK true`) + public increment RPCs | **UNTOUCHED** (the increment-RPC half is partially addressed by C2's owner-check — but C2 not applied, and the permissive INSERT policies are separate) | **NO** | DB |

### Mediums / Lows

| ID | Sev | Description | STATUS | Blocks onboarding? | Fix type |
|---|---|---|---|---|---|
| **M1** | MED | F3 trusts client `unit_price_kobo`; no server re-read of product price | **UNTOUCHED** | **NO** (but real money risk pre-volume) | edge-function |
| **M2** | MED | Dispute/refund/`transfer.failed` events silently no-op'd | **UNTOUCHED** | **NO** | edge-function |
| **M3** | MED | `generate-embedding` unauthenticated, OpenAI-cost | **UNTOUCHED** | **NO** | edge-function |
| **M4** | MED | `ai_chat_messages`/`conversations` wide-open `USING(true)` policies → cross-tenant chat PII | **UNTOUCHED** (RLS is ON here; it's a *policy* fix, not enable-RLS — distinct from C1) | **NO** | DB |
| **M5** | MED | `payment_transactions` — verify no stray permissive SELECT policy remains | **UNTOUCHED** (live showed owner-scoped; needs confirmation) | **NO** | DB (verify) |
| **M6** | MED | `verify-transaction` no amount-vs-tier check, no email→JWT bind (C3 sibling) | **UNTOUCHED** | **YES-ish** — same class as C3; pay cheap plan, claim expensive tier. Fix with C3. | edge-function |
| **M7** | MED | `check_chat_quota` SECURITY DEFINER, anon-granted, no owner check, no search_path | **UNTOUCHED** | **NO** | DB |
| **L1** | LOW | `VITE_SUPABASE_SERVICE_ROLE_KEY` read in client (footgun if VITE_-var ever set) | **UNTOUCHED** | **NO** | frontend/config |
| **L2** | LOW | `supabase.raw(...)` runtime-bug — only in DEAD code | **UNTOUCHED** | **NO** | frontend (delete dead fns) |
| **L3** | LOW | Cost/profit PIN uses trivial non-crypto hash in localStorage | **UNTOUCHED** | **NO** | frontend |
| **L4** | LOW | Staff write-RBAC cosmetic (`return true`) | **UNTOUCHED** (design smell) — **but** the specific crash it predicted is **DONE** (`edf9497`: cashier `canViewReports` ReferenceError fixed + reports hidden from cashier; build green). | **NO** | frontend |
| **L5** | LOW | Subaccount card path drops promo/discount (`discount:0`) | **UNTOUCHED** | **NO** | frontend |
| **L6** | LOW | Subaccount fee breakdown not shown before commit | **UNTOUCHED** | **NO** | frontend |
| **L7** | LOW | Legacy v1 own-key path: client `Math.random` + marks order paid w/o server verify | **UNTOUCHED** | **NO** | frontend |
| **L8** | LOW | `PublicInvoiceView` exposes full customer PII keyed on raw invoice UUID (no share token) | **UNTOUCHED** | **NO** | frontend + DB |
| **L9** | LOW | 6 `security_definer_view`s | **UNTOUCHED** | **NO** | DB |
| **L10** | LOW | In-memory IP rate limiters per-isolate, not global | **UNTOUCHED** | **NO** | edge-function |
| **L11** | LOW | `BYPASS_KYC_FOR_SMOKE` bypasses KYC gate in F2/F3 | **UNTOUCHED** | **YES if set in prod** — confirm unset (out-of-band). | out-of-band check |
| **L12** | LOW | Hardcoded single `REVIEWER_USER_ID` | **UNTOUCHED** | **NO** | DB/edge (reviewers table, Phase 2) |

---

## B. FUNCTIONAL AUDIT (docs/AUDIT-FUNCTIONAL.md) — 12 findings

> Context: Paul DECIDED to ship Free-tier card payments → #1 is a blocker, #2/#3/#4
> are must-fix-before-onboard (per the audit's own reclassification).

| ID | Sev | Description | STATUS | Blocks onboarding? | Fix type |
|---|---|---|---|---|---|
| **#1** | CRIT (latent) | Downgrade money-flow regression: deleted guards were the only backstop; `subscription.disable` never re-gates the subaccount → lapsed merchant keeps taking card payments | **UNTOUCHED** | **YES** (per product decision) — arms the instant any onboarded merchant downgrades. Latent only because Paul's store is the sole active subaccount today. | edge-function (state-transition handler) |
| **#2** | HIGH | Four-layer Free contradiction: server allows Free, but `PaymentSetup.tsx:74` UI + `submit_kyc_v1` RPC still block it → feature unreachable | **UNTOUCHED** | **YES** (Free won't function for its audience) | frontend + DB (RPC) |
| **#3** | HIGH | Velocity caps checked against STALE counter: F3 ignores `*_resets_at` → wrongly blocks first order each day/month | **UNTOUCHED** | **YES** (Free caps are now the only anti-abuse lever; this breaks them) | edge-function |
| **#4** | HIGH | Velocity band never advances: promised nightly cron never built → everyone pinned at ₦200K/day forever | **UNTOUCHED** | **YES** (legit merchants throttled; manual override only) | DB (cron) or edge (read-time derive) |
| **#5** | MED | `requires_review` dead for Free: review threshold == monthly cap → high-value review never fires | **UNTOUCHED** | **NO** (but removes fraud safety net) | config (platform_fee_config) |
| **#6** | MED | Monthly cap meters CUSTOMER-CHARGED total, not goods sold → merchant hits cap ~₦487–492K of goods | **UNTOUCHED** | **NO** (messaging/semantics) | edge-function + DB (consistent both sides) |
| **#7** | MED | Velocity overrides don't compose; newer narrow override silently shadows older broad one | **UNTOUCHED** | **NO** | edge-function |
| **#8** | MED (Likely) | Flat-fee threshold tested on `subtotalKobo` not charged amount → merchant absorbs ~₦100 in a narrow band | **UNTOUCHED** | **NO** — needs live receipt to confirm (see out-of-band) | edge-function |
| **#9** | LOW | F2 "stale success" on downgrade: idempotency returns `reused:true` 200 to downgraded merchant | **UNTOUCHED** | **NO** (cosmetic at F2; harmful part is #1) | edge-function |
| **#10** | LOW | Type lie in `ResolvedTier.fee_config`: BIGINT cols declared `number`, returned as strings | **UNTOUCHED** | **NO** (no live failure; future footgun) | edge-function |
| **#11** | LOW | No reviewer notification + single hardcoded reviewer for stuck orders | **UNTOUCHED** | **NO** (overlaps L12; arms via #5 override divergence) | edge-function |
| **#12** | LOW | Wasted DB work + stale comment on F2 reuse path | **UNTOUCHED** | **NO** | edge-function |

---

## 1. ONBOARDING GATE — minimal set still blocking a safe paying-merchant onboard

A paying merchant can onboard safely once these are closed AND a live test txn passes:

**STILL BLOCKING:**
- **C2** (WRITTEN-NOT-APPLIED) — self-approve-KYC defeats the onboarding gate itself. Apply the authored migration (after staging check).
- **C3** (+ its sibling **M6**) — tier-grant forgeable off client email / unverified amount; corrupts the entitlement that gates onboarding.
- **Functional #1** — downgrade re-gating; the money landmine that arms on first lapse.
- **If Free ships** (decision on record): **#2** (make Free reachable), **#3** (stale velocity counter), **#4** (band never advances) — the velocity caps are Free's only anti-abuse lever and must work.
- **Out-of-band: a live-mode Paystack test transaction** — no static work substitutes for it.

**NO LONGER blocking (changed today):**
- **C1** — core tenant isolation is **live and verified** (6/6 tables). Its *remaining* pieces (Stage 7 grants, Stage 8 column-views) are defense-in-depth / a column leak of `kyc_*`/`frozen_*` on public stores — important, but not the cross-tenant breach, and not a hard onboarding blocker.
- **C4** — closed.

**NOT blockers (defer past onboarding):** H1–H4, all M-except-M6, all L, Functional #5–#12. Real, but not gating the first paying merchant.

**Release valve (from REMEDIATION-STATUS):** if time-tight, defer Free tier entirely — a single Pro merchant doesn't need it, which removes #2/#3/#4/#5/#6 from the gate.

---

## 2. RECOMMENDED ORDER for remaining work

**Tier 1 — close the onboarding gate (do first, in this order):**
1. **C2** — apply the already-written migration (staging-verify reviewer path first; it's authored, lowest effort-to-close of the blockers). DB.
2. **C3 + M6** — bind tier grant to JWT email + verify amount server-side. One edge-function workstream. DB/edge.
3. **Functional #1** — re-gate (or explicitly bless) subaccount on `subscription.disable`. edge.
4. **If shipping Free:** #2 → #3 → #4 (reachability, then the two velocity correctness bugs). Mixed frontend/edge/DB.
5. **Live test transaction** (out-of-band) — gates "done."

**Tier 2 — finish C1 + pre-volume hardening:**
6. C1 Stage 7 (anon-DML REVOKE) + Stage 8 (column-safe views for stores/users) — close the residual column leak.
7. H1 (confirm webhook URL, undeploy legacy) · H3 (atomic F3 inserts + reconcile) · H2 (whatsapp sig) · M1 (server price re-read) · M2 (dispute/refund handlers).
8. Functional #5 (review threshold < cap) · #6 (cap basis) · #8 (flat-fee boundary, after live receipt).

**Tier 3 — cleanup / low:**
9. M3–M5, M7 · L1–L12 (minus L4-crash, done) · Functional #7, #9–#12 · H4 permissive-INSERT policies · affiliate self-conversion follow-up · drop `sales_units_backup_20260530` · the 4 non-tenant RLS-off tables.

**Known non-audit bug surfaced during C1 work (track separately):** Settings profile page shows empty `business_name` though data exists (frontend form not populating on mount). Pre-existing, ~weeks old, not C1/RLS. Frontend fix.

---

## 3. OUT-OF-BAND CHECKS STILL OWED (no code change covers these)

| # | Check | Gates | Why it can't be introspected |
|---|---|---|---|
| 1 | **Paystack dashboard webhook URL** — points at `paystack-webhook-router` (correct) or legacy `paystack-webhook` (broken HMAC)? | H1 severity; subscription settlement correctness | Dashboard config, not in repo/DB |
| 2 | **`ENABLE_PAYSTACK_SUBACCOUNTS`** value in prod edge secrets | Whether the whole card path (incl. former C4 spike) is live | Edge-function secret, not readable read-only |
| 3 | **`BYPASS_KYC_FOR_SMOKE`** unset in prod | L11 — bypasses the KYC onboarding gate if set | Edge-function secret |
| 4 | **`ENABLE_MARKETPLACE`** unset in prod | marketplace endpoint stays 501/disabled | Edge-function secret |
| 5 | **Sentry DSN set in Vercel** | Whether errors actually ship (audit confirmed Sentry wired) | Vercel env var |
| 6 | **Live-mode Paystack test transaction** (test card 4084…, compare verify-API `fees_split` vs F3 breakdown) | The entire money path E2E; Functional #8 boundary; closes the "static audit can't prove money" caveat | Requires a real charge; no static substitute |
| 7 | **Bearer policy on any real merchant subaccount** = `account` | Vendor not absorbing Paystack fee twice (PAYSTACK-DEBUG §11.2) | Paystack dashboard |

---

## Evidence appendix (how each DONE/verified status was checked)

- **C1 live:** `pg_class.relrowsecurity` + `pg_policies` count, today — all 6 tables `true` with policies (product_variants 4, sales 4, staff_activity_logs 1, staff_members 1, stores 2, users 2). Commits `ba1f8ac`,`cd1c0d4`,`4aaaf02`,`89d6160`. REMEDIATION-STATUS C1 UPDATE 1–3 + CORE COMPLETE corroborate with per-table anon-count-→0 verifications.
- **C2 NOT applied:** `pg_proc` today — `search_path_pinned=false`, `anon=X` still present on approve_kyc_review / reject_kyc_review / grant_velocity_override / increment_affiliate_conversion. Migration file present but unrun.
- **C4 done:** `src/pages/V2SpikeTest.tsx` absent; 0 `V2SpikeTest` refs in `AppRoutes.jsx`. Commit `ec465b8`.
- **L4-crash done:** `Dashboard.tsx` + `App.jsx:151,6507` contain the `canViewReports` destructure/guards. Commit `edf9497`.
- **Working tree:** clean at HEAD `2261902`.
- **Everything else:** no commit and no live state-change found → UNTOUCHED.

_Read-only audit; this file is the only write. Not committed._
