-- Drop ALL policies on ALL tables (comprehensive approach)

-- Get all policy names and drop them
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on products table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'products') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON products', r.policyname);
    END LOOP;

    -- Drop all policies on stores table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stores') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stores', r.policyname);
    END LOOP;

    -- Drop all policies on sales table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales', r.policyname);
    END LOOP;

    -- Drop all policies on expenses table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expenses') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', r.policyname);
    END LOOP;

    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    END LOOP;
END $$;

-- Drop foreign key constraints
ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_user_id_fkey;
ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

-- Change column types from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE products ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE stores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE expenses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Verification
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'user_id' OR (table_name = 'users' AND column_name = 'id'))
  AND table_name IN ('products', 'stores', 'sales', 'expenses', 'users')
ORDER BY table_name, column_name;
