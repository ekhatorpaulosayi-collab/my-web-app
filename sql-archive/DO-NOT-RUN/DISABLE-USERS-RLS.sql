-- TEMPORARY FIX: Disable RLS on users table
-- This allows Firebase Auth users to create their own user records
-- without needing Supabase Auth context

-- Disable Row Level Security on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- Expected output: rowsecurity = false
