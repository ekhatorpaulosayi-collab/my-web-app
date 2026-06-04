# Functional / Correctness Audit — commit `c92cdea` ("feat(paystack): enable Free tier card payments")

> **Generated:** 2026-06-04 by a max-effort multi-angle code review (9 finder angles ×
> 1-vote verification × gap sweep), with all load-bearing facts confirmed against the
> **live** database (project `yzlniqwzqlsftxrtapdl`, read-only) and the actual
> RPC / webhook-handler source — not inferred.
>
> **Scope:** the entire diff under review — removal of two `tier === 'free'` 403
> entitlement guards (F2 `create-paystack-subaccount`, F3 `initiate-storefront-payment`)
> plus a CLAUDE.md "Session 11" doc section. This builds on `docs/AUDIT.md` (the prior
> security/payment-path map) and does **not** re-litigate its findings.
>
> **EVERY fix below is PROPOSED, never applied.** This was a look-only review. Nothing
> in the repo or database was changed. The single write is this file.
>
> ## ⚠️ PRODUCT DECISION ON RECORD (2026-06-04)
> Paul has **DECIDED to ship Free tier card payments.** That decision reclassifies the
> findings:
> - **#1** (downgrade re-gating) is a **blocker** — a money-handling landmine that arms
>   the moment a real merchant onboards then lapses.
> - **#2** (four-layer Free contradiction), **#3** (stale velocity counter), and **#4**
>   (velocity band never advances) are **MUST-FIX-BEFORE-ONBOARD**, not optional. With
>   Free shipping, the feature must actually be reachable (#2) and the velocity caps that
>   are now the sole anti-abuse lever must work correctly (#3, #4).
>
> ## ⚠️ A static review proves logic, not runtime. 
> Findings tagged **Likely** below (notably #8, the Paystack flat-fee boundary) require a
> live Paystack test transaction to move to Proven. See "MUST TEST LIVE" at the end.

**Two axes per finding:** Severity (Critical = wrong money math / data corruption / loses
money | High | Med | Low) + Confidence (Proven = artifact attached | Likely | Suspected).

---

## PART 1 — CORRECTNESS FINDINGS (ordered by must-fix priority)

---

### #1 — [CRITICAL / Likely (latent, not exploitable today)] Downgrade money-flow regression: deleted guards were the only runtime backstop; the downgrade webhook never re-gates the subaccount

**File:** `supabase/functions/_shared/paystack-subscription-handler.ts:255` (`handleSubscriptionDisable`)
also implicates `supabase/functions/initiate-storefront-payment/index.ts:158` (the now-unguarded F3 path).

**What.** The two `tier === 'free'` 403 guards this commit deleted were the **only**
runtime check stopping a *downgraded* merchant from continuing to take card payments.
`handleSubscriptionDisable` downgrades `user_subscriptions` (tier_id→Free, status→cancelled)
but **never** sets `paystack_subaccounts.active=false`, `stores.paystack_subaccounts_enabled=false`,
or `stores.frozen=true`.

**Artifact (verified source + live data):**
- `paystack-subscription-handler.ts:255-265` — the downgrade `UPDATE` touches only
  `user_subscriptions` columns (`tier_id`, `status`, `billing_cycle`, `payment_reference`,
  `cancelled_at`, `updated_at`). No write to `paystack_subaccounts` or `stores`.
- A grep across the entire repo for any code that deactivates a subaccount / flips the
  per-store flag / freezes a store on downgrade returned **nothing**.
- F3 gate chain for a downgraded-but-onboarded merchant: store check (`index.ts:129-137`)
  passes (`paystack_subaccounts_enabled` still true), `frozen` (`:132`) passes,
  `kyc_status==='approved'` (`:135`) passes (downgrade doesn't touch `stores`), active
  subaccount (`:158`) passes, velocity (`:221`) passes. F3 returns a live
  `authorization_url`. The webhook then settles via `record_successful_payment` (no tier
  check anywhere in the RPC).

**Failure scenario.** Merchant subscribes to Pro, completes KYC, onboards a subaccount
(`active=true`, `enabled=true`), takes card payments. Their subscription lapses →
`subscription.disable` fires → tier flips to free but the subaccount stays fully live. A
customer checks out. **Pre-commit:** F3 returned `403 subscription_required` ("subaccount
is paused, re-upgrade to receive payments"). **Post-commit:** F3 sails past every
remaining gate and the downgraded merchant keeps collecting money indefinitely on the Free
fee schedule.

**Why latent, not exploitable today.** Live query (2026-06-04) — the *only* store with
`paystack_subaccounts_enabled=true` is Paul's store `d93cd891-7e0a-47a8-9963-5e2a00a2591f`
(Pro, `status=active`, `current_period_end=2099-01-01`). No real downgraded merchant has an
active subaccount yet. The bug **arms the instant** any onboarded merchant downgrades.

**PROPOSED FIX (UNAPPLIED).** Enforce entitlement at the **state-transition**, not at each
payment. In `handleSubscriptionDisable` (and `handleSubscriptionNotRenew`), on downgrade to
Free, decide the policy: either (a) set `paystack_subaccounts.active=false` +
`stores.paystack_subaccounts_enabled=false` to pause card-taking until re-upgrade, or
(b) if Free is genuinely allowed to keep taking payments (per the Session 11 decision),
make that explicit and documented so the "downgraded merchant keeps charging" behavior is
intended rather than an accident of guard removal. Do **not** leave enforcement at neither
altitude (point-of-use guard deleted, state-transition does nothing).

---

### #2 — [HIGH / Proven] Four-layer Free-tier contradiction: server now ALLOWS Free, but the UI and the KYC RPC still BLOCK it — feature is unreachable through the product

**File:** `src/pages/PaymentSetup.tsx:74` (UI gate) + `supabase/migrations/20260515_submit_kyc_v1_rpc.sql:64,70` (RPC gate).

**What.** "Which tiers may use card payments" is asserted in **≥4 disjoint sites**: the F2
guard (deleted), the F3 guard (deleted), `PaymentSetup.tsx:74`, and the `submit_kyc_v1`
RPC. The commit flipped the policy in only **2 of the 4**. The remaining two still reject
Free, so a real Free merchant can never reach the path the edge layer now permits.

**Artifact (verified source + live data):**
- `PaymentSetup.tsx:74` — `if (!tier || tier.tier_id === 'free') { setStatus({kind:'tier_locked'}); setKycStatus({kind:'tier_locked'}); return; }` forces **both** onboarding
  cards (bank setup + KYC) into `tier_locked` → CTA navigates to `/upgrade`. The comment
  at `:66-71` confirms intent and notes business-tier also resolves to free here. Git
  blame: last touched by `9da2849` (2026-05-16), **not** updated by `c92cdea`.
- `submit_kyc_v1` RPC: `:64` `AND us.tier_id IN ('starter', 'pro')` → `:70`
  `RAISE EXCEPTION 'subscription_required'`. A Free caller's KYC submission is rejected, so
  `kyc_status` never reaches `'approved'`.
- Downstream consequence: F2 (`create-paystack-subaccount/index.ts:169`) and F3 (`:135`)
  both require `kyc_status === 'approved'`, so even a deep-link bypass of the UI dead-ends
  at `412 kyc_not_approved`.
- Live: all 11 Free-tier stores sit at `kyc_status='not_started'`.

**Failure scenario.** A Free merchant opens `/settings/payments` to set up card payments
(the feature this commit advertises). Both cards render locked with a "Choose a plan"
button to `/upgrade`. There is no UI route to KYC or the bank wizard. Via a deep link,
`submit_kyc_v1` rejects their KYC with `subscription_required`. The server-side enablement
is a no-op for its stated audience.

**PROPOSED FIX (UNAPPLIED).** Since Free is shipping (decision on record): (a) update
`PaymentSetup.tsx:74` to admit Free into the onboarding cards (drop `|| tier.tier_id === 'free'`
or render a Free-specific card), and (b) update `submit_kyc_v1` (migration) to include
`'free'` in the paid-tier set, or remove the tier check from KYC submission entirely.
**Altitude note:** the deeper fix is a single source of truth — e.g.
`isTierEntitledToCardPayments(tier)` helper or a `card_payments_enabled` column on
`platform_fee_config` — consulted by every layer, so the next tier-policy change touches
one place instead of four that can disagree (as they do now).

---

### #3 — [HIGH / Proven] Velocity caps enforced against a STALE volume counter: F3 pre-check ignores the reset timestamp

**File:** `supabase/functions/initiate-storefront-payment/index.ts:268` (daily) and `:280` (monthly).

**What.** F3's pre-check reads `velocity.current_day_volume_kobo` / `current_month_volume_kobo`
**without** ever comparing `current_day_resets_at` / `current_month_resets_at` to `now()`.
The reset is performed only inside `record_successful_payment` (the settlement webhook),
which runs strictly **after** F3 has already gated the same order.

**Artifact (verified schema + source):**
- `vendor_velocity_limits` HAS `current_day_resets_at` and `current_month_resets_at`
  (both `timestamptz NOT NULL`) — confirmed via `information_schema.columns`.
- F3 grep: the only references to the volume columns are `:268` and `:280`; **zero**
  references to any `*_resets_at` column in `initiate-storefront-payment/index.ts`.
- Settlement RPC `record_successful_payment` (migration `20260527...:104-124`) correctly
  resets: `current_day_volume_kobo = CASE WHEN v.current_day_resets_at <= NOW() THEN
  <new amount> ELSE v.current_day_volume_kobo + <new amount>` (and same for month). So the
  reset logic exists — but only on the settlement side, after F3's check.

**Failure scenario.** Free merchant transacts ₦190K of card orders on day N (all settle;
`current_day_volume_kobo=19,000,000`, `current_day_resets_at`=midnight day N+1). After
midnight on day N+1 a customer initiates a ₦20K order. No settlement has fired yet today,
so the counter is still 19,000,000 and `resets_at` is in the past but never re-evaluated by
F3. `:268`: `19,000,000 + ~2,047,000 > 20,000,000` (day-1 ₦200K cap) → `daily_cap_exceeded`.
The merchant is wrongly blocked from their first orders **every morning** (and every
1st-of-month for the ₦500K monthly cap) until an unrelated settlement happens to reset the
stale counter. Newly load-bearing because Free's caps are the only ones that bite.

**PROPOSED FIX (UNAPPLIED).** In F3, treat the counter as `0` when its `resets_at` has
passed before comparing — i.e. `const dayVol = new Date(velocity.current_day_resets_at) <= now ? 0 : Number(velocity.current_day_volume_kobo)` (and same for month) — or reset-in-place
in a `SECURITY DEFINER` RPC before the check. Mirror the exact CASE logic the settlement
RPC already uses so the pre-check and settlement agree.

---

### #4 — [HIGH / Proven] Velocity band never advances: every merchant pinned to the day-1 ₦200K/day cap forever (promised advancement cron was never built)

**File:** `supabase/migrations/20260509_paystack_subaccounts_foundation.sql:326` (the unfulfilled promise) + `supabase/migrations/20260511_complete_subaccount_onboarding_rpc.sql` (the seed).

**What.** `vendor_velocity_limits` is seeded at the day-1 band (`daily_cap_kobo`=₦200K,
`days_since_approval`=0, `monthly_cap_kobo`=NULL). The foundation migration comment says a
nightly cron "(Session 5+) advances `days_since_approval` and bumps" the cap — but that cron
was **never built**. Nothing in the system ever advances the band.

**Artifact (verified):**
- `20260509...:326` — comment: *"A nightly cron (Session 5+) advances days_since_approval
  and bumps [the cap]."*
- Grep of `supabase/migrations/` for scheduled jobs: the **only** `cron.schedule` calls are
  `daily-business-summaries` / `weekly-business-summaries` (`20260409_business_summaries.sql`)
  and the commented-out ai-chat cleanup (`create_ai_chat_tracking_tables.sql`). **No** job
  touches `days_since_approval` or `daily_cap_kobo`.
- `record_successful_payment` updates `current_*_volume_kobo` / `*_resets_at` only — never
  `daily_cap_kobo` or `days_since_approval`.

**Failure scenario.** Every onboarded merchant — Free, Starter, Pro — is permanently pinned
to ₦200K/day and never graduates to the ₦500K (days 8-30) or unlimited (day 31+) bands the
design promises. A legitimate merchant doing >₦200K/day in card sales is silently throttled
forever; only a manual `vendor_velocity_overrides` grant (Paul-run bash script) lifts it.
This commit makes it the de-facto real daily ceiling for the newly-admitted Free population.

**STATIC PATTERN — needs no profiling; confirmed by 0-cron grep.**

**PROPOSED FIX (UNAPPLIED).** Build the promised nightly job (pg_cron or an edge cron) that
advances `days_since_approval` and bumps `daily_cap_kobo` per the band schedule, OR
re-derive the effective daily cap from `days_since_approval` at read time in F3 (compute the
band on the fly from `kyc_approved_at`/onboarding date rather than relying on a stored value
a cron must maintain). The read-time approach removes the cron dependency entirely.

---

### #5 — [MED / Proven] `requires_review` is effectively dead for Free tier: review threshold equals the monthly cap

**File:** `supabase/functions/initiate-storefront-payment/index.ts:289`.

**What.** Free's `large_transaction_review_threshold_kobo` (₦500K) **equals** Free's
`monthly_volume_cap_kobo` (₦500K), so any transaction large enough to flag review is blocked
by the monthly cap first. Review fires only at the single measure-zero boundary
`customerTotalKobo == 50,000,000` on a zero-prior-volume month.

**Artifact (verified live data + arithmetic):**
- Live `platform_fee_config` Free row: `large_transaction_review_threshold_kobo = 50000000`,
  `monthly_volume_cap_kobo = 50000000` — equal.
- Monthly check `:280`: rejects when `current_month_volume + customerTotalKobo > 50000000`.
  Review `:289`: `customerTotalKobo >= 50000000`. For any 2nd+ transaction in a month
  (prior volume V>0): review needs `ct≥50M` but the cap needs `V+ct≤50M ⇒ ct<50M` →
  mutually exclusive, review can never fire. First-of-month: only `ct == 50,000,000`
  exactly (subtotal ₦492,400, since `round((49,240,000+10,000)/0.985)=50,000,000`).

**Failure scenario.** A Free merchant runs unlimited sub-₦500K card transactions with
**zero** reviewer oversight — the high-value fraud-review safety net (`vendor_can_fulfill=false`,
`review_status='pending'`) the removed entitlement guard implicitly relied on never engages.

**PROPOSED FIX (UNAPPLIED).** Set Free's `large_transaction_review_threshold_kobo` strictly
below its `monthly_volume_cap_kobo` (e.g. review at ₦100K-200K) so high-value review retains
coverage on the tier now open to the public, or scale the threshold as a fraction of the
effective cap.

---

### #6 — [MED / Proven] Monthly volume cap meters CUSTOMER-CHARGED total, not goods sold

**File:** `supabase/functions/initiate-storefront-payment/index.ts:280` (and daily at `:268`).

**What.** The cap compares against `customerTotalKobo` (subtotal grossed up ~1.5% + ₦100/txn
flat), and the settlement counter banks that same `amount_total_kobo`. Internally consistent
(no unit-mismatch crash), but the ₦500K cap is documented and messaged as a cap on what the
merchant *sells*.

**Artifact (verified):**
- `:197` `customerTotalKobo = round((subtotalKobo + flatKobo) / 0.985)` — fee-inflated.
- `:202` `vendorNetKobo = subtotalKobo - storehouseTakeKobo` (the goods value) — NOT used in
  either cap check.
- `:280`/`:268` compare against `customerTotalKobo`.
- `record_successful_payment` (`20260510...:86-89`, identical in `20260527...`) increments
  `current_month_volume_kobo` by `v_split.amount_total_kobo`, which F3 wrote at `:354` as
  `customerTotalKobo`. So counter and cap are the same unit — consistent, not a crash.

**Failure scenario.** A Free merchant pricing ₦500K of goods hits `monthly_cap_exceeded` at
roughly ₦487-492.5K of actual product value (the ~1.5% gross-up plus per-transaction ₦100
flats consume the ₦500K of customer-charges early). The error copy ("reached this month's
transaction limit") implies goods value, so the merchant is told they hit a ₦500K limit
while having sold materially less.

**PROPOSED FIX (UNAPPLIED).** Decide the cap's intended basis. If it should limit *goods
sold*, compare against (and accumulate) `subtotalKobo`/`vendorNetKobo`, not `customerTotalKobo`
— change both the F3 pre-check AND the settlement RPC counter in one atomic deploy so they
stay consistent. If customer-charges is intended, fix the messaging.

---

### #7 — [MED / Likely] Velocity overrides don't compose; a narrower newer override silently shadows a broader older one

**File:** `supabase/functions/initiate-storefront-payment/index.ts:242-252`.

**What.** The override lookup takes the single most-recent active override
(`order('created_at', desc).limit(1)`), and `effectiveMonthlyCap = override?.monthly_cap_kobo ?? feeConfig.monthly_volume_cap_kobo` reads only that one row's monthly column.

**Artifact:** `:242-249` selects one row by recency; `:251-252` reads only that row's
`daily_cap_kobo` / `monthly_cap_kobo`. No accumulation across multiple active overrides.

**Failure scenario.** Paul grants override A (`monthly_cap=₦2M`, permanent) to let a merchant
scale, then later grants override B (`daily_cap=₦300K` only, `monthly_cap`=NULL) for a
temporary daily bump. Both active. F3 picks B (newest). `effectiveMonthlyCap = B.monthly_cap_kobo(NULL) ?? ₦500K = ₦500K` — override A's ₦2M monthly grant is silently dropped. The merchant
Paul believed had a ₦2M ceiling is back to ₦500K the moment any newer single-dimension
override is issued.

**PROPOSED FIX (UNAPPLIED).** Compose overrides per-dimension: select the most permissive
(or most-recent-non-null) value for `daily_cap_kobo` and `monthly_cap_kobo` independently
across all active override rows, rather than picking one row wholesale. Document the
composition rule.

---

### #8 — [MED / Likely] Flat-fee threshold tested on `subtotalKobo`, but Paystack assesses its ₦100 flat on the CHARGED amount

**File:** `supabase/functions/initiate-storefront-payment/index.ts:196`.

**What.** `flatKobo = subtotalKobo >= FLAT_FEE_THRESHOLD_KOBO (250000) ? FLAT_FEE_KOBO : 0`.
But Paystack assesses its ₦100 flat fee on the **charged amount** (`customerTotalKobo` sent
to `/transaction/initialize`), not the subtotal. A subtotal just under ₦2,500 whose
`customer_total` crosses ₦2,500 after gross-up omits the flat fee F3-side while Paystack
applies it.

**Artifact (arithmetic):** Subtotal ₦2,490 (249,000 kobo) < threshold → `flatKobo=0`;
`customerTotalKobo = round(249,000/0.985) = 252,792` kobo (₦2,527.92) — above ₦2,500.
`transaction_charge` (`:398` = `storehouseTakeKobo + paystackTakeKobo`, computed with
`flatKobo=0`) is then ~₦100 short of Paystack's real fee → Paystack's main-slice-insufficient
fallback (per support article 2132802, documented in PAYSTACK-DEBUG.md §11.4) deducts the
~₦100 shortfall from the **merchant's** subaccount slice.

**Failure scenario.** Any storefront order with subtotal in the narrow band ~₦2,463–₦2,499
whose grossed-up customer total exceeds ₦2,500: the merchant silently absorbs ~₦100 — far
larger than the documented/accepted 1-kobo sub-₦2,500 edge. Pre-existing, but now on the
live Free path.

**Why Likely not Proven:** depends on Paystack's exact flat-fee threshold semantics on the
charged amount. Needs a live receipt to confirm. See MUST TEST LIVE.

**PROPOSED FIX (UNAPPLIED).** Gate `flatKobo` on `customerTotalKobo` rather than
`subtotalKobo`. Because `customerTotalKobo` depends on `flatKobo`, iterate once: compute
`customerTotal` without flat, check if it crosses the threshold, recompute with flat if so;
or solve the boundary directly. Then re-verify the `fee_math_drift` invariant still holds.

---

### #9 — [LOW / Proven] F2 "stale success" on downgrade: idempotency pre-check returns `reused:true` 200 to a downgraded merchant

**File:** `supabase/functions/create-paystack-subaccount/index.ts:218`.

**What.** With the guard gone, a downgraded-but-previously-onboarded merchant who re-runs
the wizard falls into the idempotency pre-check and gets `{subaccount, reused:true}` HTTP
200; `SubaccountWizard.tsx` advances to its success screen — mechanically the exact scenario
the deleted comment named ("supersedes the idempotency pre-check below so a downgraded
merchant ... doesn't get a stale success").

**Artifact:** guard removed (per `git show c92cdea`); `:206 effectiveTier = tier.tier_id` is
immediately followed by the idempotency pre-check at `:213-240` with no tier check between.
A downgraded merchant passes ownership/frozen/KYC/cooling (downgrade handler touches only
`user_subscriptions`) and reaches `:218`, returning `reused:true`. `SubaccountWizard.tsx:194-213`
treats any non-error 2xx as success → step 5 success screen, ignoring `reused`.

**Failure scenario.** Downgraded merchant re-submits the wizard. Pre-commit: 403, blocked.
Post-commit: 200 `reused:true`, wizard shows their payout account as active. Cosmetic at the
F2 layer (no new subaccount, no Paystack call, no money flow — the harmful part is the F3
path, #1); under the Session 11 decision a Free subaccount is now legitimate.

**PROPOSED FIX (UNAPPLIED).** Tied to #1's policy decision. If downgrade should pause card
access, re-add an entitlement check (ideally the single-source-of-truth helper from #2)
ahead of the idempotency return. If Free is allowed to keep its subaccount, this is intended
— update or delete the stale comment.

---

### #10 — [LOW / Proven] Type lie in `ResolvedTier.fee_config`: BIGINT columns declared `number` but returned as strings

**File:** `supabase/functions/_shared/tier-resolver.ts:33` (interface) + `:88` (`fee_config: feeRow`).

**What.** `cap_kobo`, `monthly_volume_cap_kobo`, `fixed_fee_kobo`,
`large_transaction_review_threshold_kobo` are declared `number` in the interface but are
Postgres `BIGINT` → supabase-js v2 / PostgREST returns them as JSON **strings**. `fee_config: feeRow`
assigns the raw row; only top-level `cap_kobo` is `Number()`-coerced.

**Artifact:** interface `:31-35` declares the four fields as `number`/`number|null`; `:88`
assigns raw `feeRow`; `:87` coerces only top-level `cap_kobo`. Foundation migration
`20260509...:290-301` confirms the four columns are `BIGINT` (and `basis_points` /
`paystack_wholesale_bps` are `INTEGER`, genuinely numbers). No live failure today: every F3
call site wraps the value in `Number()` (`:201`, `:280`, `:289`); `basis_points` at `:200`
is used raw but is INTEGER so safe; `fixed_fee_kobo` is unread.

**Failure scenario.** A future maintainer adds e.g. `if (feeConfig.monthly_volume_cap_kobo > someKobo)`
or `effectiveMonthlyCap - spent`, trusting the `number` type. At runtime the BIGINT is the
string `'50000000'`, so the comparison is lexicographic and arithmetic concatenates — silent
wrong-cap enforcement, with no compiler warning. Newly relevant because the Free path is the
first to exercise the non-null `monthly_volume_cap_kobo` branch in production.

**PROPOSED FIX (UNAPPLIED).** Coerce the BIGINT fields inside `fee_config` in the resolver
(single place), or type them as `string` in the interface and centralize coercion, so the
declared type matches runtime and `tsc` can catch un-coerced uses.

---

### #11 — [LOW / Proven] No reviewer notification + single hard-coded reviewer for stuck orders

**File:** `supabase/functions/initiate-storefront-payment/index.ts:342` + `supabase/functions/approve-transaction-for-fulfillment/index.ts:67`.

**What.** A `requires_review` order inserts `order_items` with `vendor_can_fulfill=false` and
a pending split, returns the Paystack auth URL (customer pays), but nothing alerts the
reviewer (`notify-reviewer` deferred per CLAUDE.md), and the only approver is the single
hard-coded `REVIEWER_USER_ID` (Paul).

**Artifact:** `:342` sets `vendor_can_fulfill: !requiresReview`; `:360` sets
`review_status: requiresReview ? 'pending' : 'not_required'`; the auth URL is returned at
`:620` regardless. `approve-transaction-for-fulfillment/index.ts:67` gates approval to
`REVIEWER_USER_ID`. No notify path exists.

**Failure scenario.** Although `requires_review` is normally unreachable for Free (#5), a
monthly-cap **override** above ₦500K re-arms it (the review threshold at `:289` is NOT
overridable while the monthly cap at `:252` IS — they diverge). Such an order: customer
charged, money settled, `order_items` frozen `vendor_can_fulfill=false`, no email/ping to
Paul, discovery bounded only by how often he runs `list-pending.sh`. Paid customer +
un-fulfillable order + only-Paul-can-unstick, on a tier now open to self-serve merchants.

**PROPOSED FIX (UNAPPLIED).** When fixing #5, ensure the review threshold tracks the effective
(overridable) cap so it can't diverge; and ship the deferred `notify-reviewer` path (or at
minimum a dashboard surface) before Free self-serve merchants can hit a review-frozen order.

---

### #12 — [LOW / Proven] Wasted DB work + stale comment on the F2 reuse path

**File:** `supabase/functions/create-paystack-subaccount/index.ts:196` (resolver call) + `:190-193` (stale comment).

**What.** `resolveActiveTier` (2 queries: `user_subscriptions` + `platform_fee_config`) runs
at `:196` before the idempotency pre-check (`:213`), justified by the step-6.4 comment
("Moved above the idempotency pre-check ... so the tier guard below fires") whose guard this
commit deleted. The tier is unused on the reuse early-return.

**Artifact:** `:190-193` comment references the now-deleted guard; `:196` resolver runs first;
`:218` reuse path returns without ever needing the tier; the only post-removal consumers of
the tier are `percentageCharge` (`:252`, create path only) and two log lines (`:319`, `:480`).

**Failure scenario.** Every retry of an already-onboarded store (client retries,
double-clicks, reloads during onboarding) executes 2 unnecessary Supabase round-trips before
the `reused:true` return.

**PROPOSED FIX (UNAPPLIED).** Move the idempotency `SELECT` (1 query) ahead of
`resolveActiveTier` to skip both queries on the reuse path; delete the obsolete step-6.4
comment.

---

## PART 2 — SECURITY-COMPLETION

This review's diff is functional (guard removal), but two security-adjacent observations,
consistent with `docs/AUDIT.md`:

- **Entitlement scattered across ≥4 layers (no single source of truth)** — see #2. This is
  the same disease class as the prior audit's C2 (auth logic asserted per-site rather than
  centralized). A tier-policy change must touch N disjoint sites that can (and now do)
  disagree. Tenant-isolation is **not** made worse by this diff — but the entitlement
  surface is confirmed as fragmented, reinforcing the prior audit's altitude critique.
- **A live cross-tenant join error surfaced during verification** corroborates prior-audit
  **C1**: `user_subscriptions.user_id` is `uuid` while `stores.user_id` is `text`
  (`operator does not exist: uuid = text`). This is the exact text-vs-uuid scoping-column
  mismatch C1 flagged. No new finding — it confirms C1's evidence is accurate. (Out of
  scope to fix here; tracked under C1 in `docs/AUDIT.md`.)

No new permissive-RLS / public-SECURITY-DEFINER / client-trusted-value findings were
introduced by this diff beyond what `docs/AUDIT.md` already records.

---

## PART 3 — MUST TEST LIVE (static review cannot prove these at runtime)

1. **#1 downgrade behavior** — exercise: onboard a test store on Pro (active subaccount),
   trigger `subscription.disable` (or manually set `user_subscriptions` to free/cancelled
   WITHOUT touching `stores`/`paystack_subaccounts`), then attempt a storefront checkout.
   Confirm whether F3 now returns 200 + a live `authorization_url` (the regression) vs the
   intended block. **This is the functional equivalent of the payment path's live test
   transaction — do it before any real merchant onboards.**
2. **#3 stale velocity counter** — exercise: settle volume to near the daily cap, advance
   the clock past `current_day_resets_at` (or wait to WAT-midnight) WITHOUT a settlement,
   then initiate a new order. Confirm whether F3 wrongly returns `daily_cap_exceeded` against
   yesterday's volume.
3. **#8 Paystack flat-fee boundary** — exercise: a storefront order with subtotal ~₦2,490
   (so customer_total crosses ₦2,500). Compare Paystack's verify-API `fees`/`fees_split` and
   the amount-to-subaccount against F3's `transaction_charge`. Confirm whether the merchant
   slice is short ~₦100. Test card `4084 0840 8408 4081`.
4. **#5 / #11 review path under override** — grant a `vendor_velocity_overrides`
   `monthly_cap` above ₦500K, then run an order ≥₦500K. Confirm it both succeeds (cap
   permits) AND lands `vendor_can_fulfill=false` (review fires) — the stuck-order path.

---

## PART 4 — PERFORMANCE (hard static patterns only)

- **#4 (velocity band never advances)** — tagged STATIC PATTERN; confirmed by 0-cron grep,
  no profiling needed. (Listed as a correctness finding above because it changes the
  effective cap, not just latency.)
- **#12 (2 wasted DB queries on F2 reuse path)** — STATIC PATTERN; confirmed by control-flow
  trace, no profiling needed.
- No N+1 / missing-hot-query-index / unbounded-fetch patterns were introduced by this diff.
  (F3's 4 sequential awaits — store, subaccount, velocity, override — are pre-existing and
  not made worse by the guard removal.)

---

## CRITICAL / HIGH SUMMARY (for sanity-check before acting)

| # | Sev / Conf | File:line | One-liner |
|---|------------|-----------|-----------|
| #1 | **CRITICAL / Likely (latent)** | `paystack-subscription-handler.ts:255` | Downgrade leaves subaccount fully live → downgraded merchant keeps taking card payments; deleted guards were the only backstop. **BLOCKER.** |
| #2 | **HIGH / Proven** | `PaymentSetup.tsx:74` + `20260515_submit_kyc_v1_rpc.sql:64` | Server allows Free, UI + KYC RPC still block it → feature unreachable. **MUST-FIX-BEFORE-ONBOARD.** |
| #3 | **HIGH / Proven** | `initiate-storefront-payment/index.ts:268,280` | Cap pre-check ignores `*_resets_at` → wrongly blocks first orders each day/month. **MUST-FIX-BEFORE-ONBOARD.** |
| #4 | **HIGH / Proven** | `20260509_paystack_subaccounts_foundation.sql:326` | Velocity band never advances (cron never built) → everyone pinned to ₦200K/day forever. **MUST-FIX-BEFORE-ONBOARD.** |

_End of AUDIT-FUNCTIONAL.md. Every fix above is PROPOSED, not applied. Nothing committed._
