-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- Step 21a. Run this BEFORE step 21 (20261025_19_public_store_columns.sql).
--
-- Step 21 stops anon from reading stores.bank_name, account_number, and
-- account_name. Checkout reads payment_methods. This file copies a legacy
-- bank row into payment_methods first, so a shopper still sees the transfer
-- account after step 21.
--
-- DRY RUN. This SELECT changes nothing. Run it before the UPDATE below.
-- If it returns no rows, skip this file and go to step 21.
--
-- SELECT s.id, s.store_slug, s.bank_name, s.account_number, s.account_name
--   FROM public.stores AS s
--  WHERE (
--          nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
--       OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
--       OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL
--        )
--    AND (
--          s.payment_methods IS NULL
--       OR jsonb_typeof(s.payment_methods) = 'array'
--        )
--    AND NOT EXISTS (
--          SELECT 1
--            FROM jsonb_array_elements(
--              CASE
--                WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
--                ELSE '[]'::jsonb
--              END
--            ) AS method
--           WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
--        );
--
-- Idempotent. A second run matches no rows. A store that already has a
-- bank-transfer method is left as it is. Rows whose payment_methods value
-- is not an array are not rewritten.
--
-- Order. This file is safe before or after step 21b. When the stores
-- columns are already null, the first UPDATE matches nothing. The block
-- after it copies from store_bank_details when that table exists, and
-- still skips a store that already has a bank-transfer method.
--
-- ROLLBACK. Removes only the object this file added (id legacy-<store id>).
--   UPDATE public.stores AS s
--      SET payment_methods = (
--        SELECT coalesce(jsonb_agg(method), '[]'::jsonb)
--          FROM jsonb_array_elements(
--            CASE WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods ELSE '[]'::jsonb END
--          ) AS method
--         WHERE method->>'id' IS DISTINCT FROM ('legacy-' || s.id::text)
--      )
--    WHERE jsonb_typeof(s.payment_methods) = 'array'
--      AND s.payment_methods::text LIKE '%"legacy-' || s.id::text || '"%';
-- =============================================================================
BEGIN;

UPDATE public.stores AS s
   SET payment_methods =
     CASE
       WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
       ELSE '[]'::jsonb
     END
     || jsonb_build_array(
          jsonb_strip_nulls(jsonb_build_object(
            'id', 'legacy-' || s.id::text,
            'type', 'bank',
            'enabled', true,
            'label', 'Bank Transfer',
            'bank_name', nullif(btrim(coalesce(s.bank_name, '')), ''),
            'account_number', nullif(btrim(coalesce(s.account_number, '')), ''),
            'account_name', nullif(btrim(coalesce(s.account_name, '')), '')
          ))
        )
 WHERE (
         nullif(btrim(coalesce(s.bank_name, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(s.account_number, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(s.account_name, '')), '') IS NOT NULL
       )
   AND (
         s.payment_methods IS NULL
      OR jsonb_typeof(s.payment_methods) = 'array'
       )
   AND NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements(
             CASE
               WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
               ELSE '[]'::jsonb
             END
           ) AS method
          WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
       );

-- Step 21b may already have cleared the stores columns. Copy from the
-- owner table in that case. A store that already has a transfer method
-- is left alone, so a newer payment_methods entry is not replaced.
DO $$
BEGIN
  IF to_regclass('public.store_bank_details') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.stores AS s
     SET payment_methods =
       CASE
         WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
         ELSE '[]'::jsonb
       END
       || jsonb_build_array(
            jsonb_strip_nulls(jsonb_build_object(
              'id', 'legacy-' || s.id::text,
              'type', 'bank',
              'enabled', true,
              'label', 'Bank Transfer',
              'bank_name', nullif(btrim(coalesce(b.bank_name, '')), ''),
              'account_number', nullif(btrim(coalesce(b.account_number, '')), ''),
              'account_name', nullif(btrim(coalesce(b.account_name, '')), '')
            ))
          )
    FROM public.store_bank_details AS b
   WHERE b.store_id = s.id
     AND (
           nullif(btrim(coalesce(b.bank_name, '')), '') IS NOT NULL
        OR nullif(btrim(coalesce(b.account_number, '')), '') IS NOT NULL
        OR nullif(btrim(coalesce(b.account_name, '')), '') IS NOT NULL
         )
     AND (
           s.payment_methods IS NULL
        OR jsonb_typeof(s.payment_methods) = 'array'
         )
     AND NOT EXISTS (
           SELECT 1
             FROM jsonb_array_elements(
               CASE
                 WHEN jsonb_typeof(s.payment_methods) = 'array' THEN s.payment_methods
                 ELSE '[]'::jsonb
               END
             ) AS method
            WHERE lower(coalesce(method->>'type', '')) IN ('bank', 'bank-transfer', 'bank_transfer')
         );
END $$;

COMMIT;
