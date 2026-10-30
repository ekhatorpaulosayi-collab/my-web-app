-- Undo 20261030_05 on a database where you have already applied it.
-- Do not run this if any order is already disputed or reversed.
-- Then re-apply 20261030_02, 20261030_03, and 20261025_15.
-- Do not re-apply 20261025_09 to get the old staff functions back.
-- 09 leaves 04's staff functions in place when expires_at already exists.
BEGIN;

DROP TRIGGER IF EXISTS orders_cancel_queued_stock ON public.orders;
DROP FUNCTION IF EXISTS public.cancel_queued_stock_on_close();
DROP FUNCTION IF EXISTS public.fulfill_legacy_storefront_lines(text, text, jsonb);
DROP FUNCTION IF EXISTS public.claim_store_provisioning_retries(integer);
DROP FUNCTION IF EXISTS public.record_store_provisioning(uuid, text, text, integer, text);
DROP TABLE IF EXISTS public.store_provisioning;
DROP FUNCTION IF EXISTS public.note_storefront_payment_alert(text, text, text);
DROP TABLE IF EXISTS public.operator_alerts;
DROP TABLE IF EXISTS public.operator_reviewers;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

ALTER TABLE public.paystack_split_transactions DROP CONSTRAINT IF EXISTS paystack_split_transactions_status_check;
ALTER TABLE public.paystack_split_transactions ADD CONSTRAINT paystack_split_transactions_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'disputed', 'refunded'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'store-provisioning-retry') THEN
    PERFORM cron.unschedule('store-provisioning-retry');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-whatsapp-reports') THEN
    PERFORM cron.unschedule('send-daily-whatsapp-reports');
  END IF;
END $$;

SELECT cron.schedule(
  'send-daily-whatsapp-reports',
  '0 * * * *',
  'SELECT 1'
);

COMMIT;
