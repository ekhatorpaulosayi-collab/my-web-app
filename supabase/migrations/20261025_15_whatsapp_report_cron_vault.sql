-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- The live pg_cron job send-daily-whatsapp-reports calls send-daily-reports
-- with the old service-role key written into the command. This file keeps
-- that job's schedule and replaces the command. At run time the command
-- reads Vault. The key is not stored in cron.job and is not written here.
--
-- BEFORE YOU RUN THIS FILE, create two Vault secrets yourself. Do not put
-- the values in this file, a ticket, or a screenshot.
--   service_role_key  the new service-role key (not the leaked legacy JWT)
--   cron_secret       the same string as the edge secret CRON_SECRET
-- Confirm names only:
--   SELECT name FROM vault.decrypted_secrets
--    WHERE name IN ('service_role_key', 'cron_secret');
-- Do not select decrypted_secret on a shared screen.
--
-- The file stops if either secret is missing or too short, or if the job
-- is missing. It does not invent a schedule. It does not change
-- hourly-whatsapp-reports.
--
-- The send-daily-reports function still requires header x-cron-secret.
-- The bearer is what the Supabase gateway checks. Both come from Vault
-- when the job runs, so a later vault update rotates them without another
-- migration.
--
-- ROLLBACK does not put the old command back (that command had the key):
--   SELECT cron.unschedule('send-daily-whatsapp-reports');
-- =============================================================================
BEGIN;

DO $mig$
DECLARE
  v_schedule text;
  v_key_len integer;
  v_cron_len integer;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'vault_missing' USING ERRCODE = '42704';
  END IF;
  IF to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'cron_missing' USING ERRCODE = '42704';
  END IF;

  SELECT length(s.decrypted_secret) INTO v_key_len
    FROM vault.decrypted_secrets AS s
   WHERE s.name = 'service_role_key';
  IF v_key_len IS NULL OR v_key_len < 20 THEN
    RAISE EXCEPTION 'service_role_key_missing' USING ERRCODE = '23514';
  END IF;

  SELECT length(s.decrypted_secret) INTO v_cron_len
    FROM vault.decrypted_secrets AS s
   WHERE s.name = 'cron_secret';
  IF v_cron_len IS NULL OR v_cron_len < 16 THEN
    RAISE EXCEPTION 'cron_secret_missing' USING ERRCODE = '23514';
  END IF;

  SELECT j.schedule INTO v_schedule
    FROM cron.job AS j
   WHERE j.jobname = 'send-daily-whatsapp-reports';
  IF v_schedule IS NULL OR btrim(v_schedule) = '' THEN
    RAISE EXCEPTION 'whatsapp_report_job_missing' USING ERRCODE = '23514';
  END IF;

  PERFORM cron.unschedule('send-daily-whatsapp-reports');

  PERFORM cron.schedule(
    'send-daily-whatsapp-reports',
    v_schedule,
    $cmd$
      SELECT net.http_post(
        url := 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/send-daily-reports',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
              FROM vault.decrypted_secrets
             WHERE name = 'service_role_key'
          ),
          'x-cron-secret', (
            SELECT decrypted_secret
              FROM vault.decrypted_secrets
             WHERE name = 'cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $cmd$
  );
END
$mig$;

COMMIT;
