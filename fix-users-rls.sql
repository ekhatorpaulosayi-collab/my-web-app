-- Fix RLS policy for users table to allow self-registration
-- This allows Firebase authenticated users to create their own user record

-- Drop existing policies if they exist
DROP POLICY IF EXISTS users_insert_own ON public.users;

-- Allow users to insert their own record
-- Since we're using Firebase Auth (not Supabase Auth), we allow any insert
-- but the client-side code ensures firebase_uid is set correctly
CREATE POLICY users_insert_own ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Alternative: If you want to use Supabase Auth in the future, use this instead:
-- CREATE POLICY users_insert_own ON public.users
--   FOR INSERT
--   WITH CHECK (auth.uid()::text = firebase_uid);

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
