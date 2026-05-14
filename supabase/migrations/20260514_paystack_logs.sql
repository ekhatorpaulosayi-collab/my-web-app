-- paystack_logs: SQL-queryable observability table for Paystack interactions.
--
-- One row per outbound request, one row per response. Linked via
-- correlation_id (generated per edge-function invocation). Service-role
-- only — RLS is on with no policies, so no anon/authenticated access.
--
-- TODO(retention): implement 90-day retention via pg_cron once logs
-- table starts growing. Tracked alongside other ops infrastructure.
-- TODO(reviewer-access): when admin reviewer UI is built, consider
-- whether reviewers should have read access to logs scoped to their
-- assigned merchants.

CREATE TABLE IF NOT EXISTS paystack_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  correlation_id     uuid NOT NULL,
  function_name      text NOT NULL,
  direction          text NOT NULL CHECK (direction IN ('outbound', 'response')),
  paystack_endpoint  text NOT NULL,
  http_method        text NOT NULL DEFAULT 'POST',
  http_status        int,
  paystack_reference text,
  store_id           uuid REFERENCES stores(id) ON DELETE SET NULL,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id           uuid,
  error_tag          text,
  error_message      text,
  request_body       jsonb,
  response_body      jsonb,
  duration_ms        int
);

CREATE INDEX IF NOT EXISTS idx_paystack_logs_function_created
  ON paystack_logs (function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paystack_logs_correlation
  ON paystack_logs (correlation_id);

CREATE INDEX IF NOT EXISTS idx_paystack_logs_paystack_reference
  ON paystack_logs (paystack_reference)
  WHERE paystack_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paystack_logs_store_created
  ON paystack_logs (store_id, created_at DESC)
  WHERE store_id IS NOT NULL;

ALTER TABLE paystack_logs ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS; no anon/authenticated access.
