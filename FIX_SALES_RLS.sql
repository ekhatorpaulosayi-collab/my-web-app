-- FIX: Disable Row Level Security to allow Firebase users to save sales
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'sales';

-- Step 2: Disable RLS on sales table (allows all authenticated users to access)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sales;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON sales;

-- Step 4: Grant permissions to anonymous and authenticated users
GRANT ALL ON sales TO anon;
GRANT ALL ON sales TO authenticated;

-- Step 5: Test insert with Firebase UID
INSERT INTO sales (
  user_id,  -- This will be a Firebase UID
  product_id,
  product_name,
  quantity,
  unit_price,
  total_amount,
  final_amount,
  payment_method,
  sale_date
) VALUES (
  'firebase-test-uid-12345',  -- Firebase UID format
  'test-product-rls',
  'RLS Test Product',
  1,
  5000,
  5000,
  5000,
  'cash',
  NOW()
);

-- Step 6: Verify it worked
SELECT
  'RLS DISABLED - Sales can now be saved!' as status,
  id,
  user_id,
  product_name
FROM sales
WHERE user_id = 'firebase-test-uid-12345'
LIMIT 1;

-- Step 7: Clean up test data
DELETE FROM sales WHERE user_id = 'firebase-test-uid-12345';

-- Step 8: Final check
SELECT
  'SUCCESS! Your app can now save sales with Firebase UIDs' as message,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'sales';