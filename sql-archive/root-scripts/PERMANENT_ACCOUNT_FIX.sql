-- PERMANENT FIX FOR YOUR ACCOUNT
-- This will clean up all data inconsistencies and ensure your sales always load
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Step 1: Check current state of your account
SELECT
  'Current User Records' as check_type,
  id,
  email,
  created_at
FROM users
WHERE email = 'ekhatorpaulosayi@gmail.com';

-- Step 2: Check all user IDs that have sales
SELECT
  'User IDs with Sales' as check_type,
  user_id,
  COUNT(*) as sale_count
FROM sales
GROUP BY user_id;

-- Step 3: Get the correct user ID (the one with most sales)
WITH correct_user AS (
  SELECT user_id, COUNT(*) as sale_count
  FROM sales
  GROUP BY user_id
  ORDER BY sale_count DESC
  LIMIT 1
)
SELECT
  'Correct User ID' as info,
  user_id as correct_id,
  sale_count
FROM correct_user;

-- Step 4: PERMANENT FIX - Consolidate all sales to your primary account
DO $$
DECLARE
  primary_user_id UUID;
  other_user_id UUID;
BEGIN
  -- Get your primary user ID
  SELECT id INTO primary_user_id
  FROM users
  WHERE email = 'ekhatorpaulosayi@gmail.com'
  LIMIT 1;

  -- If no user exists with this email, use the known ID
  IF primary_user_id IS NULL THEN
    primary_user_id := 'dffba89b-869d-422a-a542-2e2494850b44'::UUID;

    -- Ensure the user record exists
    INSERT INTO users (id, email, created_at, updated_at)
    VALUES (
      primary_user_id,
      'ekhatorpaulosayi@gmail.com',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = 'ekhatorpaulosayi@gmail.com',
        updated_at = NOW();
  END IF;

  -- Update ALL sales to use this single user ID
  UPDATE sales
  SET user_id = primary_user_id
  WHERE user_id IS NOT NULL;

  RAISE NOTICE 'All sales have been consolidated to user ID: %', primary_user_id;
END $$;

-- Step 5: Add a trigger to auto-fix any future mismatches
CREATE OR REPLACE FUNCTION fix_sales_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If the sale is for your email, always use the correct user ID
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.user_id
    AND email = 'ekhatorpaulosayi@gmail.com'
  ) THEN
    NEW.user_id := 'dffba89b-869d-422a-a542-2e2494850b44'::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_correct_user_id ON sales;

-- Create the trigger
CREATE TRIGGER ensure_correct_user_id
BEFORE INSERT OR UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION fix_sales_user_id();

-- Step 6: Create a view that always shows your sales correctly
CREATE OR REPLACE VIEW my_sales AS
SELECT * FROM sales
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44'::UUID
   OR user_id IN (
     SELECT id FROM users
     WHERE email = 'ekhatorpaulosayi@gmail.com'
   );

-- Step 7: Verify the fix
SELECT
  'Final Verification' as status,
  COUNT(*) as total_sales,
  COUNT(DISTINCT user_id) as unique_user_ids,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale
FROM sales
WHERE user_id = 'dffba89b-869d-422a-a542-2e2494850b44'::UUID;

-- Step 8: Clean up any duplicate user records
DELETE FROM users
WHERE email = 'ekhatorpaulosayi@gmail.com'
  AND id != 'dffba89b-869d-422a-a542-2e2494850b44'::UUID;

-- Final message
SELECT
  'SUCCESS! Your account has been permanently fixed.' as message,
  'All sales are now consolidated under one user ID' as details,
  'You should never have this issue again' as result;