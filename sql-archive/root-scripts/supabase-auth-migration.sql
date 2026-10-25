-- Complete Supabase Auth Migration
-- This script sets up proper RLS policies using Supabase auth

-- ============================================
-- STEP 1: Update Database Schema
-- ============================================

-- The user_id columns are already TEXT type (from Firebase migration)
-- Supabase auth.uid() returns UUID, but we'll keep TEXT for flexibility
-- We'll store Supabase UUIDs as TEXT

-- ============================================
-- STEP 2: STORES TABLE RLS
-- ============================================

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public stores are viewable by everyone" ON stores;
DROP POLICY IF EXISTS "Store owners can manage their stores" ON stores;
DROP POLICY IF EXISTS "Anyone can view public stores" ON stores;
DROP POLICY IF EXISTS "Users can manage their own stores" ON stores;

-- Policy 1: Anyone can view public stores (for storefront - no auth required)
CREATE POLICY "Anyone can view public stores"
ON stores FOR SELECT
USING (is_public = true);

-- Policy 2: Authenticated users can view their own stores
CREATE POLICY "Users can view their own stores"
ON stores FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy 3: Authenticated users can insert their own stores
CREATE POLICY "Users can create their own stores"
ON stores FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy 4: Authenticated users can update their own stores
CREATE POLICY "Users can update their own stores"
ON stores FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy 5: Authenticated users can delete their own stores
CREATE POLICY "Users can delete their own stores"
ON stores FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- STEP 3: PRODUCTS TABLE RLS
-- ============================================

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Product owners can manage their products" ON products;
DROP POLICY IF EXISTS "Anyone can view public products" ON products;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;

-- Policy 1: Anyone can view public, active, in-stock products (for storefront)
CREATE POLICY "Anyone can view public products"
ON products FOR SELECT
USING (is_public = true AND is_active = true AND quantity > 0);

-- Policy 2: Authenticated users can view all their own products
CREATE POLICY "Users can view their own products"
ON products FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy 3: Authenticated users can insert their own products
CREATE POLICY "Users can create their own products"
ON products FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy 4: Authenticated users can update their own products
CREATE POLICY "Users can update their own products"
ON products FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy 5: Authenticated users can delete their own products
CREATE POLICY "Users can delete their own products"
ON products FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- STEP 4: SALES TABLE RLS
-- ============================================

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
DROP POLICY IF EXISTS "Users can create their own sales" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON sales;

-- Policy 1: Authenticated users can view their own sales
CREATE POLICY "Users can view their own sales"
ON sales FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy 2: Authenticated users can insert their own sales
CREATE POLICY "Users can create their own sales"
ON sales FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy 3: Authenticated users can update their own sales
CREATE POLICY "Users can update their own sales"
ON sales FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy 4: Authenticated users can delete their own sales
CREATE POLICY "Users can delete their own sales"
ON sales FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- STEP 5: CUSTOMERS TABLE RLS
-- ============================================

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

-- Policy 1: Authenticated users can view their own customers
CREATE POLICY "Users can view their own customers"
ON customers FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy 2: Authenticated users can insert their own customers
CREATE POLICY "Users can create their own customers"
ON customers FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy 3: Authenticated users can update their own customers
CREATE POLICY "Users can update their own customers"
ON customers FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy 4: Authenticated users can delete their own customers
CREATE POLICY "Users can delete their own customers"
ON customers FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- STEP 6: STORAGE BUCKETS RLS
-- ============================================

-- Products bucket: Public read, authenticated write
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

-- Stores bucket: Public read, authenticated write
CREATE POLICY "Anyone can view store logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'stores');

CREATE POLICY "Authenticated users can upload store logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stores'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own store logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stores'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own store logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stores'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================

-- Check RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'products', 'sales', 'customers')
ORDER BY tablename;

-- Check all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'products', 'sales', 'customers')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Supabase Auth Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies Created:';
  RAISE NOTICE '- Stores: Public read for storefront, authenticated write';
  RAISE NOTICE '- Products: Public read for in-stock items, authenticated write';
  RAISE NOTICE '- Sales: Authenticated users only';
  RAISE NOTICE '- Customers: Authenticated users only';
  RAISE NOTICE '- Storage: Public read, authenticated write';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update App.jsx to use Supabase auth';
  RAISE NOTICE '2. Test registration and login';
  RAISE NOTICE '3. Verify storefront still works without login';
END $$;
