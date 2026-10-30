-- ========================================================
-- FIX SALES USER ID FOR ALL USERS
-- This will update ALL sales to use the correct user ID
-- ========================================================

-- STEP 1: Check current situation for YOUR account
SELECT
  'Your current user ID' as description,
  id as user_id,
  email
FROM auth.users
WHERE email = 'paulekhator2026@yahoo.com';

-- STEP 2: Count sales with wrong user ID (old hardcoded ID)
SELECT
  COUNT(*) as sales_with_wrong_id,
  'These sales need to be fixed' as note
FROM sales
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44';

-- STEP 3: Update YOUR sales to correct user ID
-- This will move all sales from the hardcoded ID to your actual user ID
UPDATE sales
SET
  user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d',
  updated_at = NOW()
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44'
RETURNING id, product_name, user_id as updated_user_id;

-- STEP 4: Verify the fix
SELECT
  user_id,
  COUNT(*) as sale_count,
  'After update - all sales should be under YOUR user ID' as status
FROM sales
WHERE user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d'
GROUP BY user_id;

-- ========================================================
-- IMPORTANT: This only fixes YOUR account
-- Other users' sales are not affected
-- The code fix ensures NEW sales use correct IDs
-- ========================================================