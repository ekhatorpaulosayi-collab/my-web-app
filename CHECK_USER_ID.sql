-- CHECK USER ID: Run this to see what user ID your sales are using
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Show the EXACT user_id that has sales
SELECT DISTINCT
  user_id,
  COUNT(*) as total_sales
FROM sales
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_sales DESC;

-- Step 2: Show recent sales with their user_ids
SELECT
  id,
  user_id,
  product_name,
  sale_date,
  created_at
FROM sales
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check if there's a specific user_id pattern
SELECT
  CASE
    WHEN user_id = 'dffba89b-869d-422a-a542-2e2494850b44' THEN 'Your main account'
    ELSE 'Different user'
  END as user_type,
  COUNT(*) as sale_count
FROM sales
GROUP BY user_type;