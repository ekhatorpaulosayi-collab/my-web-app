# Storehouse KYC v1 Specification (v2 — schema-reconciled)

**Status:** Approved spec, ready to implement
**Date written:** 14 May 2026
**Schema-reconciled:** 15 May 2026 (after discovering existing vendor_kyc structure)
**Target session:** Session 4 (next session after Session 3 wrap)
**Branch:** `feat/kyc-wizard-v1` off `feat/paystack-subaccounts`
**Estimated build:** 16-22 hours, ~2 focused sessions

---

## 1. Context and goals

### Why this spec exists

Card 2 ("Verify your identity") on `/settings/payments` is currently a "Coming soon" placeholder. This spec defines the wizard that fills it in.

KYC is the **single hardest blocker** between Storehouse and onboarding non-Paul merchants.

### What this wizard does

A paying-tier merchant who has completed bank setup (Card 1) clicks "Verify your identity" on Card 2. The wizard:

1. Collects identity information (BVN, NIN, phone, business category)
2. Collects optional business information (CAC RC number, business address)
3. Collects a photo: selfie of the merchant holding their ID card
4. Stores everything in `vendor_kyc` table with `status = 'submitted'`
5. Notifies the reviewer (Paul) via email
6. Shows the merchant a "submitted, awaiting review" status

The reviewer (Paul for first 5-10 merchants, employees after) manually reviews and approves/rejects via bash scripts. Approval triggers `stores.kyc_status = 'approved'`. Paul manually verifies the subaccount in Paystack's dashboard to release the held first-payout.

### Who can access this wizard

**Only merchants on a paid tier (Starter ₦5K/mo or Pro ₦10K/mo).** Free-tier merchants see Card 2 in a `tier_locked` state with upgrade CTA. See section 2.7.

---

## 2. Architectural decisions (locked)

### 2.1 Model A
Storehouse owns the parent Paystack integration. Merchants are subaccounts. Merchants never log into Paystack. Use Paystack as trust badge only.

### 2.2 Settlement delay via Paystack's built-in verification
Paystack auto-holds first payout until Paul manually verifies the subaccount in their dashboard. Storehouse does NOT custody held funds.

### 2.3 Manual photo review for v1
No Smile Identity, no automated face match, no liveness. Manual review by Paul, then employees in Phase 2.

### 2.4 Format-only field validation at submission
No live BVN/NIN verification API. No SMS OTP. Format regex only; substantive verification happens in manual review.

### 2.5 Reviewer tooling phased
- Phase 1 (Paul-only, ships with KYC v1): Bash scripts in `scripts/kyc/`
- Phase 2 (multi-reviewer, ships before merchant #10): Web page at `/admin/kyc-reviews` with role-based auth

### 2.6 Velocity overrides infrastructure included
`vendor_velocity_overrides` table in v1. F3 checks overrides before tier defaults. Visibility card. Manual grants via bash. Self-serve request UI deferred to Phase 2.

### 2.7 Paystack gated to paid tiers only (Option 1b)

**Free-tier merchants cannot complete KYC or access Paystack.** Card 1 and Card 2 both require active Starter/Pro subscription.

**Free tier still gets:** inventory, AI chat, contributions, customer messaging, multilingual storefront.

**Past_due grace:** 7 days after `current_period_end` before access revoked.

### 2.8 Build on existing vendor_kyc schema (added during reconciliation)

The existing `vendor_kyc` table (24 columns) was set up in Session 1 with:
- Encryption for sensitive PII via `decrypt_vendor_kyc_field` + `vendor_kyc_key` vault secret
- Three photo slots: `id_photo_url`, `id_back_url`, `selfie_url`
- 5-state status enum: `not_started`, `submitted`, `approved`, `rejected`, `frozen`
- Fraud signals: `signup_ip`, `signup_device_fingerprint`
- Granular location: `lga`, `state`, `market_area`

**v1 will use this schema, NOT replace it.** The `frozen` status maps to hard rejection. Encryption stays. We add only 6 new columns + 1 helper function.

---

## 3. Database schema changes

### 3.1 Existing vendor_kyc schema (use as-is, no changes)

| Column | Type | v1 usage |
|---|---|---|
| `id` | uuid PK | — |
| `store_id` | uuid UNIQUE FK | — |
| `bvn_encrypted` | bytea | Stores BVN encrypted; written via `encrypt_vendor_kyc_field`, read via `decrypt_vendor_kyc_field` |
| `nin_encrypted` | bytea | Stores NIN encrypted; same pattern as BVN |
| `id_photo_url` | text | Front of ID card photo (NOT used in v1 — see selfie_url) |
| `id_back_url` | text | Back of ID card (NOT used in v1) |
| `selfie_url` | text | **v1 photo: selfie holding ID** (single combined image per spec 2.3) |
| `business_name` | text | Read from stores.business_name on submit (don't double-store) |
| `business_address` | text | Optional v1 field |
| `lga` | text | Not used in v1 (kept for future) |
| `state` | text | Not used in v1 |
| `market_area` | text | Not used in v1 |
| `phone` | text | **v1 phone field** |
| `whatsapp` | text | Not used in v1 (kept for future) |
| `referral_source` | text | Not used in v1 |
| `status` | text (5-state CHECK) | **State machine** — see 3.2 |
| `reviewer_notes` | text | **Internal reviewer notes (not shown to merchant)** |
| `reviewed_by` | uuid FK auth.users | Audit trail |
| `reviewed_at` | timestamptz | Audit trail |
| `rejection_reason` | text | DEPRECATED for v1 — use `rejection_category` (3.3) for structured reasons. Leave column in place. |
| `submitted_at` | timestamptz | Set on each submission |
| `signup_ip` | text | Fraud signal (existing) |
| `signup_device_fingerprint` | text | Fraud signal (existing) |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | — |

### 3.2 Status state machine

The existing `status` CHECK enumerates 5 values. v1 uses all 5:

| Status | Meaning |
|---|---|
| `not_started` | No row exists OR row exists but never submitted (rare) |
| `submitted` | Merchant has completed wizard; pending reviewer action |
| `approved` | Reviewer approved; stores.kyc_status flipped to 'approved' |
| `rejected` | Reviewer rejected with a resubmittable category — merchant can fix and resubmit |
| `frozen` | **Hard rejection — merchant cannot resubmit. Contact support only.** |

### 3.3 New columns to add to vendor_kyc

```sql
-- Migration: supabase/migrations/20260515_vendor_kyc_extensions.sql

ALTER TABLE vendor_kyc 
  ADD COLUMN business_category text 
  CHECK (business_category IN ('retail', 'food', 'provision', 'services', 'online', 'other'));

ALTER TABLE vendor_kyc 
  ADD COLUMN cac_rc_number text;

ALTER TABLE vendor_kyc 
  ADD COLUMN submission_count int NOT NULL DEFAULT 1;

ALTER TABLE vendor_kyc 
  ADD COLUMN confirmation_accepted_at timestamptz;

ALTER TABLE vendor_kyc 
  ADD COLUMN rejection_category text 
  CHECK (rejection_category IN (
    'photo_unclear',
    'photo_doesnt_show_id',
    'info_doesnt_match',
    'document_not_accepted',
    'more_info_needed'
  ));
-- Note: 'unable_to_verify' from original spec is DROPPED — represented by status='frozen' instead

ALTER TABLE vendor_kyc 
  ADD COLUMN reviewer_notes_merchant text;
-- The merchant-facing message (rejection category mapping). 
-- Distinct from reviewer_notes (internal) which already exists.
```

**No NOT NULL constraints on new columns** even though earlier spec versions specified them. Reason: the table currently has 0 rows but may have existing test rows from Session 1 in dev environments. NOT NULL would block migration on row presence. Enforcement happens at the RPC layer (submit_kyc_v1 validates required fields before insert).

`business_category` is the exception worth thinking about: it's truly required for v1 submission. But we enforce it at the RPC, not the column.

### 3.4 Encryption helper (new function)

Mirror of existing `decrypt_vendor_kyc_field`:

```sql
CREATE OR REPLACE FUNCTION encrypt_vendor_kyc_field(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_value text;
BEGIN
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'vendor_kyc_key';
  
  IF key_value IS NULL THEN
    RAISE EXCEPTION 'vendor_kyc_key not configured in vault';
  END IF;
  
  RETURN pgp_sym_encrypt(plaintext, key_value);
END;
$$;

-- Grant execute to authenticated (needed by submit_kyc_v1 which is SECURITY DEFINER but the helper is called within)
-- Actually: keep restricted, only invoke from within other SECURITY DEFINER RPCs
REVOKE ALL ON FUNCTION encrypt_vendor_kyc_field(text) FROM PUBLIC;
```

### 3.5 vendor_velocity_overrides table (new)

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

-- Note: We considered a partial index on active overrides
-- (WHERE expires_at IS NULL OR expires_at > now()) but Postgres
-- rejects this — partial index predicates must be IMMUTABLE
-- and now() is STABLE. Realistic query patterns are handled
-- adequately by the composite (store_id, expires_at) index.
-- Revisit if profiling shows hotspots.

ALTER TABLE vendor_velocity_overrides ENABLE ROW LEVEL SECURITY;
-- Service-role only for v1. Phase 2 adds reviewer-role read access.
```

### 3.6 Supabase Storage bucket: kyc-photos

New bucket: `kyc-photos`

- No public access
- Authenticated users upload to `{user_id}/{vendor_kyc_id}/selfie.jpg`
- Authenticated users read own paths via signed URLs only
- Service role: full read access
- Max size: 5MB
- Accepted MIME: `image/jpeg`, `image/png`

The path is stored in `vendor_kyc.selfie_url` (existing column, used for the combined selfie-with-ID photo per architectural decision 2.3).

### 3.7 Paul super-admin subscription

```sql
-- user_subscriptions is append-history: multiple rows per user over
-- time (paystack-webhook + verify-subscription both insert new rows
-- on subscription events). There is no UNIQUE(user_id), so a normal
-- ON CONFLICT (user_id) DO UPDATE is rejected. DELETE + INSERT
-- achieves the same idempotent intent without a schema change.
DELETE FROM user_subscriptions
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44';

INSERT INTO user_subscriptions (user_id, tier_id, status, current_period_end)
VALUES (
  'dffba89b-869d-422a-a542-2e2494850b44',
  'pro',
  'active',
  '2099-01-01'
);
```

---

## 4. RPCs

### 4.1 `submit_kyc_v1` (merchant-facing)

```sql
CREATE OR REPLACE FUNCTION submit_kyc_v1(
  p_store_id uuid,
  p_bvn text,
  p_nin text,
  p_phone text,
  p_business_category text,
  p_selfie_url text,
  p_cac_rc_number text DEFAULT NULL,
  p_business_address text DEFAULT NULL,
  p_confirmation_accepted boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_has_paid_tier boolean;
  v_existing_status text;
  v_submission_count int;
  v_kyc_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Ownership check.
  -- stores.user_id is text (legacy schema). Cast auth.uid() (uuid)
  -- to text for the comparison to match existing codebase patterns.
  IF NOT EXISTS (
    SELECT 1 FROM stores 
    WHERE id = p_store_id AND user_id = v_user_id::text
  ) THEN
    RAISE EXCEPTION 'unauthorized: store not owned by user';
  END IF;
  
  -- Tier check (Option 1b)
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = v_user_id
      AND us.tier_id IN ('starter', 'pro')
      AND us.status IN ('active', 'non_renewing', 'trialing', 'past_due')
      AND (us.current_period_end IS NULL OR us.current_period_end > now() - INTERVAL '7 days')
  ) INTO v_has_paid_tier;
  
  IF NOT v_has_paid_tier THEN
    RAISE EXCEPTION 'subscription_required';
  END IF;
  
  -- Confirmation check
  IF NOT p_confirmation_accepted THEN
    RAISE EXCEPTION 'confirmation_required';
  END IF;
  
  -- Format validation
  IF p_bvn !~ '^2\d{10}$' THEN
    RAISE EXCEPTION 'invalid_bvn_format';
  END IF;
  
  IF p_nin !~ '^\d{11}$' THEN
    RAISE EXCEPTION 'invalid_nin_format';
  END IF;
  
  IF p_bvn = p_nin THEN
    RAISE EXCEPTION 'bvn_nin_identical';
  END IF;
  
  IF p_phone !~ '^\+234[789]\d{9}$' THEN
    RAISE EXCEPTION 'invalid_phone_format';
  END IF;
  
  IF p_business_category NOT IN ('retail', 'food', 'provision', 'services', 'online', 'other') THEN
    RAISE EXCEPTION 'invalid_business_category';
  END IF;
  
  -- Check existing status
  SELECT status, submission_count 
  INTO v_existing_status, v_submission_count
  FROM vendor_kyc 
  WHERE store_id = p_store_id;
  
  -- Block if pending or hard-frozen
  IF v_existing_status = 'submitted' THEN
    RAISE EXCEPTION 'already_pending';
  END IF;
  
  IF v_existing_status = 'frozen' THEN
    RAISE EXCEPTION 'account_frozen_contact_support';
  END IF;
  
  -- Check resubmission limit (5 max)
  IF v_existing_status = 'rejected' AND v_submission_count >= 5 THEN
    RAISE EXCEPTION 'max_resubmissions_exceeded';
  END IF;
  
  -- Insert or update
  INSERT INTO vendor_kyc (
    store_id,
    bvn_encrypted,
    nin_encrypted,
    phone,
    business_category,
    selfie_url,
    cac_rc_number,
    business_address,
    status,
    submitted_at,
    submission_count,
    confirmation_accepted_at
  ) VALUES (
    p_store_id,
    encrypt_vendor_kyc_field(p_bvn),
    encrypt_vendor_kyc_field(p_nin),
    p_phone,
    p_business_category,
    p_selfie_url,
    p_cac_rc_number,
    p_business_address,
    'submitted',
    now(),
    1,
    now()
  )
  ON CONFLICT (store_id) DO UPDATE
  SET 
    bvn_encrypted = encrypt_vendor_kyc_field(p_bvn),
    nin_encrypted = encrypt_vendor_kyc_field(p_nin),
    phone = p_phone,
    business_category = p_business_category,
    selfie_url = p_selfie_url,
    cac_rc_number = p_cac_rc_number,
    business_address = p_business_address,
    status = 'submitted',
    submitted_at = now(),
    submission_count = vendor_kyc.submission_count + 1,
    confirmation_accepted_at = now(),
    -- Clear previous rejection
    rejection_category = NULL,
    reviewer_notes_merchant = NULL,
    reviewer_notes = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL
  RETURNING id INTO v_kyc_id;
  
  -- Email notification handled by separate trigger or edge function
  
  RETURN json_build_object(
    'kyc_id', v_kyc_id,
    'status', 'submitted',
    'submission_count', COALESCE(v_submission_count + 1, 1)
  );
END;
$$;
```

### 4.2 `approve_kyc_review` (reviewer-only)

```sql
CREATE OR REPLACE FUNCTION approve_kyc_review(
  p_kyc_id uuid,
  p_reviewer_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id uuid;
  v_current_status text;
BEGIN
  -- Phase 1: service-role only (no role check in body; rely on grant)
  -- Phase 2: add role check via auth.jwt() -> role claim
  
  SELECT store_id, status 
  INTO v_store_id, v_current_status
  FROM vendor_kyc 
  WHERE id = p_kyc_id;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;
  
  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;
  
  -- Update vendor_kyc
  UPDATE vendor_kyc 
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes)
  WHERE id = p_kyc_id;
  
  -- Update stores.kyc_status
  UPDATE stores 
  SET 
    kyc_status = 'approved',
    kyc_approved_at = now()
  WHERE id = v_store_id;
  
  -- Note: Paul manually verifies subaccount on Paystack dashboard (Phase 1)
  -- Phase 2 will call Paystack's verify-subaccount API here
  
  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', 'approved',
    'stores_kyc_status', 'approved'
  );
END;
$$;
```

### 4.3 `reject_kyc_review` (reviewer-only)

```sql
CREATE OR REPLACE FUNCTION reject_kyc_review(
  p_kyc_id uuid,
  p_rejection_category text,
  p_reviewer_notes text DEFAULT NULL,
  p_freeze boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_merchant_message text;
  v_target_status text;
BEGIN
  -- Validate category
  IF p_rejection_category NOT IN (
    'photo_unclear', 'photo_doesnt_show_id', 'info_doesnt_match',
    'document_not_accepted', 'more_info_needed'
  ) THEN
    -- Also allow NULL category if freezing (no specific reason)
    IF NOT (p_freeze AND p_rejection_category IS NULL) THEN
      RAISE EXCEPTION 'invalid_rejection_category';
    END IF;
  END IF;
  
  SELECT status INTO v_current_status
  FROM vendor_kyc 
  WHERE id = p_kyc_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'kyc_not_found';
  END IF;
  
  IF v_current_status != 'submitted' THEN
    RAISE EXCEPTION 'not_pending_review';
  END IF;
  
  -- Map category to merchant-facing message
  v_merchant_message := CASE p_rejection_category
    WHEN 'photo_unclear' THEN 'Your photo was too blurry to verify. Please take a clearer photo in good lighting and try again.'
    WHEN 'photo_doesnt_show_id' THEN 'We couldn''t see your ID clearly in the photo. Please make sure both your face and your ID are visible.'
    WHEN 'info_doesnt_match' THEN 'The information you provided doesn''t match your bank account. Please check and try again.'
    WHEN 'document_not_accepted' THEN 'We need a different type of ID. Please use your NIN slip, driver''s license, voter''s card, or passport.'
    WHEN 'more_info_needed' THEN 'We need to verify some additional details. Please contact support@storehouse.ng.'
    ELSE 'We''re unable to verify your account at this time. Please contact support.'
  END;
  
  v_target_status := CASE WHEN p_freeze THEN 'frozen' ELSE 'rejected' END;
  
  UPDATE vendor_kyc 
  SET 
    status = v_target_status,
    rejection_category = p_rejection_category,
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes),
    reviewer_notes_merchant = v_merchant_message,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_kyc_id;
  
  RETURN json_build_object(
    'kyc_id', p_kyc_id,
    'status', v_target_status,
    'rejection_category', p_rejection_category,
    'can_resubmit', NOT p_freeze AND v_target_status != 'frozen'
  );
END;
$$;
```

### 4.4 `grant_velocity_override` (admin-only)

```sql
CREATE OR REPLACE FUNCTION grant_velocity_override(
  p_store_id uuid,
  p_daily_cap_kobo bigint DEFAULT NULL,
  p_monthly_cap_kobo bigint DEFAULT NULL,
  p_single_txn_cap_kobo bigint DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_override_id uuid;
BEGIN
  -- Service-role only — Phase 2 may add reviewer-role
  
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  
  IF p_daily_cap_kobo IS NULL AND p_monthly_cap_kobo IS NULL AND p_single_txn_cap_kobo IS NULL THEN
    RAISE EXCEPTION 'at_least_one_cap_required';
  END IF;
  
  INSERT INTO vendor_velocity_overrides (
    store_id, daily_cap_kobo, monthly_cap_kobo, single_txn_cap_kobo,
    expires_at, reason, created_by_user_id
  ) VALUES (
    p_store_id, p_daily_cap_kobo, p_monthly_cap_kobo, p_single_txn_cap_kobo,
    p_expires_at, p_reason, auth.uid()
  )
  RETURNING id INTO v_override_id;
  
  RETURN json_build_object(
    'override_id', v_override_id,
    'expires_at', p_expires_at
  );
END;
$$;
```

---

## 5. Edge function changes

### 5.1 F2 (`create-paystack-subaccount`) — tier guard

Add tier check before the idempotency pre-check (entitlement
supersedes cache — a downgraded merchant with an existing
paystack_subaccounts row should not get a stale success). This
means moving the existing `resolveActiveTier` call up above the
idempotency pre-check too, so the guard has access to `tier.tier_id`.
Caller-side bindings: `user.id` in F2's existing code (from the
auth lookup), not the generic `user_id`. Response helper: this
codebase uses `jsonResponse({...}, status)` — there is no
`responses.error()` helper.

```typescript
const tier = await resolveActiveTier(admin, user.id);

if (tier.tier_id === 'free') {
  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'create-paystack-subaccount',
    direction: 'outbound',
    paystack_endpoint: 'N/A',
    error_tag: 'tier_not_paid',
    store_id,
    user_id: user.id,
  });
  return jsonResponse({
    error: 'subscription_required',
    message: 'Setting up online payments requires a paid plan.',
  }, 403);
}
```

### 5.2 F3 (`initiate-storefront-payment`) — tier guard + velocity override lookup

Same pattern as F2. F3 has no idempotency check, so the existing
`resolveActiveTier` call placement is fine — the guard goes right
after it. Caller-side bindings: `store.user_id` (F3 is anonymous-OK,
so user_id comes from the store row, not an auth lookup).

```typescript
// Tier guard first
const resolvedTier = await resolveActiveTier(admin, store.user_id);
if (resolvedTier.tier_id === 'free') {
  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'initiate-storefront-payment',
    direction: 'outbound',
    paystack_endpoint: 'N/A',
    error_tag: 'tier_not_paid',
    store_id,
    user_id: store.user_id,
  });
  return jsonResponse({
    error: 'subscription_required',
    message: 'Your subaccount is paused. Please re-upgrade to receive payments.',
  }, 403);
}

// Velocity override lookup
const { data: override } = await supabase
  .from('vendor_velocity_overrides')
  .select('*')
  .eq('store_id', storeId)
  .or('expires_at.is.null,expires_at.gt.now()')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const effectiveDailyCap = override?.daily_cap_kobo ?? tierDefaults.daily_cap_kobo;
const effectiveMonthlyCap = override?.monthly_cap_kobo ?? tierDefaults.monthly_cap_kobo;
const effectiveSingleTxnCap = override?.single_txn_cap_kobo ?? tierDefaults.single_txn_cap_kobo;
```

### 5.3 `notify-reviewer-new-kyc` edge function

Triggered on `vendor_kyc` row update where `status` changes to `'submitted'` (via DB trigger calling pg_net or via webhook).

**v1:** Send email via Resend with hardcoded reviewer email (Paul's).

Email:
- Subject: "New KYC submission — {business_name}"
- Body: kyc_id, store_id, submission_count, link/bash instructions

---

## 6. Frontend changes

### 6.1 Card 1 tier_locked state

Add 5th state to existing `SubaccountStatus` union in `src/pages/PaymentSetup.tsx`:

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
- `/settings/payments/identity-verification` — redirects free user to `/settings/billing`

### 6.3 Wizard structure (5 steps)

**Step 1 — Why we need this**
- "We need to verify your identity to comply with Nigerian financial regulations"
- "This is required before you can start receiving payments"
- "Your information is encrypted and only used for verification"
- Trust badge: "Storehouse uses Paystack to securely process your payments"
- CTA: "Get started"

**Step 2 — Personal identity**
- BVN (11 digits, format-validated)
- NIN (11 digits)
- Phone number (+234 format, masked input)
- Microcopy: "We use these to verify you, not to access your money"

**Step 3 — Business details**
- Business category dropdown (Retail, Food, Provision, Services, Online, Other)
- CAC RC number (optional)
- Business address (optional)

**Step 4 — ID photo (the selfie holding ID)**
- "Take a photo of yourself holding your ID"
- "Make sure your face AND your ID are both clearly visible"
- Example illustration
- Camera capture (`<input type="file" accept="image/*" capture="user">`)
- Preview + Retake button
- Upload to Supabase Storage `kyc-photos/{user_id}/{vendor_kyc_id}/selfie.jpg`
- Stored in `vendor_kyc.selfie_url`

**Step 5 — Review and submit**
- Display all entered fields with "Edit" buttons
- Photo thumbnail
- Confirmation checkbox: "I confirm I am the legal owner/operator of this business and the information provided is accurate."
- Submit button (disabled until checkbox ticked)
- On `subscription_required` error: redirect to `/settings/billing` with toast

**Step 6 — Submitted (status screen)**
- "Identity verification submitted"
- "We'll review your information and let you know within 24-48 hours"
- Trust badge

### 6.4 Edit rules

**status='submitted' (pending review):** LOCKED. No edits.

**status='rejected' (resubmittable):** "Update your details" button reopens wizard pre-filled. 5 resubmissions max (enforced by submit_kyc_v1 RPC).

**status='frozen' (hard rejected):** "Please contact support." No edit button. Email link only.

**status='approved':** "Edit details" button. Limited form:
- **Freely editable:** phone, business_category, cac_rc_number, business_address (direct UPDATE)
- **Triggers re-review:** BVN, NIN, selfie_url — status flips to 'submitted' via re-call to submit_kyc_v1

### 6.5 Card 2 status states

```typescript
type KycStatus =
  | { kind: 'loading' }
  | { kind: 'tier_locked' }
  | { kind: 'not_started' }           // status='not_started' OR no row
  | { kind: 'pending'; submission_count: number }   // status='submitted'
  | { kind: 'rejected_can_resubmit'; merchant_message: string; submissions_remaining: number }  // status='rejected'
  | { kind: 'rejected_hard'; merchant_message: string }   // status='frozen'
  | { kind: 'approved' };             // status='approved'
```

---

## 7. Reviewer workflow (Phase 1 — Paul only)

### 7.1 Notification flow

1. Merchant submits → `submit_kyc_v1` inserts/updates `vendor_kyc` with status='submitted'
2. DB trigger fires `notify-reviewer-new-kyc` edge function
3. Email to Paul's inbox

### 7.2 Bash scripts (`scripts/kyc/`)

**`list-pending.sh`:** Lists submissions where status='submitted'.

**`review.sh <kyc_id>`:** Shows decrypted fields + signed photo URL.

```bash
psql "$(cat ~/.supabase-paystack-dburl)" -c "
  SELECT 
    k.id, k.created_at, k.submission_count,
    decrypt_vendor_kyc_field(k.bvn_encrypted)::text as bvn,
    decrypt_vendor_kyc_field(k.nin_encrypted)::text as nin,
    k.phone, k.business_category,
    k.cac_rc_number, k.business_address,
    s.business_name, 
    ps.account_name as bank_resolved_name
  FROM vendor_kyc k
  JOIN stores s ON s.id = k.store_id
  LEFT JOIN paystack_subaccounts ps ON ps.store_id = k.store_id
  WHERE k.id = '$KYC_ID';
"
# Then generate signed URL for k.selfie_url
```

**`approve.sh <kyc_id> [notes]`:** Calls `approve_kyc_review`. Prints reminder to verify on Paystack dashboard.

**`reject.sh <kyc_id> <category> [notes]`:** Calls `reject_kyc_review` with `p_freeze=false`.

**`freeze.sh <kyc_id> [notes]`:** Calls `reject_kyc_review` with `p_freeze=true` and `p_rejection_category=NULL`. Hard rejection.

### 7.3 Rejection categories (5 + freeze)

| Category | Merchant message | status outcome |
|---|---|---|
| `photo_unclear` | "Your photo was too blurry..." | `rejected` (resubmit) |
| `photo_doesnt_show_id` | "We couldn't see your ID clearly..." | `rejected` (resubmit) |
| `info_doesnt_match` | "Information doesn't match bank..." | `rejected` (resubmit) |
| `document_not_accepted` | "We need a different type of ID..." | `rejected` (resubmit) |
| `more_info_needed` | "Contact support@storehouse.ng" | `rejected` (no resubmit, support only) |
| (no category, p_freeze=true) | "Unable to verify. Contact support." | `frozen` (hard reject) |

### 7.4 Reviewer checklist (`docs/REVIEWER_CHECKLIST.md`)

Same as before — see prior spec section 7.4.

### 7.5 Paystack manual verification

After `approve.sh`: open Paystack dashboard, find subaccount, click "Verify Subaccount". Phase 2 automates via API.

---

## 8. Velocity limits visibility (Phase 1.5)

Below Card 2 on `/settings/payments`. Only visible to paid-tier merchants with approved KYC. Shows current effective limits (override or tier default).

No request form in v1. Merchants email support@storehouse.ng; Paul grants via bash script.

---

## 9. RLS policies

### 9.1 `vendor_kyc`

Existing policy `vendor_kyc_vendor_select` already grants merchant SELECT on own row. Sufficient for v1.

All writes via RPCs only (submit_kyc_v1, approve_kyc_review, reject_kyc_review). No direct INSERT/UPDATE policies for authenticated users.

### 9.2 `vendor_velocity_overrides`

Phase 1: service-role only. Phase 2: merchant-readable scope for visibility card.

---

## 10. Testing plan

### 10.1 Tier gating
- Free user → both Cards `tier_locked`
- Direct RPC from free user → `subscription_required` error

### 10.2 Past_due grace
- status='past_due', period_end=NOW()-3d → KYC allowed (within grace)
- period_end=NOW()-8d → tier_locked

### 10.3 Format validation
- BVN regex, NIN regex, phone regex, business_category enum

### 10.4 End-to-end happy path
1. Paul (permanent Pro from 3.7) opens wizard
2. Walks through 5 steps
3. Photo uploads to Supabase Storage
4. `submit_kyc_v1` inserts vendor_kyc row with status='submitted', encrypts BVN/NIN
5. Email notification arrives
6. `review.sh` shows submission with decrypted fields + signed URL
7. `approve.sh` approves → status='approved', stores.kyc_status='approved'
8. Card 2 shows "Identity verified ✓"
9. Paul manually verifies on Paystack dashboard

### 10.5 Rejection paths
- Each category: reject.sh, Card 2 shows correct message, resubmit allowed
- `freeze.sh`: status='frozen', no resubmit possible

### 10.6 Edit rules
- Pending: edit buttons hidden
- After approval, phone edit: direct UPDATE, no re-review
- After approval, BVN edit: re-call submit_kyc_v1, status='submitted'

### 10.7 Velocity overrides
- No override: tier defaults used
- Daily-only override: override daily, tier defaults for monthly + single
- Expired override: ignored

### 10.8 Downgrade behavior
- Pro merchant approved → downgrade to free
- Both Cards show tier_locked
- F3 returns subscription_required
- Re-upgrade → Cards return to verified

### 10.9 Encryption integrity
- After insert via submit_kyc_v1, bvn_encrypted IS NOT NULL
- decrypt_vendor_kyc_field(bvn_encrypted) returns the original plaintext

---

## 11. Out of scope for v1

**v1.5:**
- SMS phone verification
- Claude API-assisted photo analysis
- Read-only Paystack dashboard view for merchants

**Phase 2 (before merchant #10):**
- `/admin/kyc-reviews` web page with role-based auth
- Paystack verify-subaccount API automation
- Multi-reviewer support
- Self-serve velocity increase request form + reviewer queue UI
- Reviewer training document

**v2 (before merchant #100):**
- Smile Identity integration
- Liveness detection
- Auto-approve high-confidence verifications

---

## 12. Implementation order

**Session 4 (this session, target):**

**Step 1a** — vendor_kyc extensions migration (only 6 new columns)
- File: `supabase/migrations/20260515_vendor_kyc_extensions.sql`
- Apply, verify via information_schema query, commit

**Step 1b** — encrypt_vendor_kyc_field helper function
- File: `supabase/migrations/20260515_encrypt_vendor_kyc_field.sql`
- Apply, verify works (test encrypt → decrypt round-trip), commit

**Step 1c** — vendor_velocity_overrides table
- File: `supabase/migrations/20260515_vendor_velocity_overrides.sql`
- Apply, verify, commit

**Step 1d** — Paul super-admin subscription
- File: `supabase/migrations/20260515_paul_super_admin.sql` (or one-off SQL)
- Apply via psql, verify Paul has tier=pro, commit

**Step 2** — Supabase Storage `kyc-photos` bucket
- Create via Supabase dashboard (or via SQL if accessible)
- Set policies, commit any policy SQL

**Step 3** — RPCs (submit_kyc_v1, approve_kyc_review, reject_kyc_review, grant_velocity_override)
- One migration file per RPC, or combined
- Apply, smoke each, commit

**Step 4** — F2 + F3 tier guards
- Edit existing F2 and F3 to add tier check
- Deploy, smoke, commit

**Step 5** — F3 velocity override lookup
- Edit F3
- Deploy, smoke (with and without override), commit

**Step 6** — Bash scripts in `scripts/kyc/`
- list-pending.sh, review.sh, approve.sh, reject.sh, freeze.sh
- Test each against the existing test data

**Step 7** — Email notification edge function
- `notify-reviewer-new-kyc` deploys with DB trigger

**Session 5:**
- Card 1 tier_locked state
- Card 2 status states (including tier_locked, rejected_can_resubmit, rejected_hard)
- Wizard frontend (5 steps)
- Velocity visibility card
- Edit-after-approval limited form

**Session 6:**
- End-to-end manual tests across all states
- Documentation: REVIEWER_CHECKLIST.md, CLAUDE.md updates

---

## 13. Pre-launch hard gates

- [ ] KYC v1 wizard built and end-to-end tested
- [ ] Reviewer bash scripts working
- [ ] Photo storage encryption verified
- [ ] BVN/NIN encryption verified end-to-end (encrypt → store → decrypt = original)
- [ ] Email notification working
- [ ] Manual Paystack dashboard verification workflow documented
- [ ] Reviewer checklist saved accessibly
- [ ] **Nigerian fintech lawyer consult**
- [ ] **Public TOS + privacy policy on storehouse.ng**
- [ ] `BYPASS_KYC_FOR_SMOKE` env var unset
- [ ] Exposed Supabase legacy JWT keys rotated
- [ ] **Subscription system tested end-to-end** (upgrade flow, past_due handling)

---

## 14. Open questions

1. **Photo retention policy:** how long after approval/rejection? NDPR.
2. **Cross-merchant BVN/NIN duplicate detection:** Phase 2.
3. **Bearer policy:** F3 line 346 TODO — merchant or Storehouse absorbs Paystack fee?
4. **Settlement schedule:** auto vs weekly/monthly merchant choice?
5. **Velocity override expiry default:** 90 days or permanent?
6. **Email provider for notify-reviewer-new-kyc:** Resend, SendGrid, Postmark — choose during Step 7.

---

**End of specification (v2 — schema-reconciled).**

Changes from v1:
- Section 3 entirely rewritten to use existing vendor_kyc schema
- Added section 3.4: encrypt_vendor_kyc_field helper (genuinely new)
- Added section 2.8: explicit note that we build on existing schema
- Section 4.1 (submit_kyc_v1) rewritten with actual column names + encryption + 5-state mapping
- Section 4.3 (reject) adds `p_freeze` parameter, maps to status='frozen'
- Section 6.5 (Card 2 states) rewritten to use existing status enum
- Section 7 (reviewer bash scripts) uses existing column names
- Section 10 (testing) updated with encryption integrity check
- Section 12 (implementation order) split step 1 into 1a/1b/1c/1d
- `unable_to_verify` rejection_category dropped — represented by status='frozen' via p_freeze=true
