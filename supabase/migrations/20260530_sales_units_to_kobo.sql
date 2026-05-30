-- Convert mixed-unit sales money columns to consistent kobo.
-- Spec: chat history Phase 1 + Phase 1.5 (Session 9 carry-forward).
--
-- Background: 21 of 55 rows written in naira by App.jsx:3091
--   (handleSaveSale online path). 34 rows already in kobo
--   (syncOfflineSales offline-replay path). Same product, same
--   table, different units depending on online/offline state at
--   sale time.
-- Classifier: sales.unit_price * 100 = products.selling_price
--   (with cast products.id::text = sales.product_id — sales.product_id
--   is text, products.id is uuid; a separate latent FK shape issue).
-- Safety: full row image of affected rows saved to
--   public.sales_units_backup_20260530 before any UPDATE. Fails
--   loud on any null-join (current expected: 0) and on any
--   classified-count drift from 21.
-- Affects 4 money columns per naira row: unit_price, total_amount,
--   final_amount, amount_paid. discount_amount + amount_due stay
--   untouched (both 0 in current data; 0×100=0 is a no-op, but
--   explicit skipping avoids surprising future-non-zero rows).
-- After backfill: matview daily_sales_summary refreshed (aggregates
--   sum(total_amount), which has shifted by ×100 on 21 rows).
-- Transaction scope: this migration deviates from the codebase convention
--   of letting psql autocommit per statement. The TEMP TABLEs at steps 1
--   and 2 use ON COMMIT DROP and are referenced by later steps, so all
--   statements must share one transaction or the temp tables vanish
--   between statements. The all-or-nothing semantics also match the
--   safety model: backup → UPDATE → verify must commit or rollback as
--   a unit so a partial run can never leave the table in a mid-converted
--   state. Hence the explicit BEGIN/COMMIT wrapper below.

BEGIN;

-- Step 1: Snapshot products.selling_price into a temp table so the
-- classification uses a frozen view of product prices for the
-- duration of this txn.
CREATE TEMP TABLE products_snapshot ON COMMIT DROP AS
SELECT id, selling_price FROM products;

-- Step 2: Classify naira rows into a temp table. Join cast required.
CREATE TEMP TABLE naira_rows ON COMMIT DROP AS
SELECT s.id, s.product_id, s.unit_price, s.total_amount,
       s.final_amount, s.amount_paid, p.selling_price
FROM sales s
LEFT JOIN products_snapshot p ON p.id::text = s.product_id
WHERE s.unit_price * 100 = p.selling_price;

-- Step 3: Fail loud if any sales row has no matching product.
DO $$
DECLARE orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM sales s
  LEFT JOIN products_snapshot p ON p.id::text = s.product_id
  WHERE p.id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Sales rows with no matching product: % rows. Aborting migration.', orphan_count;
  END IF;
END $$;

-- Step 4: Sanity check: expected 21 naira rows per Phase 1.5 audit.
-- Drift means re-investigate before proceeding.
DO $$
DECLARE naira_count INT;
BEGIN
  SELECT COUNT(*) INTO naira_count FROM naira_rows;
  IF naira_count != 21 THEN
    RAISE EXCEPTION 'Expected 21 naira rows, found %. Re-investigate before proceeding.', naira_count;
  END IF;
END $$;

-- Step 5: Backup. Persistent table, survives commit. IF NOT EXISTS
-- guard makes the migration safe to re-run if step 6+ fails midway.
CREATE TABLE IF NOT EXISTS public.sales_units_backup_20260530 AS
SELECT s.* FROM sales s
JOIN naira_rows n ON n.id = s.id;

-- Step 6: UPDATE 4 money columns × 100 for the classified naira rows.
-- discount_amount + amount_due intentionally untouched.
UPDATE sales
SET unit_price = unit_price * 100,
    total_amount = total_amount * 100,
    final_amount = final_amount * 100,
    amount_paid = amount_paid * 100
WHERE id IN (SELECT id FROM naira_rows);

-- Step 7: Verify zero remaining naira rows (re-classify post-UPDATE).
DO $$
DECLARE remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM sales s
  JOIN products_snapshot p ON p.id::text = s.product_id
  WHERE s.unit_price * 100 = p.selling_price;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'After backfill, % rows still classified as naira. Aborting.', remaining;
  END IF;
END $$;

-- Step 8: Refresh matview (non-CONCURRENT — no unique index dependency,
-- 55 rows aggregate in microseconds, brief AccessExclusiveLock is fine).
REFRESH MATERIALIZED VIEW public.daily_sales_summary;

COMMIT;
