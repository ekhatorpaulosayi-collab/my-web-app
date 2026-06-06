# Storehouse — User-Facing Punch-List

> **Generated:** 2026-06-06 (read-only). Reconciled from `docs/AUDIT.md`,
> `docs/AUDIT-FUNCTIONAL.md`, `docs/FINDINGS-LEDGER.md`, `docs/REMEDIATION-STATUS.md`,
> and direct re-check of the live code/DB where noted.
>
> **Scope:** ONLY the things a real **merchant** or their **customer** actually
> *experiences* — broken flows, visible bugs, confusing/blocking UX. Pure
> security-hardening that a user never sees (RLS, public RPCs, webhook crypto, search_path,
> dead-code) stays on the **security track** and is intentionally **excluded** here.
> A few items are dual-track (a security bug with a user-visible symptom) — those are
> included and tagged **(also security)**.
>
> **Ranking axis:** "how obvious / blocking is it to a user" — P0 = blocks the core paid
> flow or is hit on day one; P1 = broken/contradictory flow a user will hit soon;
> P2 = visible wrong-ness or confusing copy; P3 = cosmetic / latent / low-traffic.
>
> **Effort:** S = <½ day · M = ~1–2 days · L = multi-day / needs staging + live test.
>
> **Fix type:** frontend · edge · DB · config · data · out-of-band (dashboard/secret).

---

## ⚠️ PRODUCT DECISION YOU STILL OWE (gates a whole cluster)

**Does Free tier actually ship with card payments?** The edge layer was already opened
(Session 11), but the UI + KYC RPC still block Free. This decision controls items
**#3, #4, #5, #6, #11, #12** below.
- **If Free ships:** that whole cluster is **MUST-FIX-BEFORE-ONBOARD** (the velocity caps
  become Free's only anti-abuse lever and must actually work, and the feature must be
  reachable).
- **If Free is deferred** (the "release valve" — a single Pro merchant doesn't need it):
  mark the cluster **PARKED**. It is flagged **[PARKED-IF-FREE-DEFERRED]** on each item.

A second, smaller decision rides on **#7 (downgrade)**: when a paid merchant lapses, should
card-taking pause, or is a lapsed merchant allowed to keep charging on the Free schedule?
The fix differs by answer; flagged on that item.

---

## P0 — Blocks the core paid flow / hit on day one

### 1. Legitimate upgrade-and-pay must be re-verified live (C3/M6 owed test)
- **What the user sees (risk):** a merchant clicks Upgrade → pays via Paystack → and the
  tier may **fail to activate** if the deployed C3/M6 authz checks reject a *correct*
  payment. The amount check requires `transaction.amount (kobo) >= subscription_tiers.price_* (naira ×100)`;
  if any Paystack **plan amount** is set below the DB price, a real payment is rejected with
  *"Payment amount does not cover the requested subscription tier."* This is the **first
  thing a paying merchant does**, so any mismatch is maximally visible.
- **Where:** `verify-transaction` / `verify-subscription` edge fns; `SubscriptionUpgrade.tsx`
  (`onSuccess` :556, backup poll :657). Deployed 2026-06-06 (commit `2ac7e28`),
  **NOT yet tested live** (per REMEDIATION-STATUS).
- **Fix type:** out-of-band test → possibly **data** (fix Paystack plan amounts to match DB,
  or DB prices to match plans). No code change expected.
- **Effort:** S (run one real test charge per active tier + the `subscriptionCode`-rejection curl).
- **Status:** **MUST-VERIFY before any real merchant pays.** Two tests owed:
  (a) curl `verify-subscription` with `subscriptionCode` → expect `"subscriptionCode path not supported"`;
  (b) a real upgrade still grants the tier (also confirms plan↔price parity).

### 2. Free-tier merchant cannot reach card-payment onboarding at all  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** a Free merchant opens **Settings → Payments** to set up card
  payments (the feature Session 11 advertises) and **both** cards (Bank setup + KYC) render
  **locked** with a "Choose a plan" button to `/upgrade`. There is no path forward. Even a
  deep link dead-ends: `submit_kyc_v1` rejects their KYC with `subscription_required`.
- **Where:** `src/pages/PaymentSetup.tsx:74` (`if (!tier || tier.tier_id === 'free')` →
  `tier_locked`) — **confirmed live**; plus `submit_kyc_v1` RPC (`20260515_submit_kyc_v1_rpc.sql:64,70`).
  The server (F2/F3) already allows Free; only 2 of 4 layers were flipped.
- **Fix type:** **frontend** (PaymentSetup gate) + **DB** (RPC tier check). Best done behind a
  single `isTierEntitledToCardPayments(tier)` / `card_payments_enabled` source of truth so the
  4 layers can't disagree again.
- **Effort:** M.
- **Status:** Functional #2. Gated by the Free decision. If Free ships → blocker.

### 3. Velocity cap wrongly blocks the first order every morning / 1st of month  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees (customer + merchant):** after a busy day near the cap, the **next
  morning's first checkout fails** with "reached today's transaction limit" — even though the
  new day should be fresh. Same on the 1st of each month for the monthly cap. It clears only
  when some *unrelated* settlement happens to reset the stale counter. To a customer it looks
  like the store is broken at checkout; to the merchant, lost first sales daily.
- **Where:** `initiate-storefront-payment/index.ts:268` (daily), `:280` (monthly) — reads
  `current_*_volume_kobo` but never checks `current_*_resets_at`.
- **Fix type:** **edge** (treat counter as 0 when `resets_at` has passed, mirroring the
  settlement RPC's CASE logic).
- **Effort:** S–M.
- **Status:** Functional #3. Gated by Free decision (caps are Free's only anti-abuse lever).

### 4. Velocity band never advances — every merchant pinned to ₦200K/day forever  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** a legitimate merchant doing >₦200K/day in card sales is **silently
  throttled** at checkout (customers see cap-exceeded) and **never graduates** to the higher
  bands the design promises (₦500K days 8–30, unlimited day 31+). Only a manual Paul-run
  override lifts it. Feels like an arbitrary, permanent ceiling with no explanation.
- **Where:** promised nightly cron in `20260509_paystack_subaccounts_foundation.sql:326`
  **was never built**; nothing advances `days_since_approval` / `daily_cap_kobo`.
- **Fix type:** **DB** (build the pg_cron job) **or** **edge** (re-derive the band at read time
  from approval date — removes the cron dependency).
- **Effort:** M.
- **Status:** Functional #4. Gated by Free decision.

---

## P1 — Broken / contradictory flow a user will hit

### 5. Settings page shows EMPTY business name though the data exists
- **What the user sees:** the merchant opens **Settings / business profile**, and the
  **Business Name field is blank** even though they set it (the dashboard displays it
  correctly, and the DB has it — e.g. `osayi1`). Looks like their data was lost; a merchant
  may re-enter or panic. ~weeks old, pre-existing.
- **Where:** Settings form not populating the saved value into the input on mount (frontend
  state/init bug, NOT RLS — RLS returns rows, never blank fields). Live counterpart of the
  `BusinessSettings.tsx` / `StoreSettings.tsx` family (note the many `.backup-business-name-fix`
  files — this has been chased before).
- **Fix type:** **frontend**.
- **Effort:** S–M (find why the controlled input doesn't seed from the fetched value on mount).
- **Status:** Confirmed live (REMEDIATION-STATUS C1 UPDATE 2). Not a security item.

### 6. Cashier can edit & delete products despite role restrictions (write-RBAC is cosmetic)
- **What the user sees:** a merchant adds a **Cashier** staff member expecting them to only
  record sales — but the cashier can **edit prices/quantities/names and delete products**.
  The role labels promise "Cashier: NO" for edit/delete; the app lets them anyway. A real
  trust/shrinkage problem for a shop owner with staff.
- **Where:** `src/contexts/StaffContext.tsx` — `canEditProducts`, `canDeleteProducts`,
  `canAddProducts` all `return true` ("simplified for better UX") — **confirmed live**.
- **Fix type:** **frontend** to honor the role for UX; **DB/RLS** if you want it actually
  enforced server-side (a determined staffer can hit the API directly). For a *user-facing*
  punch-list, the frontend gating is the visible fix.
- **Effort:** M (frontend) / L (if server-enforced).
- **Status:** Audit L4 (the design smell). **(also security)** — but the user-visible part is
  the unexpected edit/delete capability.

### 7. Lapsed/downgraded merchant keeps taking card payments (no re-gate on downgrade)
- **What the user sees:** depends on intent. After a subscription lapses, the merchant's
  storefront **keeps charging customers' cards** as if nothing changed (no "re-upgrade to
  receive payments" block that used to exist). Whether that's a *bug the merchant notices* or
  *silent wrong behavior* depends on your policy call. Latent today (only Paul's store has a
  live subaccount) — **arms the instant a real merchant onboards then lapses.**
- **Where:** `_shared/paystack-subscription-handler.ts:255` (`handleSubscriptionDisable`
  touches only `user_subscriptions`, never pauses the subaccount); F3 path now unguarded
  (`initiate-storefront-payment/index.ts:158`).
- **Fix type:** **edge** (enforce at the `subscription.disable` state-transition: pause the
  subaccount, OR explicitly bless Free-keeps-charging and document it).
- **Effort:** M.
- **Status:** Functional #1 — onboarding blocker per the docs. **Decision owed:** pause on
  downgrade vs. allow Free to keep charging.

### 8. Storefront checkout silently returns 503 (feature flag off)
- **What the user sees:** a customer clicks Pay-with-Card on a storefront and the request
  **fails** (503 `feature_disabled`) if `ENABLE_PAYSTACK_SUBACCOUNTS` isn't `true` in prod, or
  the per-store flag is off. Looks like the store can't take payment.
- **Where:** F3 top gate; gated by the prod edge secret + `stores.paystack_subaccounts_enabled`.
- **Fix type:** **out-of-band/config** (confirm the secret value before relying on card
  payments) — and a **frontend** nicety: surface a clear message instead of a raw failure when
  card payments aren't enabled for that store.
- **Effort:** S.
- **Status:** C4 residual / out-of-band check #2. Verify before onboarding.

---

## P2 — Visible wrong-ness / confusing copy

### 9. Monthly cap message implies "goods sold" but meters customer-charged total  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** a Free merchant pricing **₦500K of goods** is told they "reached
  this month's transaction limit" at roughly **₦487–492K of actual product value** (the ~1.5%
  gross-up + ₦100/txn flats eat into the ₦500K of customer-charges). The number doesn't match
  what they think they sold — confusing and feels like being shorted.
- **Where:** `initiate-storefront-payment/index.ts:268,280` compare against `customerTotalKobo`,
  not `subtotalKobo`/`vendorNetKobo`; settlement counter matches (consistent, not a crash).
- **Fix type:** **edge + DB** (decide the cap's basis; if goods-sold, change both pre-check and
  settlement counter in one deploy) **or** just fix the **messaging**.
- **Effort:** S (messaging only) / M (change the basis consistently).
- **Status:** Functional #6. Gated by Free decision.

### 10. Merchant silently absorbs ~₦100 on a narrow price band (flat-fee boundary)  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** for storefront orders with subtotal ~₦2,463–₦2,499 (customer total
  crosses ₦2,500 after gross-up), the **merchant's payout is ~₦100 short** of expected. Not a
  visible error, but a recurring small loss a careful merchant could notice in reconciliation.
- **Where:** `initiate-storefront-payment/index.ts:196` — `flatKobo` gated on `subtotalKobo`,
  but Paystack assesses the ₦100 flat on the charged amount.
- **Fix type:** **edge** (gate `flatKobo` on `customerTotalKobo`; iterate once).
- **Effort:** S–M. **Needs a live receipt to confirm (Likely, not Proven).**
- **Status:** Functional #8 / MUST TEST LIVE #3. Gated by Free decision (now on the live path).

### 11. Review-frozen order with no notification — paid customer, un-fulfillable order  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** if a high-value order trips review (reachable via a velocity
  override above ₦500K), the **customer is charged and money settles**, but the order is frozen
  `vendor_can_fulfill=false` and **nobody is alerted** — only Paul can unstick it, and only
  when he manually runs `list-pending.sh`. Customer paid, merchant can't fulfill, silent.
- **Where:** `initiate-storefront-payment/index.ts:342,360`; approval gated to single
  `REVIEWER_USER_ID` (`approve-transaction-for-fulfillment/index.ts:67`); no notify path
  (deferred per CLAUDE.md).
- **Fix type:** **edge** (ship the deferred `notify-reviewer`, or a dashboard surface) + tie the
  review threshold to the effective cap so it can't diverge.
- **Effort:** M.
- **Status:** Functional #11 (+ #5 review-threshold==cap). Gated by Free decision.

### 12. Velocity override surprise — a merchant Paul "raised" silently drops back to ₦500K  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** a merchant Paul believes has a raised monthly ceiling gets
  **cap-exceeded at checkout** the moment a newer single-dimension override is issued (the
  newest override shadows the older broader one). From the merchant's seat: "you told me my
  limit was raised, but checkout still blocks." Low frequency (needs two overlapping overrides).
- **Where:** `initiate-storefront-payment/index.ts:242-252` (takes one most-recent override row
  wholesale instead of composing per-dimension).
- **Fix type:** **edge** (compose most-permissive value per dimension across active overrides).
- **Effort:** S–M.
- **Status:** Functional #7. Gated by Free decision; low traffic.

---

## P3 — Cosmetic / latent / low-traffic

### 13. Downgraded merchant sees a "stale success" in the subaccount wizard  **[PARKED-IF-FREE-DEFERRED]**
- **What the user sees:** a downgraded-but-previously-onboarded merchant re-runs the bank
  wizard and gets a **success screen** (`reused:true` 200) showing their payout account as
  active. Cosmetic at this layer (no new subaccount, no money flow — the harmful part is #7).
  Under "Free keeps its subaccount" this is *intended* and just needs the stale comment removed.
- **Where:** `create-paystack-subaccount/index.ts:218`; `SubaccountWizard.tsx:194-213` treats any
  2xx as success.
- **Fix type:** **edge** (tie to #7's policy) / docs.
- **Effort:** S.
- **Status:** Functional #9. Gated by #7 + Free decision.

### 14. Legacy "own-key" checkout marks an order paid without server verification
- **What the user sees:** on the legacy own-Paystack-key path, an order can be marked **paid
  client-side** (`Math.random` ref, no server verify) — a customer could see "paid" without a
  confirmed settlement, or a merchant could see inconsistent paid state. Only affects merchants
  on the old own-key flow.
- **Where:** `Cart.tsx:247`; `onlineStoreSales.ts:88`. (Audit L7.)
- **Fix type:** **frontend** (migrate own-key merchants to verify-on-server, or deprecate path).
- **Effort:** M. **(also security)**
- **Status:** Low; depends how many own-key merchants exist.

### 15. Promo/discount silently dropped on the subaccount card path
- **What the user sees:** if a merchant applies a promo/discount and the customer pays via the
  split card path, the **discount is ignored** (`discount:0` hardcoded) — customer charged full
  price, promo doesn't apply. Visible if promos are actually used on storefronts.
- **Where:** `Cart.tsx:517-523,625`. (Audit L5.)
- **Fix type:** **frontend** (disable promo UI on that path, or thread the discount through F3
  server-validated).
- **Effort:** S–M.
- **Status:** Low (only if promos used). **(also a subtle money-correctness issue)**

### 16. Subaccount fee breakdown not shown before the customer commits
- **What the user sees:** the customer doesn't see the fee/total breakdown until *after* the
  Pay click fires the Paystack popup (`subaccountBreakdown` is set only post-F3-call). Minor
  transparency gap at checkout.
- **Where:** `Cart.tsx:587`. (Audit L6.)
- **Fix type:** **frontend** (pre-fetch a quote / compute closed-form for display before Pay).
- **Effort:** S.
- **Status:** Low / polish.

### 17. Public invoice link exposes full customer PII on a guessable URL
- **What the user sees (privacy):** anyone with an invoice UUID can view full customer PII via
  `PublicInvoiceView` (no share-token gate); viewing also writes `viewed_at`. A customer's
  details are more exposed than they'd expect from "share this invoice."
- **Where:** `PublicInvoiceView.tsx:42-49,61-68`. (Audit L8.)
- **Fix type:** **frontend + DB** (add a `public_token`-gated query, mirroring the contribution
  share-code pattern).
- **Effort:** M. **(also security)**
- **Status:** Low-frequency but a real user-data exposure; include for the privacy-visible angle.

---

## ✅ ALREADY DONE (verified — listed so they're not re-opened)

- **Cashier `canViewReports` crash** — logging in as Cashier no longer throws
  `ReferenceError: canViewReports is not defined` / the reports view is hidden from cashiers.
  Fixed (`edf9497`), build green. (Distinct from #6 above, which is the *write*-RBAC still
  being cosmetic.)
- **Public `/spike/paystack-v2` route** — deleted; route now 404s / routes to login (`ec465b8`).
  Not user-facing in the punch-list sense, noted for completeness.

---

## RANKED SUMMARY (start at the top)

| # | Item | User-visible symptom | Where | Fix type | Effort | Gate |
|---|------|----------------------|-------|----------|-------:|------|
| 1 | C3/M6 live test | Upgrade may not activate a correct payment | edge / Paystack | out-of-band → data | S | **must-verify now** |
| 2 | Free unreachable | Card-setup cards locked, no path forward | `PaymentSetup.tsx:74` + RPC | frontend + DB | M | Free decision |
| 3 | Stale velocity counter | First order each day/month wrongly blocked | F3 `:268,280` | edge | S–M | Free decision |
| 4 | Band never advances | Pinned at ₦200K/day forever | migration `:326` | DB or edge | M | Free decision |
| 5 | Empty business name | Settings field blank though data exists | Settings form (frontend) | frontend | S–M | — |
| 6 | Cashier can edit/delete | Staff edits prices/deletes products | `StaffContext.tsx` | frontend (+RLS) | M | — |
| 7 | Downgrade re-gate | Lapsed merchant keeps charging cards | sub-handler `:255` | edge | M | decision owed |
| 8 | Checkout 503 | Pay fails when flag off | F3 gate / secret | config + frontend msg | S | out-of-band |
| 9 | Cap message basis | "Limit reached" at ~₦487K of goods | F3 `:268,280` | edge+DB / copy | S–M | Free decision |
| 10 | Flat-fee boundary | Merchant ~₦100 short in a price band | F3 `:196` | edge | S–M | Free decision (live test) |
| 11 | Review no-notify | Paid customer, frozen un-fulfillable order | F3 `:342` + reviewer | edge | M | Free decision |
| 12 | Override shadowing | "Raised" limit silently reverts | F3 `:242-252` | edge | S–M | Free decision |
| 13 | Stale wizard success | Downgraded merchant sees "active" payout | F2 `:218` | edge/docs | S | #7 + Free |
| 14 | Own-key paid-no-verify | Order "paid" without server confirm | `Cart.tsx:247` | frontend | M | — |
| 15 | Promo dropped | Discount ignored on card path | `Cart.tsx:517` | frontend | S–M | — |
| 16 | Fee shown late | Breakdown only after Pay click | `Cart.tsx:587` | frontend | S | — |
| 17 | Invoice PII link | Full PII on guessable URL | `PublicInvoiceView.tsx` | frontend + DB | M | — |

**Suggested start:** #1 (verify the paid flow you already deployed) → decide Free → then #2/#3/#4
if Free ships, plus #7 regardless → #5/#6 (pure UX, no decision gate) → P2/P3 as polish.

_Read-only. This file is the only write. Not committed._
