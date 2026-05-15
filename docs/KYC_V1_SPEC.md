# Storehouse KYC v1 Specification

**Status:** Approved spec, ready to implement
**Date written:** 14 May 2026
**Target session:** Session 4 (next session after Session 3 wrap)
**Branch:** to be created `feat/kyc-wizard-v1` off `feat/paystack-subaccounts`
**Estimated build:** 16-22 hours, ~2 focused sessions

---

## 1. Context and goals

### Why this spec exists

Card 2 ("Verify your identity") on `/settings/payments` is currently a "Coming soon" placeholder. This spec defines the wizard that fills it in.

KYC is the **single hardest blocker** between Storehouse and onboarding non-Paul merchants. Without it:
- F2 (`create-paystack-subaccount`) refuses to run for merchants without `kyc_status = 'approved'`
- F3 (`initiate-storefront-payment`) refuses to process payments for the same reason
- The `BYPASS_KYC_FOR_SMOKE` env var is the only thing letting Paul test today

### What this wizard does

A paying-tier merchant who has completed bank setup (Card 1) clicks "Verify your identity" on Card 2. The wizard:

1. Collects identity information (BVN, NIN, phone, business category)
2. Collects optional business information (CAC RC number, business address)
3. Collects a photo: selfie of the merchant holding their ID card
4. Stores everything in `vendor_kyc` table with `status = 'pending'`
5. Notifies the reviewer (Paul) via email
6. Shows the merchant a "submitted, awaiting review" status

The reviewer (Paul for first 5-10 merchants, employees after that) manually reviews submissions and approves or rejects. Approval triggers `stores.kyc_status = 'approved'` and Paul manually verifies the subaccount in Paystack's dashboard to release the held first-payout.

### Who can access this wizard

**Only merchants on a paid tier (Starter ₦5K/mo or Pro ₦10K/mo).** Free-tier merchants see Card 2 in a "tier_locked" state with upgrade CTA. See section 2.7 for the rationale.

---

## 2. Architectural decisions (locked)

### 2.1 Model A (Storehouse-owned subaccount, hide Paystack from merchants)

Storehouse owns the parent Paystack integration. Merchants are subaccounts under it. Merchants never log into Paystack directly. All Paystack-related concerns are abstracted away in Storehouse UI.

**Paystack visibility:** Use Paystack as a *trust badge* in copy ("Storehouse uses Paystack to process your payments securely"), but do not require merchants to manage a Paystack account.

### 2.2 Settlement delay via Paystack's built-in verification mechanism

Paystack auto-holds the first payout on every new or updated subaccount, indefinitely, until the platform owner (Paul) manually verifies the subaccount in Paystack's dashboard.

**Critical:** Storehouse does NOT custody the held funds. Paystack holds them. Storehouse only signals approval. This preserves Storehouse's legal position as "platform built on a CBN-licensed PSP" rather than a payment service provider itself.

### 2.3 Manual photo review for v1

No Smile Identity. No automated face match. No liveness detection. Manual review by Paul for first 5-10 merchants, then handed off to employees in Phase 2.

Future path:
- **v1.5:** Claude API analyzes photos to assist Paul/reviewer (~₦20-40 per check)
- **v2:** Smile Identity full integration with NIBSS/NIMC verification

### 2.4 Format-only field validation at submission

No live BVN/NIN verification API calls. No SMS OTP for phone verification. Pure regex/format checks at submission. Substantive verification happens in manual review.

SMS phone verification deferred to v1.5 (alongside Claude-assisted review).

### 2.5 Reviewer tooling phased

- **Phase 1 (Paul-only, ships with KYC v1):** Bash scripts in `scripts/kyc/` with SQL helpers
- **Phase 2 (multi-reviewer, ships before merchant #10):** Web page at `/admin/kyc-reviews` with role-based auth, Paystack verify-subaccount API automation, audit trail, training docs

This spec covers Phase 1 implementation.

### 2.6 Velocity overrides infrastructure included

Per-store velocity limit overrides (`vendor_velocity_overrides` table) included in v1 build. F3 checks overrides before falling back to tier defaults. Merchant-facing visibility of limits on `/settings/payments`. Manual override grants via bash script for Phase 1. Self-serve "request increase" UI deferred to Phase 2.

### 2.7 Paystack gated to paid tiers only (Option 1b)

**Free-tier merchants cannot complete KYC or access Paystack subaccount features.** Card 1 (bank setup) and Card 2 (KYC) both require an active Starter or Pro subscription.

**Rationale:**
- Reduces KYC support load significantly
- Filters fraud — paying merchants have skin in the game
- Validates intent — willingness to pay ₦5K/month signals real business commitment
- Matches Nigerian SMB market direction (Bumpa discontinued free tier in Nov 2025)
- Storehouse still useful to free users: inventory, AI chat, contributions, customer messaging, multilingual storefront — just not online payment receiving

**Free tier still gets:**
- Inventory/product management
- AI chat with tier-appropriate limits
- Contributions tracking (Ajo/Esusu)
- Customer messaging
- Multilingual storefront

**Free tier does NOT get:**
- Paystack subaccount creation (Card 1 locked)
- KYC verification (Card 2 locked)
- Online payment receiving via F3

**Past_due grace period:** A paying merchant whose subscription enters `past_due` keeps Paystack access for 7 days after `current_period_end`. After 7 days, access is revoked until they update payment.

---

## 3. Database schema changes

### 3.1 `vendor_kyc` table extensions

```sql
-- Identity fields
ALTER TABLE vendor_kyc ADD COLUMN bvn text;
ALTER TABLE vendor_kyc ADD COLUMN nin text;
ALTER TABLE vendor_kyc ADD COLUMN phone_number text NOT NULL;
ALTER TABLE vendor_kyc ADD COLUMN business_category text NOT NULL;

-- Optional business fields
ALTER TABLE vendor_kyc ADD COLUMN cac_rc_number text;
ALTER TABLE vendor_kyc ADD COLUMN business_address text;

-- Photo storage
ALTER TABLE vendor_kyc ADD COLUMN id_photo_path text;

-- Submission metadata
ALTER TABLE vendor_kyc ADD COLUMN submission_count int NOT NULL DEFAULT 1;
ALTER TABLE vendor_kyc ADD COLUMN confirmation_accepted_at timestamptz NOT NULL;

-- Review fields
ALTER TABLE vendor_kyc ADD COLUMN reviewer_notes_internal text;
ALTER TABLE vendor_kyc ADD COLUMN reviewer_notes_merchant text;
ALTER TABLE vendor_kyc ADD COLUMN rejection_category text 
  CHECK (rejection_category IN (
    'photo_unclear',
    'photo_doesnt_show_id',
    'info_doesnt_match',
    'document_not_accepted',
    'more_info_needed',
    'unable_to_verify'
  ));

-- Audit
ALTER TABLE vendor_kyc ADD COLUMN reviewed_by_user_id uuid REFERENCES auth.users(id);
ALTER TABLE vendor_kyc ADD COLUMN reviewed_at timestamptz;
```

**Encryption note:** BVN and NIN are sensitive PII. Check if existing `vendor_kyc_key` vault secret is used for encryption at rest. If not, set up encryption before storing.

### 3.2 `vendor_velocity_overrides` table (new)

```sql
CREATE TABLE vendor_velocity_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  daily_cap_kobo bigint,
  monthly_cap_kobo bigint,
  single_txn_cap_kobo bigint,
  expires_at timestamptz,
  reason text NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT at_least_one_override CHECK (
    daily_cap_kobo IS NOT NULL OR 
    monthly_cap_kobo IS NOT NULL OR 
    single_txn_cap_kobo IS NOT NULL
  )
);

CREATE INDEX idx_velocity_overrides_store ON vendor_velocity_overrides (store_id, expires_at);
CREATE INDEX idx_velocity_overrides_active ON vendor_velocity_overrides (store_id) 
  WHERE expires_at IS NULL OR expires_at > now();

ALTER TABLE vendor_velocity_overrides ENABLE ROW LEVEL SECURITY;
```

### 3.3 Supabase Storage bucket for KYC photos

New bucket: `kyc-photos`

- No public access
- Authenticated users can upload to `{user_id}/{kyc_submission_id}/photo.jpg`
- Authenticated users read own paths via signed URLs only
- Service role has full read access
- Max size: 5MB
- Accepted: `image/jpeg`, `image/png`

### 3.4 Paul super-admin setup

```sql
INSERT INTO user_subscriptions (user_id, tier_id, status, current_period_end)
VALUES (
  'dffba89b-869d-422a-a542-2e2494850b44',
  'pro',
  'active',
  '2099-01-01'
)
ON CONFLICT (user_id) DO UPDATE
SET tier_id = 'pro', status = 'active', current_period_end = '2099-01-01';
```

Cleaner than a `super_admin` flag.

---

## 4. RPCs

### 4.1 `submit_kyc_v1`

```sql
CREATE OR REPLACE FUNCTION submit_kyc_v1(
  p_store_id uuid,
  p_bvn text,
  p_nin text,
  p_phone_number text,
  p_business_category text,
  p_id_photo_path text,
  p_cac_rc_number text DEFAULT NULL,
  p_business_address text DEFAULT NULL,
  p_confirmation_accepted boolean DEFAULT false
) RETURNS json
```

**Behaviour:**
- Validates `auth.uid()` owns the store
- **Validates active paid tier (with 7-day past_due grace)**
- Validates `p_confirmation_accepted = true`
- Format validation per rules below
- Checks for existing pending submission — error `already_pending` if exists
- Checks submission count — error `max_resubmissions_exceeded` if 5+ rejections
- Inserts `vendor_kyc` row with `status='pending'`, increments `submission_count`
- Triggers email notification
- Returns: `{ kyc_id, status: 'pending', submission_count }`

**Tier check (top of function):**

```sql
DECLARE
  v_has_paid_tier boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = auth.uid()
      AND us.tier_id IN ('starter', 'pro')
      AND us.status IN ('active', 'non_renewing', 'trialing', 'past_due')
      AND (us.current_period_end IS NULL OR us.current_period_end > now() - INTERVAL '7 days')
  ) INTO v_has_paid_tier;
  
  IF NOT v_has_paid_tier THEN
    RAISE EXCEPTION 'subscription_required' USING 
      DETAIL = 'Storehouse online payments require a paid plan.',
      HINT = '/settings/billing';
  END IF;
END;
```

**Format validation:**
```
BVN: ^2\d{10}$
NIN: ^\d{11}$, must differ from BVN
Phone: ^\+234[789]\d{9}$
business_category: in ['retail', 'food', 'provision', 'services', 'online', 'other']
```

### 4.2 `approve_kyc_review`

```sql
CREATE OR REPLACE FUNCTION approve_kyc_review(
  p_kyc_id uuid,
  p_reviewer_notes_internal text DEFAULT NULL
) RETURNS json
```

- Validates caller is service-role / reviewer role
- Loads `vendor_kyc`, validates `status='pending'`
- Updates `vendor_kyc`: `status='approved'`, `reviewed_at`, `reviewed_by_user_id`, `reviewer_notes_internal`
- Updates `stores.kyc_status='approved'`, `stores.kyc_approved_at=now()`
- **DOES NOT** verify Paystack subaccount automatically (Phase 1 = manual)
- Returns: `{ kyc_id, status: 'approved', stores_kyc_status: 'approved' }`

### 4.3 `reject_kyc_review`

```sql
CREATE OR REPLACE FUNCTION reject_kyc_review(
  p_kyc_id uuid,
  p_rejection_category text,
  p_reviewer_notes_internal text DEFAULT NULL
) RETURNS json
```

- Validates caller is service-role / reviewer role
- Validates category in allowed enum
- Maps category to merchant-facing message (section 7.3)
- Updates `vendor_kyc`: `status='rejected'`, `rejection_category`, `reviewer_notes_internal`, `reviewer_notes_merchant`
- Hard rejection if `category='unable_to_verify'`
- Returns: `{ kyc_id, status: 'rejected', rejection_category, can_resubmit: boolean }`

### 4.4 `grant_velocity_override`

```sql
CREATE OR REPLACE FUNCTION grant_velocity_override(
  p_store_id uuid,
  p_daily_cap_kobo bigint DEFAULT NULL,
  p_monthly_cap_kobo bigint DEFAULT NULL,
  p_single_txn_cap_kobo bigint DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS json
```

- Service-role only
- Inserts row into `vendor_velocity_overrides`
- Returns: `{ override_id, expires_at }`

---

## 5. Edge function changes

### 5.1 F2 — tier guard (defense-in-depth)

```typescript
const resolvedTier = await resolveActiveTier(supabase, user_id);

if (resolvedTier.tier_id === 'free') {
  await logPaystackInteraction(supabase, {
    correlation_id,
    function_name: 'create-paystack-subaccount',
    direction: 'outbound',
    paystack_endpoint: 'N/A',
    error_tag: 'tier_not_paid',
    store_id,
    user_id,
  });
  return responses.error(403, 'subscription_required', 
    'Setting up online payments requires a paid plan.');
}
```

### 5.2 F3 — tier guard + velocity override lookup

Same tier guard pattern as F2.

Plus velocity override lookup before tier defaults:

```typescript
const override = await supabase
  .from('vendor_velocity_overrides')
  .select('*')
  .eq('store_id', storeId)
  .or('expires_at.is.null,expires_at.gt.now()')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const effectiveDailyCap = override?.data?.daily_cap_kobo ?? tierDefaults.daily_cap_kobo;
const effectiveMonthlyCap = override?.data?.monthly_cap_kobo ?? tierDefaults.monthly_cap_kobo;
const effectiveSingleTxnCap = override?.data?.single_txn_cap_kobo ?? tierDefaults.single_txn_cap_kobo;
```

Log override result via `paystack-logger`.

### 5.3 `notify-reviewer-new-kyc` edge function

Triggered on `vendor_kyc` insert via DB trigger.

**v1:** Resend or similar email API, hardcoded reviewer email.

**Email content:**
- Subject: "New KYC submission — {business name}"
- Body: link / bash command instructions
- Submitted_at, store_id, submission_count

---

## 6. Frontend changes

### 6.1 Card 1 tier_locked state (already-shipped Card 1 needs update)

Add 5th state to `SubaccountStatus` union:

```typescript
type SubaccountStatus =
  | { kind: 'loading' }
  | { kind: 'tier_locked' }              // NEW
  | { kind: 'not_started' }
  | { kind: 'pending'; ... }
  | { kind: 'verified'; ... };
```

UI:
```
🔒 Set up bank account
Online payments are available on paid plans.
Upgrade to Starter (₦5K/month) to receive payments through Storehouse.
[ Upgrade plan → ]
```

### 6.2 Wizard entry points

- `/settings/payments` Card 2 button — enabled only if Card 1 verified AND tier paid
- Direct URL `/settings/payments/identity-verification` — redirects free-tier users to `/settings/billing` with toast

### 6.3 Wizard structure (5 steps)

**Step 1 — Why we need this**
- "We need to verify your identity to comply with Nigerian financial regulations"
- "This is required before you can start receiving payments"
- "Your information is encrypted and only used for verification"
- Trust badge: "Storehouse uses Paystack to securely process your payments"
- CTA: "Get started"

**Step 2 — Personal identity**
- BVN (11 digits) — inline format validation
- NIN (11 digits)
- Phone number (+234 format) — masked input
- Microcopy: "We use these to verify you, not to access your money"

**Step 3 — Business details**
- Business category dropdown (Retail, Food, Provision, Services, Online, Other)
- CAC RC number (optional)
- Business address (optional)

**Step 4 — ID photo**
- "Take a photo of yourself holding your ID"
- "Make sure your face AND your ID are both clearly visible"
- Example illustration
- Camera capture (`<input type="file" accept="image/*" capture="user">`)
- Preview + Retake button
- Upload to Supabase Storage `kyc-photos/{user_id}/{submission_id}/photo.jpg`

**Step 5 — Review and submit**
- Display all fields with "Edit" buttons
- Photo thumbnail
- Confirmation checkbox: "I confirm I am the legal owner/operator of this business and the information provided is accurate."
- Submit button (disabled until checkbox ticked)
- On `subscription_required` error: redirect to `/settings/billing` with toast

**Step 6 — Submitted**
- "Identity verification submitted"
- "We'll review your information and let you know within 24-48 hours"
- Trust badge

### 6.4 Edit rules (Q5 decisions)

**During pending:** LOCKED. No edits. Card 2 shows "Identity verification submitted — awaiting review"

**After resubmittable rejection:** "Update your details" button reopens wizard pre-filled. 5 resubmissions max.

**After hard rejection (`unable_to_verify`):** "Please contact support." No edit button. Email link only.

**After approval:** "Edit details" button. Limited form:
- **Freely editable (no re-review):** phone, business category, CAC RC, business address
- **Triggers re-review:** BVN, NIN, ID photo, account_number — status flips back to pending, F3 still works during re-review

### 6.5 Card 2 status states

```typescript
type KycStatus =
  | { kind: 'loading' }
  | { kind: 'tier_locked' }              // Free tier — upgrade CTA
  | { kind: 'not_started' }              // Paid tier, no vendor_kyc row
  | { kind: 'pending'; submission_count: number }
  | { kind: 'rejected_can_resubmit'; merchant_message: string; submissions_remaining: number }
  | { kind: 'rejected_hard'; merchant_message: string }
  | { kind: 'approved' };
```

**tier_locked UI:**
```
🔒 Verify your identity
Online payments are available on paid plans.
Upgrade to Starter (₦5,000/month) or Pro (₦10,000/month) to:
• Receive online payments through your Storehouse
• Get your earnings sent directly to your bank
• Built on Paystack for secure, instant settlements
[ Upgrade plan → ]
```

---

## 7. Reviewer workflow (Phase 1 — Paul only)

### 7.1 Notification flow

1. Merchant submits KYC → `vendor_kyc` insert
2. DB trigger fires `notify-reviewer-new-kyc` edge function
3. Email to Paul's inbox: "New KYC submission — {business name}"
4. Email contains instructions for Phase 1 bash workflow

### 7.2 Bash scripts (`scripts/kyc/`)

**`list-pending.sh`:** Lists pending submissions.

**`review.sh <kyc_id>`:** Shows full details + signed photo URL.

**`approve.sh <kyc_id> [notes]`:** Calls `approve_kyc_review`. Prints reminder to verify on Paystack dashboard.

**`reject.sh <kyc_id> <category> [notes]`:** Calls `reject_kyc_review` with category validation.

### 7.3 Rejection categories

| Category | Merchant message | Resubmit? |
|---|---|---|
| `photo_unclear` | "Your photo was too blurry to verify. Please take a clearer photo in good lighting and try again." | Yes |
| `photo_doesnt_show_id` | "We couldn't see your ID clearly in the photo. Please make sure both your face and your ID are visible." | Yes |
| `info_doesnt_match` | "The information you provided doesn't match your bank account. Please check and try again." | Yes |
| `document_not_accepted` | "We need a different type of ID. Please use your NIN slip, driver's license, voter's card, or passport." | Yes |
| `more_info_needed` | "We need to verify some additional details. Please contact support@storehouse.ng." | No |
| `unable_to_verify` | "We're unable to verify your account at this time. Please contact support." | No |

### 7.4 Reviewer checklist (`docs/REVIEWER_CHECKLIST.md`)

```
□ Selfie shows a real person (not screen capture, not edited)
□ ID is clearly visible in the same photo as the face
□ Face on the ID appears to match face of the person
□ Name on ID matches what merchant entered
□ Name on ID matches bank-resolved account name (from F1)
□ BVN starts with 2 and is 11 digits
□ NIN is 11 digits and not identical to BVN
□ Email doesn't look disposable or mismatched
□ Phone is valid Nigerian format
□ Business category fits contextual signals
□ Nothing in the submission triggers gut suspicion

DECISIONS:
- All clear → approve.sh
- 1 minor concern → reject.sh with appropriate category (allows resubmission)
- 2+ concerns OR strong gut suspicion → reject.sh unable_to_verify (hard reject)
- Genuinely uncertain → call the merchant. 5 min on the phone resolves most cases.
```

### 7.5 Paystack manual verification

After `approve.sh`:
1. Open https://dashboard.paystack.com/#/subaccounts
2. Find subaccount by business name
3. Click "Verify Subaccount"
4. Paystack releases held first-payout next day

Phase 2 automates via Paystack's verify-subaccount API.

---

## 8. Velocity limits visibility (Phase 1.5)

### 8.1 Where it appears

Below Card 2 on `/settings/payments`. **Only visible to paid-tier merchants with approved KYC.** Hidden entirely for free tier or pre-approval states.

```
Current Limits
─────────────────────────────────────
Daily transactions:    ₦200,000
Monthly transactions:  ₦5,000,000
Single transaction:    ₦100,000

(Limits increase as your business grows. Contact support for higher limits.)
```

### 8.2 Data source

1. Check `vendor_velocity_overrides` for store, valid `expires_at`
2. Fall back to tier defaults from `platform_fee_config`

### 8.3 No request form in v1

Merchants email support@storehouse.ng. Paul/admin grants via:

```bash
./scripts/velocity/grant.sh \
  --store-id <uuid> \
  --daily 500000 \
  --reason "Confirmed via phone call"
```

Self-serve request form deferred to Phase 2.

---

## 9. RLS policies

### 9.1 `vendor_kyc`

```sql
CREATE POLICY vendor_kyc_self_select ON vendor_kyc FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores s 
      WHERE s.id = vendor_kyc.store_id AND s.user_id = auth.uid()
    )
  );

-- All writes via RPCs only. No direct INSERT/UPDATE policies for authenticated users.
```

### 9.2 `vendor_velocity_overrides`

Phase 1: service-role only (no policies). Phase 2 adds merchant-readable scope for the visibility card via dedicated RPC.

---

## 10. Testing plan

### 10.1 Tier gating

- Free-tier user → Card 1 + Card 2 both show `tier_locked`
- Direct URL `/settings/payments/identity-verification` → redirects free user to billing
- Direct RPC call from free user → returns `subscription_required` error

### 10.2 Past_due grace

- Set status='past_due', current_period_end=NOW() - 3 days → KYC allowed (within grace)
- Set current_period_end=NOW() - 8 days → tier_locked (grace expired)

### 10.3 Format validation

- Valid input passes
- Invalid input shows correct error
- Edge cases: BVN starting with 1, NIN equal to BVN, phone format variations

### 10.4 End-to-end happy path

1. Paul (permanent Pro from 3.4) opens wizard
2. Walks through 5 steps with real data
3. Photo uploads successfully
4. Submission creates `vendor_kyc` row
5. Email notification arrives
6. `review.sh` shows submission with signed photo URL
7. `approve.sh` approves
8. `vendor_kyc.status = 'approved'`, `stores.kyc_status = 'approved'`
9. Card 2 shows "Identity verified ✓"
10. Paul manually verifies on Paystack dashboard

### 10.5 Rejection paths

For each category:
- `reject.sh` runs
- Card 2 shows correct merchant message
- Resubmission allowed/blocked correctly
- After 5 resubmissions, system blocks further attempts

### 10.6 Edit rules

- Pending: edit buttons hidden
- After approval, phone edit: no re-review trigger
- After approval, BVN edit: status flips to pending, F3 still works

### 10.7 Velocity overrides

- No override: tier defaults used
- Daily override only: override daily, tier default monthly + single
- Expired override: ignored, tier defaults used
- Visibility card shows correct effective limits

### 10.8 Downgrade behavior

- Pro merchant approved, active subaccount
- Downgrade to free → both Cards show `tier_locked`
- F3 returns `subscription_required` (subaccount stays active on Paystack)
- Re-upgrade → Cards return to verified, F3 accepts payments

---

## 11. Out of scope for v1

**v1.5 candidates:**
- SMS phone verification
- Claude API-assisted photo analysis
- Read-only Paystack dashboard view for merchants (Model B's first surface)

**Phase 2 (before merchant #10):**
- `/admin/kyc-reviews` web page with role-based auth
- Paystack verify-subaccount API automation
- Multi-reviewer support
- Self-serve velocity increase request form + reviewer queue UI
- Reviewer training document

**v2 (before merchant #100):**
- Smile Identity integration (NIBSS/NIMC verification)
- Liveness detection (video-based)
- Auto-approve high-confidence verifications

---

## 12. Implementation order

**Session 4:**

1. Migrations: `vendor_kyc` extensions + `vendor_velocity_overrides` + Paul super-admin subscription
2. Supabase Storage bucket setup
3. RPCs: `submit_kyc_v1`, `approve_kyc_review`, `reject_kyc_review`, `grant_velocity_override`
4. F2 + F3 tier guards
5. F3 velocity override lookup
6. Bash scripts for reviewer Phase 1 tooling
7. Email notification edge function

**Session 5:**

8. Card 1 `tier_locked` state
9. Card 2 status states including `tier_locked`
10. Wizard frontend (5-step flow)
11. Velocity visibility card
12. Edit-after-approval limited form

**Session 6:**

13. End-to-end happy path test
14. Rejection path tests
15. Tier gating + past_due grace tests
16. Edit/resubmit path tests
17. `docs/REVIEWER_CHECKLIST.md`
18. CLAUDE.md updates

---

## 13. Pre-launch hard gates

Before onboarding any non-Paul merchant:

- [ ] KYC v1 wizard built and end-to-end tested
- [ ] Reviewer bash scripts working
- [ ] Photo storage encrypted (verify Supabase default)
- [ ] BVN/NIN stored with proper protection
- [ ] Email notification working
- [ ] Manual Paystack dashboard verification workflow documented
- [ ] Reviewer checklist saved accessibly
- [ ] **Nigerian fintech lawyer consult** (TOS, privacy policy, regulatory framing)
- [ ] **Public TOS and privacy policy** on storehouse.ng
- [ ] `BYPASS_KYC_FOR_SMOKE` env var unset
- [ ] Exposed Supabase legacy JWT keys rotated (Firebase decision)
- [ ] **Subscription system tested end-to-end** (free → paid upgrade flow, past_due handling)

---

## 14. Open questions

1. **Encryption for BVN/NIN at rest:** Supabase default sufficient or column-level via pgsodium? Check `vendor_kyc_key` vault secret.
2. **Photo retention policy:** how long after approval? After rejection? NDPR considerations.
3. **Cross-merchant duplicate detection:** flag if same BVN/NIN used by two stores? Phase 2.
4. **Bearer policy:** TODO at F3 line 346 — merchant or Storehouse absorbs Paystack wholesale fee?
5. **Settlement schedule customization:** Paystack supports weekly/monthly. Hardcode auto?
6. **Velocity override expiry default:** 90 days or permanent?
7. **Subscription billing integration:** verify how user_subscriptions table is populated today.

---

**End of specification.**

Next action: implement Session 4 starting with section 12's order. Branch off `feat/paystack-subaccounts` as `feat/kyc-wizard-v1`.
