-- Fix Products Table RLS for Firebase Auth Users
-- Allows product operations during Firebase to Supabase migration

-- Temporarily disable RLS on products table to allow Firebase auth users
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Alternative: Keep RLS enabled but make policies permissive
-- Uncomment below if you prefer to keep RLS enabled:

/*
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Create permissive policies that allow all operations
CREATE POLICY "Allow all to view products"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all to insert products"
ON products FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow all to update products"
ON products FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow all to delete products"
ON products FOR DELETE
TO public
USING (true);
*/

-- Verification
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'products';
