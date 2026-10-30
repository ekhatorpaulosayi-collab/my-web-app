-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run with the paystack-webhook-router deploy, after 06 (apply_storefront_inventory).
-- Once record_successful_payment has stored the payment, a stock failure must
-- not make Paystack retry the whole event. The router inserts a row here and
-- returns 200. Retry stock by calling apply_storefront_inventory(reference);
-- the fulfillment table makes that idempotent.
--
-- ROLLBACK: DROP TABLE public.storefront_inventory_queue;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_inventory_queue (
  paystack_reference text PRIMARY KEY,
  last_error text,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_inventory_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storefront_inventory_queue FROM PUBLIC, anon, authenticated;

COMMIT;
