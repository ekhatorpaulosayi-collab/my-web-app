-- Add Paystack plan code columns to subscription_tiers table
-- This allows us to map our tiers to Paystack subscription plans

ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS paystack_plan_code_monthly VARCHAR(100),
ADD COLUMN IF NOT EXISTS paystack_plan_code_annual VARCHAR(100);

-- Add comments
COMMENT ON COLUMN subscription_tiers.paystack_plan_code_monthly IS 'Paystack plan code for monthly billing (e.g., PLN_abc123)';
COMMENT ON COLUMN subscription_tiers.paystack_plan_code_annual IS 'Paystack plan code for annual billing (e.g., PLN_xyz789)';

-- Note: Plan codes will be added manually after creating plans in Paystack Dashboard
-- Example update query (run after creating plans in Paystack):
-- UPDATE subscription_tiers SET
--   paystack_plan_code_monthly = 'PLN_starter_monthly',
--   paystack_plan_code_annual = 'PLN_starter_annual'
-- WHERE name = 'Starter';
