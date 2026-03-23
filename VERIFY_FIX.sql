-- VERIFY THE FIX WORKED
-- Run this to confirm all sales are now using your correct user ID

-- Check how many sales you now have with YOUR user ID
SELECT
  COUNT(*) as your_total_sales,
  user_id
FROM sales
WHERE user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d'
GROUP BY user_id;

-- Check if any sales still have the OLD wrong user ID (should be 0)
SELECT
  COUNT(*) as sales_with_old_id
FROM sales
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44';

-- View a sample of your sales to confirm they're yours
SELECT
  id,
  product_name,
  quantity,
  final_amount,
  sale_date,
  user_id
FROM sales
WHERE user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d'
ORDER BY created_at DESC
LIMIT 5;