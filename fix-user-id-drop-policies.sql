-- Step 1: Drop ALL RLS policies that depend on user_id column

-- Drop policies on products table
DROP POLICY IF EXISTS "products_select_own" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Allow all to view products" ON products;
DROP POLICY IF EXISTS "Allow all to insert products" ON products;
DROP POLICY IF EXISTS "Allow all to update products" ON products;
DROP POLICY IF EXISTS "Allow all to delete products" ON products;

-- Drop policies on stores table
DROP POLICY IF EXISTS "stores_select_own" ON stores;
DROP POLICY IF EXISTS "stores_insert_own" ON stores;
DROP POLICY IF EXISTS "stores_update_own" ON stores;
DROP POLICY IF EXISTS "stores_delete_own" ON stores;
DROP POLICY IF EXISTS "Users can view own stores" ON stores;
DROP POLICY IF EXISTS "Users can insert own stores" ON stores;
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON stores;

-- Drop policies on sales table
DROP POLICY IF EXISTS "sales_select_own" ON sales;
DROP POLICY IF EXISTS "sales_insert_own" ON sales;
DROP POLICY IF EXISTS "sales_update_own" ON sales;
DROP POLICY IF EXISTS "sales_delete_own" ON sales;

-- Drop policies on expenses table
DROP POLICY IF EXISTS "expenses_select_own" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON expenses;

-- Drop policies on users table
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Step 2: Drop foreign key constraints
ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_user_id_fkey;
ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

-- Step 3: Change column types from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE products ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE stores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE expenses ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Verification
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'user_id' OR (table_name = 'users' AND column_name = 'id'))
  AND table_name IN ('products', 'stores', 'sales', 'expenses', 'users')
ORDER BY table_name, column_name;
