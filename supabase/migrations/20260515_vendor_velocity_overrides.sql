-- Step 1c — vendor_velocity_overrides table.
-- Spec: docs/KYC_V1_SPEC.md §3.5
--
-- Per-merchant ceiling overrides on velocity caps. Reviewer grants
-- via grant_velocity_override RPC (step 4); F3 reads via the
-- override lookup added in step 5.2. NULL expires_at means
-- permanent; non-NULL means time-bounded. At least one of the
-- three cap columns must be set (enforced via CHECK).
--
-- We do NOT create a partial index for active overrides
-- (WHERE expires_at IS NULL OR expires_at > now()) — Postgres
-- rejects this because now() is STABLE, not IMMUTABLE, and
-- partial index predicates must be IMMUTABLE. The composite
-- (store_id, expires_at) index below handles realistic query
-- patterns adequately. Revisit if profiling shows hotspots.

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

CREATE INDEX idx_velocity_overrides_store
  ON vendor_velocity_overrides (store_id, expires_at);

ALTER TABLE vendor_velocity_overrides ENABLE ROW LEVEL SECURITY;
-- Service-role only for v1. Phase 2 adds reviewer-role read access.
