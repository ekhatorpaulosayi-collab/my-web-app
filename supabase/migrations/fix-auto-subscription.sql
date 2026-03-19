-- Fix: Ensure all existing users have a subscription
-- And new users automatically get one

-- 1. Create free subscriptions for all users who don't have one
INSERT INTO user_subscriptions (user_id, tier_id, billing_cycle, status)
SELECT
  u.id,
  'free',
  'monthly',
  'active'
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id::uuid
WHERE s.id IS NULL;

-- 2. Recreate trigger to ensure it works
DROP TRIGGER IF EXISTS on_user_created_create_subscription ON auth.users;

-- Function to create subscription on user signup
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if subscription already exists (in case of duplicate triggers)
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = NEW.id::text
  ) THEN
    INSERT INTO user_subscriptions (
      user_id,
      tier_id,
      billing_cycle,
      status,
      started_at,
      current_period_start
    )
    VALUES (
      NEW.id::text,
      'free',
      'monthly',
      'active',
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_user_created_create_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- 3. Verify all users now have subscriptions
DO $$
DECLARE
  users_without_subscription INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_without_subscription
  FROM auth.users u
  LEFT JOIN user_subscriptions s ON u.id = s.user_id::uuid
  WHERE s.id IS NULL;

  RAISE NOTICE 'Users without subscription: %', users_without_subscription;
END $$;