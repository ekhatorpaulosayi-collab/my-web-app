-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- send-daily-whatsapp-reports and hourly-whatsapp-reports both call
-- net.http_post. Without pg_net those jobs fail. This file installs the
-- extension, then removes the hourly job. The hourly job repeats the daily
-- job. The daily job is left in place. Step 17 is what points that daily
-- job at Vault.
--
-- UNDO: do not recreate hourly-whatsapp-reports. Do not DROP EXTENSION
-- pg_net. Other jobs may use it.
-- =============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'net'
       AND p.proname = 'http_post'
  ) THEN
    RAISE EXCEPTION 'pg_net_http_post_missing' USING ERRCODE = '42883';
  END IF;

  IF to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'cron_missing' USING ERRCODE = '42704';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-whatsapp-reports') THEN
    PERFORM cron.unschedule('hourly-whatsapp-reports');
  END IF;
END
$mig$;

COMMIT;
