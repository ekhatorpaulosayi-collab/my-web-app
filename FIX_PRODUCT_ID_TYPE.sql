-- FIX: Change product_id from UUID to TEXT to match app data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- First, alter the product_id column to accept TEXT instead of UUID
ALTER TABLE sales
ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name = 'product_id';

-- Success message
SELECT 'Product ID column fixed! Sales can now be saved.' AS message;