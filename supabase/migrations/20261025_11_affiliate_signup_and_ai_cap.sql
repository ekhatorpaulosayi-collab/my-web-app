-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
-- 1. One signup attribution per customer. mark_signup can be called many times;
--    total_signups moves only on the first insert.
-- 2. Global AI chat spend counter. The ai-chat function calls
--    reserve_ai_chat_spend before each OpenAI request. Service role only.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.attribute_affiliate_signup(uuid, uuid);
--   DROP TABLE IF EXISTS public.affiliate_attributions;
--   DROP FUNCTION IF EXISTS public.reserve_ai_chat_spend(numeric, numeric);
--   DROP TABLE IF EXISTS public.ai_chat_daily_spend;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
  customer_id uuid PRIMARY KEY,
  affiliate_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_attributions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.attribute_affiliate_signup(
  p_affiliate_id uuid,
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted int;
BEGIN
  IF p_affiliate_id IS NULL OR p_customer_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.affiliates WHERE id = p_affiliate_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.affiliate_attributions (customer_id, affiliate_id)
  VALUES (p_customer_id, p_affiliate_id)
  ON CONFLICT (customer_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.affiliates
     SET total_signups = coalesce(total_signups, 0) + 1,
         updated_at = now()
   WHERE id = p_affiliate_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_affiliate_signup(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_affiliate_signup(uuid, uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.ai_chat_daily_spend (
  day date PRIMARY KEY,
  estimated_usd numeric NOT NULL DEFAULT 0,
  calls integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_daily_spend ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_chat_daily_spend FROM PUBLIC, anon, authenticated;

-- Reserves p_usd against today's Lagos spend. Returns false when the cap
-- would be crossed. Until this function exists, ai-chat does not call
-- OpenAI (the edge function fails closed on a missing RPC).
CREATE OR REPLACE FUNCTION public.reserve_ai_chat_spend(p_usd numeric, p_cap numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  v_usd numeric := GREATEST(coalesce(p_usd, 0), 0);
  v_cap numeric := coalesce(p_cap, 20);
  v_row public.ai_chat_daily_spend%ROWTYPE;
BEGIN
  IF v_usd <= 0 THEN
    RETURN true;
  END IF;

  INSERT INTO public.ai_chat_daily_spend (day, estimated_usd, calls)
  VALUES (v_day, 0, 0)
  ON CONFLICT (day) DO NOTHING;

  SELECT * INTO v_row
    FROM public.ai_chat_daily_spend
   WHERE day = v_day
   FOR UPDATE;

  IF v_row.estimated_usd + v_usd > v_cap THEN
    RETURN false;
  END IF;

  UPDATE public.ai_chat_daily_spend
     SET estimated_usd = estimated_usd + v_usd,
         calls = calls + 1,
         updated_at = now()
   WHERE day = v_day;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_chat_spend(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_chat_spend(numeric, numeric) TO service_role;

COMMIT;
