-- ULTIMATE FIX: Complete sales table restructuring
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Check current product_id type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name = 'product_id';

-- Step 2: Drop ALL constraints on product_id
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_id_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_id_check;

-- Step 3: Create a temporary column for migration
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_id_text TEXT;

-- Step 4: Copy existing data to new column (if any)
UPDATE sales SET product_id_text = product_id::TEXT WHERE product_id IS NOT NULL;

-- Step 5: Drop the old UUID column
ALTER TABLE sales DROP COLUMN product_id;

-- Step 6: Rename the new column
ALTER TABLE sales RENAME COLUMN product_id_text TO product_id;

-- Step 7: Make final_amount nullable
ALTER TABLE sales ALTER COLUMN final_amount DROP NOT NULL;

-- Step 8: Test insert with text product_id
INSERT INTO sales (
  user_id,
  product_id,  -- Now this is TEXT!
  product_name,
  quantity,
  unit_price,
  total_amount,
  final_amount,
  payment_method,
  sale_date
) VALUES (
  'test-user-verify',
  'test-product-123',  -- TEXT value works now!
  'Test Product',
  1,
  1000,
  1000,
  1000,
  'cash',
  NOW()
);

-- Step 9: Verify it worked
SELECT
  'SUCCESS! Test sale created with TEXT product_id' as message,
  id,
  product_id,
  product_name
FROM sales
WHERE user_id = 'test-user-verify'
LIMIT 1;

-- Step 10: Clean up test data
DELETE FROM sales WHERE user_id = 'test-user-verify';

-- Step 11: Final verification
SELECT
  'COMPLETE SUCCESS! Your sales table is now fixed!' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name = 'product_id';