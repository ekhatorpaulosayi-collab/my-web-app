-- =====================================================
-- TEMPORARY: Make FREE tier unlimited for testing
-- =====================================================
-- This allows all users to test the app without restrictions
-- Can be reverted later when ready to enforce paid tiers

UPDATE subscription_tiers
SET
  max_products = NULL,              -- NULL = unlimited products
  max_images_per_product = 10,      -- 10 images per product (up from 1)
  max_users = 10,                   -- 10 users (up from 1)
  max_ai_chats_monthly = 10000,     -- 10,000 AI chats per month (up from 50)
  has_product_variants = true,      -- Enable variants
  has_debt_tracking = true,         -- Enable debt tracking
  has_invoicing = true,             -- Enable invoicing
  has_recurring_invoices = true,    -- Enable recurring invoices
  has_profit_analytics = true,      -- Enable profit analytics
  has_advanced_analytics = true,    -- Enable advanced analytics
  has_whatsapp_ai = true,           -- Enable WhatsApp AI
  has_export_data = true,           -- Enable data export
  has_store_customization = true,   -- Enable store customization
  updated_at = NOW()
WHERE id = 'free';

-- Confirmation
SELECT
  id,
  name,
  max_products,
  max_images_per_product,
  max_users,
  max_ai_chats_monthly,
  has_product_variants,
  has_debt_tracking,
  has_invoicing
FROM subscription_tiers
WHERE id = 'free';
