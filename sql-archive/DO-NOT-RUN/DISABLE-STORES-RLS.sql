-- TEMPORARY FIX: Disable RLS on stores table
-- This allows Firebase Auth users to update their own store records
-- without needing Supabase Auth context

-- Disable Row Level Security on stores table
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'stores';

-- Expected output: rowsecurity = false
