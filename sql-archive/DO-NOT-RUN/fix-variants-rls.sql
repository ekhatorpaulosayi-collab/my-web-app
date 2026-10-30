-- Fix Row-Level Security (RLS) policies for product_variants table
-- TEMPORARY FIX: Disable RLS since we're using Firebase Auth (not Supabase Auth)
-- This allows all authenticated operations to work
-- TODO: Implement proper RLS with Firebase UID mapping later

-- Disable RLS on product_variants table
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Users can view their own variants" ON product_variants;
DROP POLICY IF EXISTS "Users can insert their own variants" ON product_variants;
DROP POLICY IF EXISTS "Users can update their own variants" ON product_variants;
DROP POLICY IF EXISTS "Users can delete their own variants" ON product_variants;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'product_variants';

-- NOTE: For production, you should implement RLS properly by:
-- 1. Creating a function that maps Firebase UID to Supabase user_id
-- 2. Using that function in RLS policies
-- OR
-- 3. Migrating to Supabase Auth completely
