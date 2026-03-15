-- Fix Pro and Business tiers to show proper unlimited value
-- -1 is confusing for users, let's use 999999 for unlimited

UPDATE subscription_tiers
SET max_products = 999999
WHERE name IN ('Pro', 'Business');

-- Optional: Update the display to show "Unlimited" in the UI
-- You'll need to handle this in your frontend code
-- if (max_products >= 999999) show "Unlimited" else show the number

-- Verify the update
SELECT name, max_products, price_monthly, price_annual
FROM subscription_tiers
ORDER BY display_order;