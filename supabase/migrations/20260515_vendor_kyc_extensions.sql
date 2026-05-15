-- Step 1a — vendor_kyc table extensions (6 new columns).
-- Spec: docs/KYC_V1_SPEC.md §3.3
--
-- All new columns are nullable at the DB level except submission_count
-- (which has DEFAULT 1 so it's safe to add as NOT NULL — backfills
-- existing rows). RPC submit_kyc_v1 will enforce required-ness at
-- write time.

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
-- Note: 'unable_to_verify' from the original spec is DROPPED —
-- represented by status='frozen' instead.

ALTER TABLE vendor_kyc
  ADD COLUMN reviewer_notes_merchant text;
-- The merchant-facing message (rejection category mapping).
-- Distinct from reviewer_notes (internal) which already exists.
