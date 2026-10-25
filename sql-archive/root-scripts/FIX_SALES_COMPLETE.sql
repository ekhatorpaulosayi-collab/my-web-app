-- COMPLETE FIX FOR SALES TABLE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Drop the foreign key constraint
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_id_fkey;

-- Step 2: Change product_id from UUID to TEXT
ALTER TABLE sales ALTER COLUMN product_id TYPE TEXT USING COALESCE(product_id::TEXT, '');

-- Step 3: Verify the change worked
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name = 'product_id';

-- Step 4: Test insert with text product_id
INSERT INTO sales (
  user_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  total_amount,
  payment_method,
  sale_date
) VALUES (
  'test-user-verify',
  'test-product-123',  -- This is TEXT, not UUID
  'Test Product',
  1,
  1000,
  1000,
  'cash',
  NOW()
);

-- Step 5: Clean up test data
DELETE FROM sales WHERE user_id = 'test-user-verify';

-- Success message
SELECT 'Sales table fixed! Product ID now accepts text values.' AS message;