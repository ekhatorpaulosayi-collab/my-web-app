-- Local checks for record_sale prices. Not for the live database.
-- Run after scripts/record-sale-proof.sql and 20261025_12_record_sale.sql.
-- Expects auth.uid() = 11111111-1111-1111-1111-111111111111.
BEGIN;

CREATE OR REPLACE FUNCTION public.acting_staff_role() RETURNS text
LANGUAGE sql AS $$
  SELECT NULLIF(current_setting('storehouse.staff_role', true), '')
$$;

INSERT INTO public.products (id, user_id, quantity, selling_price, discount_price, cost_price)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  50, 5000, 4000, 3000
);

INSERT INTO public.stores (user_id, allow_staff_price_change)
VALUES ('11111111-1111-1111-1111-111111111111', false);

-- Owner may record a price that is not the catalogue price.
SELECT set_config('storehouse.staff_role', '', false);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 1000::bigint
);

-- Manager may too.
SELECT set_config('storehouse.staff_role', 'manager', false);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 1000::bigint
);

-- Cashier, setting off: catalogue price and the discount price.
SELECT set_config('storehouse.staff_role', 'cashier', false);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 5000::bigint
);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 4000::bigint
);

DO $$
BEGIN
  PERFORM public.record_sale(
    '22222222-2222-2222-2222-222222222222', 'Soap', 1, 4500::bigint
  );
  RAISE EXCEPTION 'expected price_mismatch';
EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE '%price_mismatch%' THEN
    RAISE;
  END IF;
END $$;

-- A cashier who changes the switch gets an explicit error. The flag stays false.
DO $$
BEGIN
  UPDATE public.stores SET allow_staff_price_change = true
   WHERE user_id = '11111111-1111-1111-1111-111111111111';
  RAISE EXCEPTION 'expected staff_price_setting_locked';
EXCEPTION WHEN insufficient_privilege THEN
  IF SQLERRM NOT LIKE '%staff_price_setting_locked%' THEN
    RAISE;
  END IF;
END $$;

-- Updating another column and leaving the switch alone still succeeds.
UPDATE public.stores SET created_at = now()
 WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- A cashier insert that tries to turn the switch on raises the same error.
DO $$
BEGIN
  INSERT INTO public.stores (user_id, allow_staff_price_change)
  VALUES ('11111111-1111-1111-1111-111111111112', true);
  RAISE EXCEPTION 'expected staff_price_setting_locked on insert';
EXCEPTION WHEN insufficient_privilege THEN
  IF SQLERRM NOT LIKE '%staff_price_setting_locked%' THEN
    RAISE;
  END IF;
END $$;

DO $$
DECLARE v boolean;
BEGIN
  SELECT allow_staff_price_change INTO v
    FROM public.stores
   WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'cashier changed allow_staff_price_change';
  END IF;
END $$;

-- The owner can.
SELECT set_config('storehouse.staff_role', '', false);
UPDATE public.stores SET allow_staff_price_change = true
 WHERE user_id = '11111111-1111-1111-1111-111111111111';

SELECT set_config('storehouse.staff_role', 'cashier', false);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 3000::bigint
);
SELECT public.record_sale(
  '22222222-2222-2222-2222-222222222222', 'Soap', 1, 4500::bigint
);

DO $$
BEGIN
  PERFORM public.record_sale(
    '22222222-2222-2222-2222-222222222222', 'Soap', 1, 2999::bigint
  );
  RAISE EXCEPTION 'expected price_below_cost';
EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE '%price_below_cost%' THEN
    RAISE;
  END IF;
END $$;

DO $$
DECLARE v_qty integer;
BEGIN
  SELECT quantity INTO v_qty
    FROM public.products
   WHERE id = '22222222-2222-2222-2222-222222222222';
  IF v_qty IS DISTINCT FROM 44 THEN
    RAISE EXCEPTION 'stock is %, expected 44', v_qty;
  END IF;
END $$;

COMMIT;
