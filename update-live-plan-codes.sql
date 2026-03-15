-- Update subscription_tiers with live Paystack plan codes
-- Replace these with your actual live plan codes from Paystack dashboard

UPDATE subscription_tiers
SET
    paystack_plan_code_monthly = 'PLN_live_starter_monthly',  -- Replace with actual
    paystack_plan_code_annual = 'PLN_live_starter_annual'      -- Replace with actual
WHERE name = 'Starter';

UPDATE subscription_tiers
SET
    paystack_plan_code_monthly = 'PLN_live_pro_monthly',       -- Replace with actual
    paystack_plan_code_annual = 'PLN_live_pro_annual'          -- Replace with actual
WHERE name = 'Pro';

UPDATE subscription_tiers
SET
    paystack_plan_code_monthly = 'PLN_live_enterprise_monthly', -- Replace with actual
    paystack_plan_code_annual = 'PLN_live_enterprise_annual'    -- Replace with actual
WHERE name = 'Enterprise';

-- To check current values:
SELECT
    name,
    paystack_plan_code_monthly,
    paystack_plan_code_annual
FROM subscription_tiers
ORDER BY display_order;