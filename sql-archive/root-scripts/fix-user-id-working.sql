-- Complete fix with corrected materialized views

-- Step 1: Drop all policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'products') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON products', r.policyname);
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stores') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stores', r.policyname);
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales', r.policyname);
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expenses') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', r.policyname);
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    END LOOP;
END $$;

-- Step 2: Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS daily_sales_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS low_stock_products CASCADE;
DROP MATERIALIZED VIEW IF EXISTS product_performance CASCADE;

-- Step 3: Drop foreign key constraints
ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_user_id_fkey;
ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

-- Step 4: Change column types from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE products ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE stores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE expenses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 5: Recreate materialized views (simplified - no total_cost)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_sales_summary AS
SELECT
  user_id,
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total_amount) as total_revenue
FROM sales
GROUP BY user_id, DATE(created_at);

CREATE MATERIALIZED VIEW IF NOT EXISTS low_stock_products AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.quantity,
  p.low_stock_threshold,
  p.selling_price
FROM products p
WHERE p.is_active = true
  AND p.quantity <= p.low_stock_threshold;

-- Step 6: Verification
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'user_id' OR (table_name = 'users' AND column_name = 'id'))
  AND table_name IN ('products', 'stores', 'sales', 'expenses', 'users')
ORDER BY table_name, column_name;
