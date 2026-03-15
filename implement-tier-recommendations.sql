-- =====================================================
-- SUBSCRIPTION TIERS OPTIMIZATION
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new
-- =====================================================

-- STEP 1: Backup current tiers (just in case)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_tiers_backup AS
SELECT * FROM subscription_tiers;

-- STEP 2: Fix the -1 unlimited products issue
-- =====================================================
UPDATE subscription_tiers
SET max_products = 999999
WHERE name IN ('Pro', 'Business');

-- STEP 3: Optimize Free Tier (make it less generous)
-- =====================================================
UPDATE subscription_tiers
SET
    max_products = 20,  -- Reduced from 30
    max_ai_chats_monthly = 10,  -- Reduced from 30
    max_images_per_product = 2  -- Increased from 1 (small improvement)
WHERE name = 'Free';

-- STEP 4: Option A - CONSERVATIVE (Keep prices, adjust features)
-- =====================================================
-- Uncomment this section if you want to keep current prices

/*
-- Starter Tier Adjustments
UPDATE subscription_tiers
SET
    max_products = 150,  -- Reduced from 200 but still good value
    max_ai_chats_monthly = 300  -- Reduced from 500 but still generous
WHERE name = 'Starter';

-- Pro Tier Adjustments
UPDATE subscription_tiers
SET
    max_products = 1000,  -- Not truly unlimited but enough for most
    max_ai_chats_monthly = 1500  -- Keep same
WHERE name = 'Pro';

-- Business stays same but you'll add features in the app
*/

-- STEP 5: Option B - RECOMMENDED (Adjust prices for better conversion)
-- =====================================================
-- Uncomment this section for recommended pricing

/*
-- Starter Tier - Lower entry point
UPDATE subscription_tiers
SET
    price_monthly = 3500,  -- Reduced from 5000
    price_annual = 33600,  -- Annual with discount (3500 * 12 * 0.8)
    max_products = 150,  -- Adjusted for new price point
    max_ai_chats_monthly = 300
WHERE name = 'Starter';

-- Pro Tier - Better value positioning
UPDATE subscription_tiers
SET
    price_monthly = 8500,  -- Reduced from 10000
    price_annual = 81600,  -- Annual with discount (8500 * 12 * 0.8)
    max_products = 1000,  -- Enough for most businesses
    max_ai_chats_monthly = 1500
WHERE name = 'Pro';

-- Business Tier - Keep premium
UPDATE subscription_tiers
SET
    max_products = 999999,  -- Truly unlimited
    max_ai_chats_monthly = 10000  -- Keep generous
WHERE name = 'Business';
*/

-- STEP 6: Add feature flags column (if not exists)
-- =====================================================
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';

-- STEP 7: Set feature flags for each tier
-- =====================================================

-- Free Tier Features
UPDATE subscription_tiers
SET features = jsonb_build_object(
    'watermark_on_receipts', true,
    'basic_reports', true,
    'email_support', false,
    'priority_support', false,
    'custom_domain', false,
    'api_access', false,
    'white_label', false,
    'bulk_operations', false,
    'multi_location', false,
    'advanced_analytics', false,
    'dedicated_support', false,
    'storage_gb', 0.1,
    'support_response_hours', 0,  -- No support
    'data_export', false,
    'team_collaboration', false
)
WHERE name = 'Free';

-- Starter Tier Features
UPDATE subscription_tiers
SET features = jsonb_build_object(
    'watermark_on_receipts', false,
    'basic_reports', true,
    'email_support', true,
    'priority_support', false,
    'custom_domain', false,
    'api_access', false,
    'white_label', false,
    'bulk_operations', true,  -- Limited
    'multi_location', false,
    'advanced_analytics', false,
    'dedicated_support', false,
    'storage_gb', 1,
    'support_response_hours', 48,  -- 2 days
    'data_export', true,
    'team_collaboration', true,
    'custom_store_url', true  -- yourstore.smartstock.com
)
WHERE name = 'Starter';

-- Pro Tier Features
UPDATE subscription_tiers
SET features = jsonb_build_object(
    'watermark_on_receipts', false,
    'basic_reports', true,
    'email_support', true,
    'priority_support', true,
    'custom_domain', true,  -- yourdomain.com
    'api_access', true,  -- Limited
    'white_label', false,
    'bulk_operations', true,  -- Full
    'multi_location', true,
    'advanced_analytics', true,
    'dedicated_support', false,
    'storage_gb', 5,
    'support_response_hours', 24,  -- 1 day
    'data_export', true,
    'team_collaboration', true,
    'inventory_alerts', true,
    'sales_forecasting', true,
    'custom_reports', true
)
WHERE name = 'Pro';

-- Business Tier Features
UPDATE subscription_tiers
SET features = jsonb_build_object(
    'watermark_on_receipts', false,
    'basic_reports', true,
    'email_support', true,
    'priority_support', true,
    'custom_domain', true,
    'api_access', true,  -- Full
    'white_label', true,  -- Key differentiator
    'bulk_operations', true,
    'multi_location', true,
    'advanced_analytics', true,
    'dedicated_support', true,
    'storage_gb', 20,
    'support_response_hours', 1,  -- 1 hour
    'data_export', true,
    'team_collaboration', true,
    'inventory_alerts', true,
    'sales_forecasting', true,
    'custom_reports', true,
    'account_manager', true,
    'custom_integrations', true,
    'training_session', true,
    'early_access_features', true
)
WHERE name = 'Business';

-- STEP 8: Add display descriptions for better UX
-- =====================================================
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS best_for TEXT;

UPDATE subscription_tiers SET
    tagline = 'Start your journey',
    best_for = 'Personal use & testing'
WHERE name = 'Free';

UPDATE subscription_tiers SET
    tagline = 'Perfect for small businesses',
    best_for = 'Small shops & startups'
WHERE name = 'Starter';

UPDATE subscription_tiers SET
    tagline = 'Scale your business',
    best_for = 'Growing businesses'
WHERE name = 'Pro';

UPDATE subscription_tiers SET
    tagline = 'Enterprise-ready solution',
    best_for = 'Large businesses & chains'
WHERE name = 'Business';

-- STEP 9: Create Enterprise tier (optional)
-- =====================================================
/*
INSERT INTO subscription_tiers (
    name,
    description,
    tagline,
    best_for,
    price_monthly,
    price_annual,
    max_products,
    max_images_per_product,
    max_users,
    max_ai_chats_monthly,
    display_order,
    is_active,
    features
) VALUES (
    'Enterprise',
    'Custom solutions for large organizations',
    'Tailored to your needs',
    'Large enterprises & franchises',
    35000,
    336000,  -- 20% annual discount
    999999,  -- Unlimited
    999999,  -- Unlimited
    999999,  -- Unlimited
    999999,  -- Unlimited
    5,
    true,
    jsonb_build_object(
        'everything_in_business', true,
        'sla_guarantee', true,
        'custom_features', true,
        'dedicated_server', true,
        'on_premise_option', true,
        'phone_support_247', true,
        'quarterly_reviews', true,
        'custom_contract', true,
        'invoice_billing', true
    )
);
*/

-- STEP 10: Verify the updates
-- =====================================================
SELECT
    name,
    tagline,
    price_monthly,
    price_annual,
    max_products,
    max_images_per_product,
    max_users,
    max_ai_chats_monthly,
    is_active,
    features->>'watermark_on_receipts' as has_watermark,
    features->>'white_label' as white_label,
    features->>'api_access' as api_access,
    features->>'support_response_hours' as support_hours
FROM subscription_tiers
ORDER BY display_order;

-- STEP 11: Important Note
-- =====================================================
-- After running this SQL, you need to:
-- 1. Update Paystack with new prices (if you changed them)
-- 2. Update your frontend to handle new features
-- 3. Communicate changes to existing users
-- 4. Test the upgrade/downgrade flow