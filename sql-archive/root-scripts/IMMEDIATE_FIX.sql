-- IMMEDIATE FIX: Update all your sales to use your current user ID
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- This will ensure ALL sales are linked to your account
-- Replace 'your-email@example.com' with your actual email

UPDATE sales
SET user_id = (
  SELECT id
  FROM users
  WHERE email = 'ekhatorpaulosayi@gmail.com'
  LIMIT 1
)
WHERE user_id IS NOT NULL;

-- Verify the fix worked
SELECT
  COUNT(*) as total_sales,
  user_id
FROM sales
GROUP BY user_id;