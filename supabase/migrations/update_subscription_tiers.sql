-- Update subscription tiers with new chat limits and pricing
-- Based on the new pricing strategy:
-- Free: 30 chats
-- Starter: 300 chats - ₦5,000
-- Pro: 750 chats - ₦10,000
-- Business: 1,500 chats - ₦20,000
-- Enterprise: 10,000 chats - ₦50,000

-- First, let's check the current structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscription_tiers';

-- Update existing tiers or insert new ones
-- Using UPSERT pattern to handle both cases

-- Free Tier
INSERT INTO subscription_tiers (
    id,
    name,
    max_ai_chats_monthly,
    price_naira,
    price_usd,
    display_order,
    is_active,
    created_at,
    updated_at
) VALUES (
    'tier_free',
    'Free',
    30,
    0,
    0,
    1,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    max_ai_chats_monthly = 30,
    price_naira = 0,
    price_usd = 0,
    updated_at = NOW();

-- Starter Tier
INSERT INTO subscription_tiers (
    id,
    name,
    max_ai_chats_monthly,
    price_naira,
    price_usd,
    display_order,
    is_active,
    created_at,
    updated_at
) VALUES (
    'tier_starter',
    'Starter',
    300,
    5000,
    3.13,
    2,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    max_ai_chats_monthly = 300,
    price_naira = 5000,
    price_usd = 3.13,
    updated_at = NOW();

-- Pro Tier (Popular)
INSERT INTO subscription_tiers (
    id,
    name,
    max_ai_chats_monthly,
    price_naira,
    price_usd,
    display_order,
    is_popular,
    is_active,
    created_at,
    updated_at
) VALUES (
    'tier_pro',
    'Pro',
    750,
    10000,
    6.25,
    3,
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    max_ai_chats_monthly = 750,
    price_naira = 10000,
    price_usd = 6.25,
    is_popular = true,
    updated_at = NOW();

-- Business Tier
INSERT INTO subscription_tiers (
    id,
    name,
    max_ai_chats_monthly,
    price_naira,
    price_usd,
    display_order,
    is_active,
    created_at,
    updated_at
) VALUES (
    'tier_business',
    'Business',
    1500,
    20000,
    12.50,
    4,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    max_ai_chats_monthly = 1500,
    price_naira = 20000,
    price_usd = 12.50,
    updated_at = NOW();

-- Enterprise Tier
INSERT INTO subscription_tiers (
    id,
    name,
    max_ai_chats_monthly,
    price_naira,
    price_usd,
    display_order,
    is_active,
    created_at,
    updated_at
) VALUES (
    'tier_enterprise',
    'Enterprise',
    10000,
    50000,
    31.25,
    5,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    max_ai_chats_monthly = 10000,
    price_naira = 50000,
    price_usd = 31.25,
    updated_at = NOW();

-- Verify the updates
SELECT
    id,
    name,
    max_ai_chats_monthly as chats,
    price_naira,
    price_usd,
    display_order,
    is_popular,
    is_active
FROM subscription_tiers
ORDER BY display_order;

-- Create index for faster tier lookups if not exists
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_chats
ON subscription_tiers(max_ai_chats_monthly);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active
ON subscription_tiers(is_active)
WHERE is_active = true;