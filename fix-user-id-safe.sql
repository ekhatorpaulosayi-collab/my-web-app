-- Safe approach: Drop constraints first, then change column type

-- Step 1: Drop foreign key constraints (if any)
DO $$
BEGIN
    -- Drop all foreign key constraints on user_id columns
    ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
    ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_user_id_fkey;
    ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
    ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Change column types from UUID to TEXT
DO $$
BEGIN
    -- Change users table id
    ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

    -- Change products table user_id
    ALTER TABLE products ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    -- Change stores table user_id
    ALTER TABLE stores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    -- Change sales table user_id
    ALTER TABLE sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    -- Change expenses table user_id
    ALTER TABLE expenses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some columns may have already been converted or do not exist';
END $$;

-- Step 3: Verification
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'user_id' OR (table_name = 'users' AND column_name = 'id'))
  AND table_name IN ('products', 'stores', 'sales', 'expenses', 'users')
ORDER BY table_name, column_name;
