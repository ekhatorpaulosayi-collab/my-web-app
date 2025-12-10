-- Fix product_reviews RLS to allow anonymous customer reviews
-- Customers should be able to leave reviews on public storefronts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view all reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create reviews for products" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.product_reviews;

-- Create new permissive policies

-- Anyone (including anonymous) can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.product_reviews
  FOR SELECT
  USING (true);

-- Anyone (including anonymous) can create reviews
-- This allows customers to leave reviews without logging in
CREATE POLICY "Anyone can create reviews"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (true);

-- Store owners can update reviews for their products
CREATE POLICY "Store owners can update reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    store_user_id = auth.uid()
  );

-- Store owners can delete reviews for their products
CREATE POLICY "Store owners can delete reviews"
  ON public.product_reviews
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    store_user_id = auth.uid()
  );

-- Add index for better performance on product_id lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id
  ON public.product_reviews(product_id);

-- Add index for store user reviews lookup
CREATE INDEX IF NOT EXISTS idx_product_reviews_store_user_id
  ON public.product_reviews(store_user_id);
