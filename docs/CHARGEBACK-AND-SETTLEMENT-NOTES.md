# Chargeback handling and settlement delay — strategy note

**Date written:** 12 May 2026
**Status:** Not Session 1 work. Reference for Session 5+ and pre-public-launch planning.
**Context:** Written during Session 1 edge function review. Triggered by a question about whether 48-hour settlement delay is sufficient.

---

## The short version

Storehouse needs two things before opening signups to strangers (beyond the church network):

1. A webhook handler for `charge.dispute.create` (and related dispute events)
2. A tiered settlement delay configured on Paystack subaccounts

Together they protect Storehouse from sell-and-disappear fraud. Neither is built today.

---

## Why this matters

### The fraud pattern we are protecting against

A bad actor signs up to Storehouse with a clean-looking identity, passes manual KYC, waits 24 hours through the cooling period, then:

- Day 1: lists a product at ₦180,000 (just under ₦200K daily cap)
- Day 1: "customer" (themselves with a stolen card, or a cousin) buys it
- Day 2 morning: settlement lands in vendor's bank, vendor withdraws immediately
- Day 2 evening: vendor deletes Storehouse store, stops responding
- 2–6 weeks later: real cardholder sees the charge, calls bank, gets a chargeback
- Storehouse eats ₦180,000 plus chargeback fees

Without both pieces (handler + delay), Storehouse is the one who absorbs this loss, not the vendor.

### Why each piece on its own is not enough

- **Chargeback handler without settlement delay:** the webhook fires, but the vendor already withdrew the money. You know about the loss but cannot recover it. Storehouse pays from its own pocket.
- **Settlement delay without chargeback handler:** the money is sitting in the vendor's subaccount, but nothing in the system reacts when a dispute arrives. You'd only find out via manual Paystack dashboard checks.

You need both. Each fixes a different leg of the same fraud pattern.

---

## The chargeback piece

### What needs to be built

Add a handler in `paystack-subaccount-webhook/index.ts` for these Paystack event types:

- `charge.dispute.create` — a chargeback has been opened
- `charge.dispute.remind` — Paystack reminding us to respond
- `charge.dispute.resolve` — chargeback closed (won, lost, or merchant_accepted)

### What the handler should do (minimum viable)

1. Look up the original transaction by reference
2. Write a row to a new `disputes` table (needs a migration)
3. Flag the affected vendor's store: `stores.has_active_dispute = true`
4. If settlement delay is in place: freeze that vendor's pending settlement
5. Notify Paul via WhatsApp (using the existing WhatsApp notification path)
6. Notify the vendor that a dispute has been raised

What we do NOT need at first launch: automated evidence upload, dispute response UI, win/loss analytics. Manual response via Paystack dashboard is fine for the first 50 disputes.

### New tables needed

```sql
-- Sketch only, do not implement yet
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_dispute_id TEXT NOT NULL UNIQUE,
  paystack_reference TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  amount_kobo BIGINT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'awaiting_evidence', 'under_review', 'won', 'lost', 'merchant_accepted')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Plus an `ALTER TABLE stores ADD COLUMN has_active_dispute BOOLEAN DEFAULT FALSE`.

---

## The settlement delay piece

### Why "48 hours" is too short

Chargebacks in Nigeria typically arrive 7–45 days after the transaction, clustering in the first 2 weeks. A 48-hour delay catches almost none of them. The card networks give cardholders up to 120 days to dispute.

### Why 7 days is the right starting point

Industry standard for new merchants on Stripe, Adyen, and other platforms is 7–14 days for new accounts. It catches the majority of chargebacks. It is also short enough that Nigerian SME vendors will accept it if communicated clearly upfront.

### The tiered policy (recommended)

| Tier | Trigger | Settlement delay |
|---|---|---|
| New vendor | Days 1–30, or first ₦2M lifetime volume | **T+7 days** |
| Established | Day 31+ AND zero disputes AND ₦2M+ volume | **T+2 days** |
| Trusted | Day 90+ AND zero disputes AND ₦10M+ volume | **T+1 day (same as Paystack default)** |

### How this is implemented (regulatorily clean)

Important: **Storehouse does NOT hold the funds.** Holding customer funds in Nigeria requires an MMO license (₦4 billion capital). Storehouse cannot do that and should not try.

Instead, configure Paystack subaccount settlement schedules via Paystack's API. The money sits in **Paystack's** licensed system, in the vendor's own subaccount, with a delayed release date set per-subaccount.

This means:

- Paystack (licensed) holds the funds, not Storehouse
- The money legally belongs to the vendor's subaccount
- Storehouse is just configuring the release schedule
- When a chargeback hits, Paystack debits the subaccount directly
- No CBN exposure for Storehouse

### What the system needs to do

1. On vendor onboarding, set their Paystack subaccount to T+7 settlement schedule
2. A daily cron job evaluates each vendor against the tier rules
3. When a vendor crosses a threshold (30 days clean + ₦2M volume → T+2), call Paystack API to update their subaccount's settlement schedule
4. Show vendors their current tier and "days until faster payouts" in the Storehouse dashboard — this turns the friction into a retention feature

### Optional: instant settlement with a fee

Following Paystack's own pattern (Payout on Demand, 1% fee), offer vendors the option to withdraw early at a 1% fee. This converts the friction into either:

- Revenue (vendors who pay the 1%)
- Retention (vendors who wait for the free tier upgrade)

---

## Terms of Service — the non-technical piece

Whichever technical approach we ship, the Storehouse Terms of Service must contain explicit chargeback liability language. Copy the pattern from Bumpa's Merchant Terms:

> The Merchant acknowledges and agrees that they are solely responsible for all chargebacks, reversals, refunds, or other similar payment disputes initiated by customers or their banks in respect of transactions processed through their Storehouse Account. In the event of a chargeback, the disputed amount may be deducted from the Merchant's Paystack subaccount balance or pending settlements.

This is non-negotiable. Without it, every chargeback is a legal grey area where the vendor can claim Storehouse should have caught the fraud. With it, the contract is clear and Paystack can debit the subaccount with documented merchant consent.

---

## Sequencing

### Hard threshold: before opening signups beyond the church network

Both pieces must be live before strangers can self-serve onboard. The church network is a soft launch where vendors are personally known to Paul; fraud risk is low. Strangers are a different threat model.

Rough merchant count threshold: **before passing 20 paying merchants** or before any paid acquisition spend.

### Order of work

1. **Now (still Session 1):** add this note to the repo. Done.
2. **Session 5 or later:** build the dispute webhook handler and the `disputes` table.
3. **Session 5 or later:** build the Paystack settlement schedule integration and the tiered cron.
4. **Before public launch:** Terms of Service with chargeback clause. Get a Nigerian fintech lawyer to review.
5. **Before public launch:** test end-to-end with a Paystack test dispute event.

### Things that are NOT needed in Session 1

- This entire feature set
- The MMO license question (deferred to 2027 if Storehouse ever wants a true wallet model with a licensed partner)
- Device fingerprinting, behavioural analytics, BIN country checks — Storehouse leans on Paystack for these initially

---

## Open questions to revisit later

- Does Paystack's API allow per-subaccount settlement schedule overrides, or only at the main account level? Need to confirm before Session 5 implementation.
- What does "30 days clean" actually mean — calendar days from KYC approval, or 30 days of any transaction activity? Decide before building the tier cron.
- Should the dispute notification go to vendor's WhatsApp immediately, or only after Paul acknowledges it? UX question, not technical.
- Do we add a "vendor reserves" concept (a separate held balance per vendor we can deduct from on chargebacks) on top of settlement delay, or is settlement delay alone enough? Probably enough at first; reserves are MMO-territory.

---

## References

- Bumpa Merchant Terms of Service, section 5A and 12.4 (chargeback liability clauses)
- CBN License Categorization Circular, 9 December 2020 (PSSP cannot hold funds; MMO requires ₦2B paid-up + ₦2B escrow)
- Paystack Subaccount Verification documentation (first-payout manual verification is already a built-in safety brake)
- Paystack Payout on Demand documentation (the 1% fee model for early settlement)
- Tomiwa @ Paystack support email, 7 May 2026 (confirmed Transfers can be used to hold funds before paying vendors)
