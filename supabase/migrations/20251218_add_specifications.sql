-- Phase 2A: Add specifications column to products table
-- Migration created: 2025-12-18
-- Purpose: Allow store owners to add structured product specs for AI to use

-- Add specifications column if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

-- Add index for faster querying of specifications
CREATE INDEX IF NOT EXISTS idx_products_specifications
ON products USING gin(specifications);

-- Add helpful comment
COMMENT ON COLUMN products.specifications IS
'Structured product specifications in JSON format.
Example: {"battery_life": "22 hours", "screen_size": "6.1 inches", "camera": "12MP"}
Used by AI chat to answer customer questions without hallucination.';
