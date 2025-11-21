-- Fix user_id column type to accept Firebase UIDs
-- Firebase UIDs are strings, not UUIDs, so we need to change the column type

-- Change products table user_id from UUID to TEXT
ALTER TABLE products
ALTER COLUMN user_id TYPE TEXT;

-- Change stores table user_id from UUID to TEXT
ALTER TABLE stores
ALTER COLUMN user_id TYPE TEXT;

-- Change sales table user_id from UUID to TEXT (if exists)
ALTER TABLE sales
ALTER COLUMN user_id TYPE TEXT;

-- Change expenses table user_id from UUID to TEXT (if exists)
ALTER TABLE expenses
ALTER COLUMN user_id TYPE TEXT;

-- Change users table id from UUID to TEXT (if exists)
ALTER TABLE users
ALTER COLUMN id TYPE TEXT;

-- Verification
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN ('products', 'stores', 'sales', 'expenses')
ORDER BY table_name;
