-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- Run after 20261030_01, 20261030_02, and 20261030_03.
-- Version 2026103004. Name: flags_staff_affiliates_payments.
--
-- Locks is_admin, is_verified, and kyc_approved_at the same way 01 locks the
-- other platform flags, and writes store_platform_flag_audit when a privileged
-- session changes one.
-- Staff PINs can be created only from an owner session (no active staff
-- role). A staff session expires 12 hours after it starts, and the role is
-- read from staff_members on each check.
-- Affiliate commissions insert once per payment reference. A refund flips
-- pending to refunded once. Owners cannot write the ledger columns.
-- charge.success must be NGN and the exact order amount. A failed order is
-- not fulfilled. Refunds, disputes, and transfer reversals update the order.
-- The inventory retry queue is scheduled. platform_config exists so the
-- WhatsApp reply path has a table to read. Do not put an API key in this file.
-- Do not deploy whatsapp-webhook from this pull request.
--
-- ROLLBACK: see the bottom of this file. Do not restore owner writes of the
-- platform flags or of affiliate earnings.
-- =============================================================================
BEGIN;

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.store_platform_flag_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id uuid,
  actor_role text,
  actor_uid uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_values jsonb,
  new_values jsonb
);
ALTER TABLE public.store_platform_flag_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_platform_flag_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_store_platform_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  privileged boolean := coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin'));
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT privileged THEN
      NEW.kyc_status := 'not_started';
      NEW.frozen := false;
      NEW.frozen_at := NULL;
      NEW.frozen_reason := NULL;
      NEW.frozen_by := NULL;
      NEW.paystack_subaccounts_enabled := false;
      NEW.paystack_subaccount_id := NULL;
      NEW.is_admin := false;
      NEW.is_verified := false;
      NEW.kyc_approved_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  v_old := jsonb_build_object(
    'kyc_status', OLD.kyc_status,
    'frozen', OLD.frozen,
    'frozen_at', OLD.frozen_at,
    'frozen_reason', OLD.frozen_reason,
    'frozen_by', OLD.frozen_by,
    'paystack_subaccounts_enabled', OLD.paystack_subaccounts_enabled,
    'paystack_subaccount_id', OLD.paystack_subaccount_id,
    'is_admin', OLD.is_admin,
    'is_verified', OLD.is_verified,
    'kyc_approved_at', OLD.kyc_approved_at
  );
  v_new := jsonb_build_object(
    'kyc_status', NEW.kyc_status,
    'frozen', NEW.frozen,
    'frozen_at', NEW.frozen_at,
    'frozen_reason', NEW.frozen_reason,
    'frozen_by', NEW.frozen_by,
    'paystack_subaccounts_enabled', NEW.paystack_subaccounts_enabled,
    'paystack_subaccount_id', NEW.paystack_subaccount_id,
    'is_admin', NEW.is_admin,
    'is_verified', NEW.is_verified,
    'kyc_approved_at', NEW.kyc_approved_at
  );

  IF v_old IS NOT DISTINCT FROM v_new THEN
    RETURN NEW;
  END IF;

  IF NOT privileged THEN
    RAISE EXCEPTION 'platform_field_locked' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.store_platform_flag_audit (store_id, actor_role, actor_uid, old_values, new_values)
  VALUES (NEW.id, coalesce(auth.role(), current_user), auth.uid(), v_old, v_new);
  RETURN NEW;
END;
$$;

REVOKE UPDATE (
  is_admin, is_verified, kyc_approved_at
) ON TABLE public.stores FROM PUBLIC, anon, authenticated;

-- Staff sessions expire 12 hours after the PIN is accepted. The live role
-- comes from staff_members, so a downgrade applies to the open session.
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.staff_active_sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.staff_active_sessions
   SET expires_at = started_at + interval '12 hours'
 WHERE expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.acting_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN s.expires_at IS NULL OR s.expires_at <= now() THEN 'expired'
    WHEN coalesce(sm.is_active, true) = false THEN 'expired'
    ELSE coalesce(sm.role, 'expired')
  END
    FROM public.staff_active_sessions AS s
    JOIN public.staff_members AS sm ON sm.id = s.staff_id
   WHERE s.owner_uid = auth.uid()
     AND s.session_id = NULLIF(auth.jwt()->>'session_id', '')::uuid
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.acting_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acting_staff_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.staff_members_owner_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL AND (
    coalesce(auth.role(), '') IN ('', 'service_role')
    OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
  ) THEN
    RETURN NEW;
  END IF;
  IF public.acting_staff_role() IS NOT NULL THEN
    RAISE EXCEPTION 'staff_pin_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_members_owner_only ON public.staff_members;
CREATE TRIGGER staff_members_owner_only
  BEFORE INSERT OR UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.staff_members_owner_only();

CREATE OR REPLACE FUNCTION public.begin_staff_session(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_session uuid := NULLIF(auth.jwt()->>'session_id', '')::uuid;
  v_staff record;
  v_hash text;
  v_attempts int;
  v_locked timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'no_session';
  END IF;
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 8 OR p_pin !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;

  SELECT attempts, locked_until INTO v_attempts, v_locked
    FROM public.staff_pin_attempts
   WHERE owner_uid = auth.uid();
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN jsonb_build_object('error', 'pin_locked');
  END IF;
  IF v_locked IS NOT NULL AND v_locked <= now() THEN
    UPDATE public.staff_pin_attempts
       SET attempts = 0, locked_until = NULL, updated_at = now()
     WHERE owner_uid = auth.uid();
  END IF;

  FOR v_staff IN
    SELECT id, name, role, pin
      FROM public.staff_members
     WHERE store_owner_uid::text = auth.uid()::text
       AND coalesce(is_active, true) = true
       AND pin IS NOT NULL
       AND role IN ('manager', 'cashier')
  LOOP
    v_hash := replace(v_staff.pin, '$2b$', '$2a$');
    IF v_hash ~ '^\$2a\$' AND crypt(p_pin, v_hash) = v_hash THEN
      DELETE FROM public.staff_pin_attempts WHERE owner_uid = auth.uid();
      INSERT INTO public.staff_active_sessions (owner_uid, session_id, staff_id, role, staff_name, expires_at)
      VALUES (
        auth.uid(), v_session, v_staff.id, v_staff.role, coalesce(v_staff.name, 'Staff'),
        now() + interval '12 hours'
      )
      ON CONFLICT (owner_uid, session_id) DO UPDATE
        SET staff_id = EXCLUDED.staff_id,
            role = EXCLUDED.role,
            staff_name = EXCLUDED.staff_name,
            started_at = now(),
            expires_at = now() + interval '12 hours';
      RETURN jsonb_build_object(
        'staff_id', v_staff.id,
        'name', coalesce(v_staff.name, 'Staff'),
        'role', v_staff.role
      );
    END IF;
  END LOOP;

  INSERT INTO public.staff_pin_attempts (owner_uid, attempts, locked_until, updated_at)
  VALUES (auth.uid(), 1, NULL, now())
  ON CONFLICT (owner_uid) DO UPDATE
    SET attempts = public.staff_pin_attempts.attempts + 1,
        locked_until = CASE
          WHEN public.staff_pin_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE NULL
        END,
        updated_at = now()
  RETURNING attempts INTO v_attempts;

  IF v_attempts >= 5 THEN
    RETURN jsonb_build_object('error', 'pin_locked');
  END IF;
  RETURN jsonb_build_object('error', 'invalid_pin');
END;
$$;

REVOKE ALL ON FUNCTION public.begin_staff_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_staff_session(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_acting_staff()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.acting_staff_role();
  v_row public.staff_active_sessions%ROWTYPE;
  v_session uuid := NULLIF(auth.jwt()->>'session_id', '')::uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('role', 'owner');
  END IF;
  SELECT * INTO v_row
    FROM public.staff_active_sessions
   WHERE owner_uid = auth.uid()
     AND session_id = v_session;
  RETURN jsonb_build_object(
    'role', v_role,
    'staff_id', v_row.staff_id,
    'name', v_row.staff_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_acting_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_acting_staff() TO authenticated;

-- Affiliates. payment_reference is text because Paystack references are not
-- subscription UUIDs. One reference, one commission. One pending refund.
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS total_clicks integer DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS total_signups integer DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS total_conversions integer DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS total_earnings_kobo bigint DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS pending_earnings_kobo bigint DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS paid_out_kobo bigint DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS payouts_unlocked boolean DEFAULT false;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.affiliate_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid,
  customer_id uuid,
  customer_email text,
  customer_name text,
  subscription_id uuid,
  plan_name text,
  sale_amount_kobo bigint,
  commission_amount_kobo bigint,
  status text DEFAULT 'pending',
  payment_reference text,
  sale_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliate_sales ADD COLUMN IF NOT EXISTS payment_reference text;
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_sales_payment_reference_uniq
  ON public.affiliate_sales (payment_reference);

CREATE OR REPLACE FUNCTION public.increment_affiliate_conversion(
  p_affiliate_id uuid,
  p_commission_kobo bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_conversions integer;
BEGIN
  UPDATE public.affiliates
     SET total_conversions = coalesce(total_conversions, 0) + 1,
         total_earnings_kobo = coalesce(total_earnings_kobo, 0) + p_commission_kobo,
         pending_earnings_kobo = coalesce(pending_earnings_kobo, 0) + p_commission_kobo,
         updated_at = now()
   WHERE id = p_affiliate_id
  RETURNING total_conversions INTO v_new_conversions;
  IF v_new_conversions >= 2 THEN
    UPDATE public.affiliates SET payouts_unlocked = true WHERE id = p_affiliate_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_affiliate_earnings(
  p_affiliate_id uuid,
  p_amount_kobo bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.affiliates
     SET total_earnings_kobo = coalesce(total_earnings_kobo, 0) - p_amount_kobo,
         pending_earnings_kobo = coalesce(pending_earnings_kobo, 0) - p_amount_kobo,
         total_conversions = GREATEST(coalesce(total_conversions, 0) - 1, 0),
         updated_at = now()
   WHERE id = p_affiliate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_affiliate_conversion(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_affiliate_earnings(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_conversion(uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_affiliate_earnings(uuid, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.record_affiliate_commission(
  p_affiliate_id uuid,
  p_customer_id uuid,
  p_customer_email text,
  p_customer_name text,
  p_reference text,
  p_plan_name text,
  p_sale_amount_kobo bigint,
  p_commission_kobo bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN
    RETURN false;
  END IF;
  INSERT INTO public.affiliate_sales (
    affiliate_id, customer_id, customer_email, customer_name,
    payment_reference, plan_name, sale_amount_kobo, commission_amount_kobo, status
  ) VALUES (
    p_affiliate_id, p_customer_id, p_customer_email, p_customer_name,
    p_reference, left(coalesce(p_plan_name, 'plan'), 80), p_sale_amount_kobo, p_commission_kobo, 'pending'
  )
  ON CONFLICT (payment_reference) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN false;
  END IF;
  PERFORM public.increment_affiliate_conversion(p_affiliate_id, p_commission_kobo);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_affiliate_commission(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale public.affiliate_sales%ROWTYPE;
BEGIN
  UPDATE public.affiliate_sales
     SET status = 'refunded'
   WHERE payment_reference = p_reference
     AND status = 'pending'
  RETURNING * INTO v_sale;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM public.deduct_affiliate_earnings(v_sale.affiliate_id, v_sale.commission_amount_kobo);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_commission(uuid, uuid, text, text, text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_affiliate_commission(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_commission(uuid, uuid, text, text, text, text, bigint, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_affiliate_commission(text) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_affiliate_ledger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  privileged boolean := coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin'));
BEGIN
  IF TG_OP <> 'UPDATE' OR privileged THEN
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
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_affiliate_ledger();

REVOKE UPDATE (
  total_clicks, total_signups, total_conversions,
  total_earnings_kobo, pending_earnings_kobo, paid_out_kobo,
  payouts_unlocked, is_active, affiliate_code
) ON TABLE public.affiliates FROM PUBLIC, anon, authenticated;

-- Webhook money checks. Exact amount and NGN. A failed order is not paid again.
CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference text NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamptz,
  UNIQUE (paystack_reference, event_type)
);

CREATE OR REPLACE FUNCTION public.assess_storefront_charge(
  p_reference text,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount text;
  v_paid bigint;
  v_currency text;
  v_status text;
  v_expected bigint;
BEGIN
  SELECT status, total_amount_kobo
    INTO v_status, v_expected
    FROM public.orders
   WHERE paystack_reference = p_reference
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accept', false, 'error', 'unknown_order');
  END IF;
  IF v_status IS NULL OR v_status NOT IN ('pending', 'paid', 'verified') THEN
    RETURN jsonb_build_object('accept', false, 'error', 'order_not_payable');
  END IF;
  v_currency := upper(coalesce(p_payload #>> '{data,currency}', ''));
  IF v_currency IS DISTINCT FROM 'NGN' THEN
    RETURN jsonb_build_object('accept', false, 'error', 'wrong_currency');
  END IF;
  v_amount := p_payload #>> '{data,amount}';
  IF v_amount IS NULL OR v_amount !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('accept', false, 'error', 'amount_mismatch');
  END IF;
  v_paid := v_amount::bigint;
  IF v_expected IS NULL OR v_paid IS DISTINCT FROM v_expected THEN
    RETURN jsonb_build_object('accept', false, 'error', 'amount_mismatch');
  END IF;
  RETURN jsonb_build_object('accept', true);
END;
$$;

REVOKE ALL ON FUNCTION public.assess_storefront_charge(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assess_storefront_charge(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_successful_payment(
  p_reference text,
  p_event_type text,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gate jsonb;
  v_split RECORD;
  v_inserted_count INT;
  v_order RECORD;
BEGIN
  v_gate := public.assess_storefront_charge(p_reference, p_payload);
  IF coalesce(v_gate->>'accept', 'false') <> 'true' THEN
    RETURN v_gate;
  END IF;

  INSERT INTO public.paystack_webhook_events
    (paystack_reference, event_type, payload, processed_at)
  VALUES
    (p_reference, p_event_type, p_payload, NULL)
  ON CONFLICT (paystack_reference, event_type) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count = 0 THEN
    RETURN jsonb_build_object('already_processed', true, 'accept', true);
  END IF;

  UPDATE public.orders
     SET status = 'paid', paid_at = NOW()
   WHERE paystack_reference = p_reference
     AND status = 'pending';

  UPDATE public.paystack_split_transactions
     SET status = 'success', settled_at = NOW()
   WHERE paystack_reference = p_reference
     AND status = 'pending';

  FOR v_split IN
    SELECT store_id, amount_total_kobo
      FROM public.paystack_split_transactions
     WHERE paystack_reference = p_reference
  LOOP
    PERFORM 1
       FROM public.vendor_velocity_limits
      WHERE store_id = v_split.store_id
      FOR UPDATE;

    UPDATE public.vendor_velocity_limits v
       SET
         current_day_volume_kobo =
           CASE WHEN v.current_day_resets_at <= NOW()
                THEN v_split.amount_total_kobo
                ELSE v.current_day_volume_kobo + v_split.amount_total_kobo
           END,
         current_day_resets_at =
           CASE WHEN v.current_day_resets_at <= NOW()
                THEN ((date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos')
                       + interval '1 day') AT TIME ZONE 'Africa/Lagos')
                ELSE v.current_day_resets_at
           END,
         current_month_volume_kobo =
           CASE WHEN v.current_month_resets_at <= NOW()
                THEN v_split.amount_total_kobo
                ELSE v.current_month_volume_kobo + v_split.amount_total_kobo
           END,
         current_month_resets_at =
           CASE WHEN v.current_month_resets_at <= NOW()
                THEN ((date_trunc('month', NOW() AT TIME ZONE 'Africa/Lagos')
                       + interval '1 month') AT TIME ZONE 'Africa/Lagos')
                ELSE v.current_month_resets_at
           END,
         updated_at = NOW()
     WHERE v.store_id = v_split.store_id;
  END LOOP;

  INSERT INTO public.sales (
    user_id, product_id, product_name, quantity,
    unit_price, total_amount, discount_amount, final_amount,
    customer_name, customer_phone, customer_email,
    payment_method, payment_status,
    amount_paid, amount_due,
    sale_date, sale_time, sale_channel, notes
  )
  SELECT
    s.user_id,
    oi.product_id::text,
    oi.product_name,
    oi.quantity,
    oi.unit_price_kobo,
    oi.total_price_kobo,
    0,
    oi.total_price_kobo,
    o.customer_name, o.customer_phone, o.customer_email,
    'card', 'paid',
    oi.total_price_kobo, 0,
    CURRENT_DATE, CURRENT_TIME, 'online-store',
    'Paystack ref: ' || o.paystack_reference
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.stores s ON s.id = oi.store_id
  WHERE o.paystack_reference = p_reference
    AND o.status = 'paid'
    AND oi.product_id IS NOT NULL;

  FOR v_order IN
    SELECT o.customer_name, o.customer_phone, o.customer_email,
           o.total_amount_kobo, s.user_id
      FROM public.orders o
      JOIN public.stores s ON s.id = o.primary_store_id
     WHERE o.paystack_reference = p_reference
       AND o.status = 'paid'
  LOOP
    PERFORM public.upsert_customer(
      p_user_id := v_order.user_id,
      p_customer_name := v_order.customer_name,
      p_customer_phone := v_order.customer_phone,
      p_customer_email := v_order.customer_email,
      p_order_amount := v_order.total_amount_kobo,
      p_order_date := CURRENT_DATE
    );
  END LOOP;

  UPDATE public.paystack_webhook_events
     SET processed_at = NOW()
   WHERE paystack_reference = p_reference
     AND event_type = p_event_type;

  RETURN jsonb_build_object('ok', true, 'accept', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_successful_payment(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_successful_payment(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_storefront_reversal(
  p_reference text,
  p_event_type text,
  p_payload jsonb,
  p_kind text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted int;
  v_order_ref text;
  v_amount text;
  v_paid bigint;
  v_expected bigint;
  v_item record;
BEGIN
  IF p_kind NOT IN ('refund', 'dispute', 'reversal') THEN
    RAISE EXCEPTION 'bad_kind' USING ERRCODE = '22023';
  END IF;

  v_order_ref := coalesce(
    p_payload #>> '{data,transaction,reference}',
    p_payload #>> '{data,transaction_reference}',
    p_reference
  );

  INSERT INTO public.paystack_webhook_events (paystack_reference, event_type, payload, processed_at)
  VALUES (p_reference, p_event_type, p_payload, NULL)
  ON CONFLICT (paystack_reference, event_type) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true);
  END IF;

  IF p_kind = 'refund' THEN
    SELECT total_amount_kobo INTO v_expected
      FROM public.orders WHERE paystack_reference = v_order_ref LIMIT 1;
    v_amount := p_payload #>> '{data,amount}';
    IF v_amount IS NOT NULL AND v_amount ~ '^[0-9]+$' THEN
      v_paid := v_amount::bigint;
    END IF;
    IF v_paid IS NOT NULL AND v_expected IS NOT NULL AND v_paid < v_expected THEN
      UPDATE public.orders
         SET status = 'partially_refunded'
       WHERE paystack_reference = v_order_ref
         AND status IN ('paid', 'verified', 'disputed');
    ELSE
      UPDATE public.orders
         SET status = 'refunded'
       WHERE paystack_reference = v_order_ref
         AND status IN ('paid', 'verified', 'pending', 'disputed');
      IF EXISTS (
        SELECT 1 FROM public.storefront_fulfillments WHERE paystack_reference = v_order_ref
      ) THEN
        FOR v_item IN
          SELECT oi.product_id, oi.variant_id, oi.quantity, s.user_id::text AS owner_id
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            JOIN public.stores s ON s.id = o.primary_store_id
           WHERE o.paystack_reference = v_order_ref
             AND oi.product_id IS NOT NULL
        LOOP
          UPDATE public.products
             SET quantity = coalesce(quantity, 0) + v_item.quantity
           WHERE id = v_item.product_id
             AND user_id::text = v_item.owner_id;
          IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants
               SET quantity = coalesce(quantity, 0) + v_item.quantity
             WHERE id = v_item.variant_id
               AND product_id = v_item.product_id;
          END IF;
        END LOOP;
        DELETE FROM public.storefront_fulfillments WHERE paystack_reference = v_order_ref;
      END IF;
    END IF;
    UPDATE public.sales
       SET payment_status = 'refunded'
     WHERE notes = 'Paystack ref: ' || v_order_ref
       AND payment_status = 'paid';
  ELSIF p_kind = 'dispute' THEN
    UPDATE public.orders
       SET status = 'disputed'
     WHERE paystack_reference = v_order_ref
       AND status IN ('paid', 'verified', 'pending');
  ELSE
    IF to_regclass('public.paystack_split_transactions') IS NOT NULL THEN
      UPDATE public.paystack_split_transactions
         SET status = 'reversed'
       WHERE paystack_reference = v_order_ref;
    END IF;
    UPDATE public.orders
       SET status = 'reversed'
     WHERE paystack_reference = v_order_ref
       AND status IN ('paid', 'verified');
  END IF;

  UPDATE public.paystack_webhook_events
     SET processed_at = now()
   WHERE paystack_reference = p_reference
     AND event_type = p_event_type;

  RETURN jsonb_build_object('ok', true, 'kind', p_kind, 'order_reference', v_order_ref);
END;
$$;

REVOKE ALL ON FUNCTION public.record_storefront_reversal(text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_storefront_reversal(text, text, jsonb, text) TO service_role;

-- One empty config row. Paul sets api_key in the database, not in git.
CREATE TABLE IF NOT EXISTS public.platform_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_config (id, api_key)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_config FROM PUBLIC, anon, authenticated;

-- Retry stock every two minutes. pg_cron runs this. This file does not
-- install pg_cron on production; Supabase already has it. The CI database
-- stubs cron.schedule so this still applies.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'storefront-inventory-retry') THEN
    PERFORM cron.unschedule('storefront-inventory-retry');
  END IF;
END $$;
SELECT cron.schedule(
  'storefront-inventory-retry',
  '*/2 * * * *',
  $cron$SELECT public.process_storefront_inventory_queue(50)$cron$
);

COMMIT;

-- ROLLBACK (does not restore owner writes of platform flags or affiliate earnings):
--   SELECT cron.unschedule('storefront-inventory-retry');
--   DROP TABLE IF EXISTS public.platform_config;
--   DROP FUNCTION IF EXISTS public.record_storefront_reversal(text, text, jsonb, text);
--   DROP FUNCTION IF EXISTS public.assess_storefront_charge(text, jsonb);
--   DROP FUNCTION IF EXISTS public.record_affiliate_commission(uuid, uuid, text, text, text, text, bigint, bigint);
--   DROP FUNCTION IF EXISTS public.refund_affiliate_commission(text);
--   DROP TRIGGER IF EXISTS affiliates_protect_ledger ON public.affiliates;
--   DROP FUNCTION IF EXISTS public.protect_affiliate_ledger();
--   DROP TRIGGER IF EXISTS staff_members_owner_only ON public.staff_members;
--   DROP FUNCTION IF EXISTS public.staff_members_owner_only();
--   Then re-apply 20261030_01 so protect_store_platform_flags is the previous body,
--   and re-apply 20261025_09 so acting_staff_role and begin_staff_session are the previous bodies.
--   Do not re-apply 20260527 after this file. Re-apply this file to put the amount check back.
--   Stock that a refund restored is not automatically removed by this rollback.
