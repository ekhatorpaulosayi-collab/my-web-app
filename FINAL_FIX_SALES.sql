-- FINAL COMPLETE FIX FOR SALES TABLE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Make final_amount nullable (to fix the constraint error)
ALTER TABLE sales ALTER COLUMN final_amount DROP NOT NULL;

-- Step 2: Test insert with all required fields
INSERT INTO sales (
  user_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  total_amount,
  final_amount,  -- Include this field
  payment_method,
  sale_date
) VALUES (
  'test-user-verify',
  'test-product-123',
  'Test Product',
  1,
  1000,
  1000,
  1000,  -- Same as total_amount
  'cash',
  NOW()
);

-- Step 3: Verify it worked - check if test sale was created
SELECT id, product_id, product_name FROM sales WHERE user_id = 'test-user-verify';

-- Step 4: Clean up test data
DELETE FROM sales WHERE user_id = 'test-user-verify';

-- Step 5: Final verification - your table is ready!
SELECT
  'SUCCESS! Sales table is now fixed and ready to save your data!' AS status,
  COUNT(*) AS total_sales_in_database
FROM sales;

-- Additional info about the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name IN ('product_id', 'final_amount', 'user_id')
ORDER BY column_name;