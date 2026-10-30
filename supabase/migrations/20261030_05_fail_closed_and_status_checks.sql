-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run after 20261030_04. Version 2026103005. Name: fail_closed_and_status_checks.
--
-- An expired or deactivated staff session stays restricted. It does not become
-- the owner. Dispute and reversal statuses are allowed on orders and splits.
-- Affiliate inserts cannot carry a forged balance. A refund cancels queued
-- stock. A successful charge on a closed order writes an operator alert.
-- Inventory retry waits grow exponentially. Dead rows are visible to the
-- reviewer. The daily report job fails when a vault secret is missing.
--
-- ROLLBACK is at the bottom. Do not restore cashier-only predicates: those
-- let an expired session read and delete sales.
-- =============================================================================
BEGIN;

-- Staff: only an owner session (NULL) or a live manager keeps money access.
-- 'expired' and any other role fail closed.
CREATE OR REPLACE FUNCTION public.reject_cashier_discount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.acting_staff_role() IS NOT NULL
     AND public.acting_staff_role() IS DISTINCT FROM 'manager'
     AND COALESCE(NEW.discount_amount, 0) <> 0 THEN
    RAISE EXCEPTION 'cashier_discount_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'sales'
  ) THEN
    EXECUTE 'ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_read ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_read ON public.sales AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_write ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_write ON public.sales AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'') WITH CHECK (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
    EXECUTE 'DROP POLICY IF EXISTS sales_cashier_no_delete ON public.sales';
    EXECUTE 'CREATE POLICY sales_cashier_no_delete ON public.sales AS RESTRICTIVE FOR DELETE TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'customers'
  ) THEN
    EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS customers_cashier_no_read ON public.customers';
    EXECUTE 'CREATE POLICY customers_cashier_no_read ON public.customers AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'expenses'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS expenses_cashier_no_read ON public.expenses';
    EXECUTE 'CREATE POLICY expenses_cashier_no_read ON public.expenses AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'invoices'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS invoices_cashier_no_read ON public.invoices';
    EXECUTE 'CREATE POLICY invoices_cashier_no_read ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS products_cashier_no_insert ON public.products';
    EXECUTE 'CREATE POLICY products_cashier_no_insert ON public.products AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.acting_staff_role() IS NULL OR public.acting_staff_role() = ''manager'')';
  END IF;
END $$;

-- Live checks reject disputed and reversed. Widen them. Names differ between
-- environments, so drop every status check on these two tables and add one.
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    FOR r IN
      SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'orders'
         AND con.contype = 'c'
         AND pg_get_constraintdef(con.oid) ILIKE '%pending%'
         AND pg_get_constraintdef(con.oid) ILIKE '%paid%'
    LOOP
      EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', r.conname);
    END LOOP;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'reversed'));
  END IF;

  IF to_regclass('public.paystack_split_transactions') IS NOT NULL THEN
    FOR r IN
      SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'paystack_split_transactions'
         AND con.contype = 'c'
         AND pg_get_constraintdef(con.oid) ILIKE '%success%'
         AND pg_get_constraintdef(con.oid) NOT ILIKE '%amount_total_kobo%'
    LOOP
      EXECUTE format('ALTER TABLE public.paystack_split_transactions DROP CONSTRAINT %I', r.conname);
    END LOOP;
    ALTER TABLE public.paystack_split_transactions ADD CONSTRAINT paystack_split_transactions_status_check
      CHECK (status IN ('pending', 'success', 'failed', 'disputed', 'refunded', 'reversed'));
  END IF;
END $$;

-- Owner inserts cannot arrive with a balance or unlocked payouts.
CREATE OR REPLACE FUNCTION public.protect_affiliate_ledger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  privileged boolean := coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin'));
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT privileged THEN
      NEW.total_clicks := 0;
      NEW.total_signups := 0;
      NEW.total_conversions := 0;
      NEW.total_earnings_kobo := 0;
      NEW.pending_earnings_kobo := 0;
      NEW.paid_out_kobo := 0;
      NEW.payouts_unlocked := false;
    END IF;
    RETURN NEW;
  END IF;
  IF privileged THEN
    RETURN NEW;
  END IF;
  IF NEW.total_clicks IS DISTINCT FROM OLD.total_clicks
     OR NEW.total_signups IS DISTINCT FROM OLD.total_signups
     OR NEW.total_conversions IS DISTINCT FROM OLD.total_conversions
     OR NEW.total_earnings_kobo IS DISTINCT FROM OLD.total_earnings_kobo
     OR NEW.pending_earnings_kobo IS DISTINCT FROM OLD.pending_earnings_kobo
     OR NEW.paid_out_kobo IS DISTINCT FROM OLD.paid_out_kobo
     OR NEW.payouts_unlocked IS DISTINCT FROM OLD.payouts_unlocked
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code THEN
    RAISE EXCEPTION 'affiliate_ledger_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliates_protect_ledger ON public.affiliates;
CREATE TRIGGER affiliates_protect_ledger
  BEFORE INSERT OR UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_affiliate_ledger();

-- Closed orders must not be decremented by a queue row that is still waiting.
CREATE OR REPLACE FUNCTION public.apply_storefront_inventory(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted int;
  v_count int;
  v_item record;
  v_notes text;
  v_notes_json jsonb;
  v_promo jsonb;
  v_status text;
BEGIN
  IF p_reference IS NULL OR length(p_reference) < 6 THEN
    RAISE EXCEPTION 'bad reference';
  END IF;

  SELECT status INTO v_status
    FROM public.orders
   WHERE paystack_reference = p_reference
   FOR UPDATE;
  IF v_status IN ('refunded', 'partially_refunded', 'disputed', 'reversed', 'failed') THEN
    DELETE FROM public.storefront_inventory_queue WHERE paystack_reference = p_reference;
    RETURN jsonb_build_object('skipped', 'order_closed', 'status', v_status);
  END IF;

  SELECT count(*)
    INTO v_count
    FROM public.order_items AS oi
    JOIN public.orders AS o ON o.id = oi.order_id
    JOIN public.stores AS s ON s.id = o.primary_store_id
    JOIN public.products AS p ON p.id = oi.product_id
   WHERE o.paystack_reference = p_reference
     AND oi.store_id = o.primary_store_id
     AND p.user_id::text = s.user_id::text;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'missing_order_lines' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.storefront_fulfillments (paystack_reference)
  VALUES (p_reference)
  ON CONFLICT (paystack_reference) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('already_applied', true);
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.variant_id, oi.quantity, s.user_id::text AS owner_id
      FROM public.order_items AS oi
      JOIN public.orders AS o ON o.id = oi.order_id
      JOIN public.stores AS s ON s.id = o.primary_store_id
      JOIN public.products AS p ON p.id = oi.product_id
     WHERE o.paystack_reference = p_reference
       AND oi.store_id = o.primary_store_id
       AND p.user_id::text = s.user_id::text
  LOOP
    PERFORM public.decrement_owned_lines(
      v_item.owner_id,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_item.product_id,
        'variant_id', v_item.variant_id,
        'quantity', v_item.quantity
      ))
    );
  END LOOP;

  SELECT o.notes INTO v_notes
    FROM public.orders o
   WHERE o.paystack_reference = p_reference
   LIMIT 1;
  IF v_notes IS NOT NULL AND left(btrim(v_notes), 1) = '{' THEN
    v_notes_json := v_notes::jsonb;
  END IF;
  v_promo := v_notes_json -> 'promo';
  IF v_promo IS NOT NULL AND jsonb_typeof(v_promo) = 'object' AND (v_promo ->> 'promo_code_id') IS NOT NULL THEN
    UPDATE public.promo_codes
       SET used_count = coalesce(used_count, 0) + 1
     WHERE id = (v_promo ->> 'promo_code_id')::uuid
       AND EXISTS (
         SELECT 1
           FROM public.orders o
           JOIN public.stores s ON s.id = o.primary_store_id
          WHERE o.paystack_reference = p_reference
            AND s.user_id::text = public.promo_codes.user_id::text
       );
  END IF;

  RETURN jsonb_build_object('ok', true, 'lines', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_storefront_inventory(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_storefront_inventory(text) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_queued_stock_on_close()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('refunded', 'partially_refunded', 'disputed', 'reversed', 'failed')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    DELETE FROM public.storefront_inventory_queue
     WHERE paystack_reference = NEW.paystack_reference;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_cancel_queued_stock ON public.orders;
CREATE TRIGGER orders_cancel_queued_stock
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_queued_stock_on_close();

CREATE TABLE IF NOT EXISTS public.operator_reviewers (
  user_id uuid PRIMARY KEY
);
INSERT INTO public.operator_reviewers (user_id)
VALUES ('dffba89b-869d-422a-a542-2e2494850b44')
ON CONFLICT (user_id) DO NOTHING;
ALTER TABLE public.operator_reviewers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_reviewers FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS operator_reviewers_self ON public.operator_reviewers;
CREATE POLICY operator_reviewers_self ON public.operator_reviewers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT ON public.operator_reviewers TO authenticated;

CREATE TABLE IF NOT EXISTS public.operator_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL,
  paystack_reference text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS operator_alerts_open_ref
  ON public.operator_alerts (kind, paystack_reference)
  WHERE seen_at IS NULL AND paystack_reference IS NOT NULL;
ALTER TABLE public.operator_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_alerts FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS operator_alerts_reviewer ON public.operator_alerts;
CREATE POLICY operator_alerts_reviewer ON public.operator_alerts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operator_reviewers r WHERE r.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS operator_alerts_reviewer_seen ON public.operator_alerts;
CREATE POLICY operator_alerts_reviewer_seen ON public.operator_alerts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operator_reviewers r WHERE r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.operator_reviewers r WHERE r.user_id = auth.uid()
  ));
GRANT SELECT, UPDATE ON public.operator_alerts TO authenticated;

CREATE OR REPLACE FUNCTION public.note_storefront_payment_alert(
  p_reference text,
  p_kind text,
  p_message text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.operator_alerts (kind, paystack_reference, message)
  VALUES (left(coalesce(p_kind, 'payment'), 40), p_reference, left(coalesce(p_message, ''), 500))
  ON CONFLICT (kind, paystack_reference) WHERE seen_at IS NULL AND paystack_reference IS NOT NULL DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.note_storefront_payment_alert(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.note_storefront_payment_alert(text, text, text) TO service_role;

-- Legacy checkout claims the fulfillment and decrements in one transaction.
-- A stock failure rolls the claim back, so a retry can still decrement.
CREATE OR REPLACE FUNCTION public.fulfill_legacy_storefront_lines(
  p_reference text,
  p_owner text,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.storefront_fulfillments (paystack_reference)
  VALUES (p_reference);
  PERFORM public.decrement_owned_lines(p_owner, p_lines);
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_legacy_storefront_lines(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_legacy_storefront_lines(text, text, jsonb) TO service_role;

-- Exponential wait: 2, 4, 8, ... minutes, capped at 64, plus a stable jitter.
CREATE OR REPLACE FUNCTION public.process_storefront_inventory_queue(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  v_ok int := 0;
  v_fail int := 0;
  v_attempts int;
  v_err text;
  v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT q.paystack_reference
      FROM public.storefront_inventory_queue q
     WHERE q.dead_at IS NULL
       AND q.updated_at <= now() - (
         make_interval(mins => LEAST(power(2, LEAST(GREATEST(q.attempts, 1), 6))::int, 64))
         + make_interval(secs => (abs(hashtext(q.paystack_reference)) % 30))
       )
     ORDER BY q.updated_at
     LIMIT v_limit
     FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.apply_storefront_inventory(r.paystack_reference);
      DELETE FROM public.storefront_inventory_queue
       WHERE paystack_reference = r.paystack_reference;
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      UPDATE public.storefront_inventory_queue
         SET attempts = attempts + 1,
             last_error = left(v_err, 500),
             updated_at = now(),
             dead_at = CASE WHEN attempts + 1 >= 8 THEN now() ELSE NULL END
       WHERE paystack_reference = r.paystack_reference
       RETURNING attempts INTO v_attempts;
      v_fail := v_fail + 1;
      IF v_attempts >= 2 AND NOT EXISTS (
        SELECT 1
          FROM public.storefront_inventory_alerts a
         WHERE a.paystack_reference = r.paystack_reference
           AND a.created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.storefront_inventory_alerts (paystack_reference, attempts, last_error)
        VALUES (r.paystack_reference, v_attempts, left(v_err, 500));
      END IF;
      IF v_attempts >= 8 THEN
        INSERT INTO public.operator_alerts (kind, paystack_reference, message)
        VALUES ('inventory_dead', r.paystack_reference, left(coalesce(v_err, 'inventory_dead'), 500))
        ON CONFLICT (kind, paystack_reference) WHERE seen_at IS NULL AND paystack_reference IS NOT NULL DO NOTHING;
        PERFORM pg_notify('storefront_inventory_dead', r.paystack_reference);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('applied', v_ok, 'failed', v_fail);
END;
$$;

REVOKE ALL ON FUNCTION public.process_storefront_inventory_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_storefront_inventory_queue(integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.store_provisioning (
  store_id uuid PRIMARY KEY,
  subdomain text NOT NULL,
  status text NOT NULL,
  http_status integer,
  detail text,
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz
);
ALTER TABLE public.store_provisioning ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE public.store_provisioning DROP CONSTRAINT IF EXISTS store_provisioning_status_check;
ALTER TABLE public.store_provisioning ADD CONSTRAINT store_provisioning_status_check
  CHECK (status IN ('pending', 'active', 'retryable_failure', 'blocked'));
ALTER TABLE public.store_provisioning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_provisioning FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS store_provisioning_owner ON public.store_provisioning;
CREATE POLICY store_provisioning_owner ON public.store_provisioning
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
       WHERE s.id = store_provisioning.store_id
         AND s.user_id = auth.uid()::text
    )
  );
GRANT SELECT ON public.store_provisioning TO authenticated;

CREATE OR REPLACE FUNCTION public.record_store_provisioning(
  p_store_id uuid,
  p_subdomain text,
  p_status text,
  p_http_status integer,
  p_detail text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('pending', 'active', 'retryable_failure', 'blocked') THEN
    RAISE EXCEPTION 'bad_provision_status' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.store_provisioning (
    store_id, subdomain, status, http_status, detail, attempts, updated_at, next_retry_at
  )
  VALUES (
    p_store_id,
    p_subdomain,
    p_status,
    p_http_status,
    left(coalesce(p_detail, ''), 300),
    1,
    now(),
    CASE
      WHEN p_status IN ('pending', 'retryable_failure') THEN now() + interval '5 minutes'
      ELSE NULL
    END
  )
  ON CONFLICT (store_id) DO UPDATE
    SET subdomain = EXCLUDED.subdomain,
        status = EXCLUDED.status,
        http_status = EXCLUDED.http_status,
        detail = EXCLUDED.detail,
        attempts = public.store_provisioning.attempts + 1,
        updated_at = now(),
        next_retry_at = CASE
          WHEN EXCLUDED.status IN ('active', 'blocked') THEN NULL
          WHEN public.store_provisioning.attempts + 1 >= 8 THEN NULL
          ELSE now() + make_interval(mins => LEAST(power(2, LEAST(public.store_provisioning.attempts + 1, 6))::int, 64))
        END;
  IF p_status = 'retryable_failure' THEN
    INSERT INTO public.operator_alerts (kind, message)
    VALUES (
      'provisioning',
      left(coalesce(p_subdomain, '') || ' ' || coalesce(p_status, '') || ' ' || coalesce(p_detail, ''), 500)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_store_provisioning(uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_store_provisioning(uuid, text, text, integer, text) TO service_role;

-- Rows the retry worker should attempt. Blocked and active rows stay put.
CREATE OR REPLACE FUNCTION public.claim_store_provisioning_retries(p_limit integer DEFAULT 20)
RETURNS SETOF public.store_provisioning
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT *
    FROM public.store_provisioning
   WHERE status IN ('pending', 'retryable_failure')
     AND attempts < 8
     AND (next_retry_at IS NULL OR next_retry_at <= now())
   ORDER BY updated_at
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
END;
$$;

REVOKE ALL ON FUNCTION public.claim_store_provisioning_retries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_provisioning_retries(integer) TO service_role;

-- Daily report stays hourly. send-daily-reports sends only when the Nigerian
-- hour matches each shop's deliveryTime. A 06:00 job would skip a shop set
-- to 23:00. A missing job, or that once-a-day value, becomes 0 * * * *.
-- Any other existing cadence is kept. A missing vault secret fails the job.
DO $cron$
DECLARE
  v_schedule text;
BEGIN
  SELECT j.schedule INTO v_schedule
    FROM cron.job AS j
   WHERE j.jobname = 'send-daily-whatsapp-reports';
  IF v_schedule IS NULL OR btrim(v_schedule) = '' OR v_schedule = '0 6 * * *' THEN
    v_schedule := '0 * * * *';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-whatsapp-reports') THEN
    PERFORM cron.unschedule('send-daily-whatsapp-reports');
  END IF;
  PERFORM cron.schedule(
    'send-daily-whatsapp-reports',
    v_schedule,
    $cmd$
    DO $job$
    DECLARE
      v_key text;
      v_cron text;
    BEGIN
      SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets WHERE name = 'service_role_key';
      SELECT decrypted_secret INTO v_cron
        FROM vault.decrypted_secrets WHERE name = 'cron_secret';
      IF v_key IS NULL OR length(v_key) < 20 OR v_cron IS NULL OR length(v_cron) < 8 THEN
        RAISE EXCEPTION 'cron_secret_missing' USING ERRCODE = '23514';
      END IF;
      PERFORM net.http_post(
        url := 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/send-daily-reports',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key,
          'x-cron-secret', v_cron
        ),
        body := '{}'::jsonb
      );
    END
    $job$;
    $cmd$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'store-provisioning-retry') THEN
    PERFORM cron.unschedule('store-provisioning-retry');
  END IF;
  PERFORM cron.schedule(
    'store-provisioning-retry',
    '*/15 * * * *',
    $pcmd$
      DO $job$
      DECLARE
        v_key text;
        v_cron text;
      BEGIN
        SELECT decrypted_secret INTO v_key
          FROM vault.decrypted_secrets WHERE name = 'service_role_key';
        SELECT decrypted_secret INTO v_cron
          FROM vault.decrypted_secrets WHERE name = 'cron_secret';
        IF v_key IS NULL OR length(v_key) < 20 OR v_cron IS NULL OR length(v_cron) < 8 THEN
          RAISE EXCEPTION 'cron_secret_missing' USING ERRCODE = '23514';
        END IF;
        PERFORM net.http_post(
          url := 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/retry-store-provisioning',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key,
            'x-cron-secret', v_cron
          ),
          body := '{}'::jsonb
        );
      END
      $job$;
    $pcmd$
  );
END
$cron$;

COMMIT;

-- ROLLBACK is scripts/rollback-20261030-05.sql. It drops the objects this
-- file adds, restores the narrower status checks, and puts the hourly report
-- job back so 20261025_15 can find it. Do not re-apply 20261025_09 in order
-- to undo staff checks: 09 keeps 04's staff functions when expires_at is
-- already there. Re-apply 20261030_02 and 20261030_03 for the previous
-- inventory bodies, then 20261025_15 for the vault command on the hourly job.
-- Skip this rollback if any order is already disputed or reversed.
