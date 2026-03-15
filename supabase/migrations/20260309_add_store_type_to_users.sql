-- Migration: Add store_type column to users table
-- Created: 2026-03-09
-- Purpose: Store business type selection at signup to avoid post-login prompts

-- Add store_type column with constraint
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS store_type TEXT
  CHECK (store_type IN ('fashion', 'electronics', 'food', 'pharmacy', 'general'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_store_type ON public.users(store_type);

-- Add comment
COMMENT ON COLUMN public.users.store_type IS 'Business type selected during signup: fashion, electronics, food, pharmacy, or general';
