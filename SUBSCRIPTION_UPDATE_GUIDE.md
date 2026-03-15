# Subscription Plans Update Guide

## Current Status ✅
- All Edge Functions deployed and working
- Live payment keys configured
- Paystack plan codes set

## Recommended Updates for Better UX

### 1. Fix "Unlimited" Products Display
Run this SQL in Supabase dashboard:
```sql
UPDATE subscription_tiers
SET max_products = 999999
WHERE name IN ('Pro', 'Business');
```

### 2. Consider These Pricing Improvements

#### Option A: Keep Current Prices, Differentiate Features Better
- **Starter** (₦5,000): 200 products, 3 images, 3 users
- **Pro** (₦10,000): Unlimited products, 5 images, 5 users, **Priority Support**
- **Business** (₦15,000): Unlimited products, 10 images, 10 users, **API Access + White Label**

#### Option B: Adjust Pricing for Better Value Perception
- **Starter** (₦3,000): 100 products
- **Growth** (₦7,500): 500 products
- **Pro** (₦15,000): Unlimited products
- **Enterprise** (₦25,000): Unlimited + Custom features

### 3. Add Missing Features to Differentiate Tiers

```sql
-- Add feature flags to subscription_tiers table
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';

-- Update features for each tier
UPDATE subscription_tiers SET features = jsonb_build_object(
  'basic_support', true,
  'email_support', true,
  'analytics', false,
  'api_access', false,
  'white_label', false,
  'priority_support', false,
  'custom_domain', false,
  'team_collaboration', false
) WHERE name = 'Free';

UPDATE subscription_tiers SET features = jsonb_build_object(
  'basic_support', true,
  'email_support', true,
  'analytics', true,
  'api_access', false,
  'white_label', false,
  'priority_support', false,
  'custom_domain', false,
  'team_collaboration', true
) WHERE name = 'Starter';

UPDATE subscription_tiers SET features = jsonb_build_object(
  'basic_support', true,
  'email_support', true,
  'analytics', true,
  'api_access', true,
  'white_label', false,
  'priority_support', true,
  'custom_domain', true,
  'team_collaboration', true
) WHERE name = 'Pro';

UPDATE subscription_tiers SET features = jsonb_build_object(
  'basic_support', true,
  'email_support', true,
  'analytics', true,
  'api_access', true,
  'white_label', true,
  'priority_support', true,
  'custom_domain', true,
  'team_collaboration', true,
  'dedicated_account_manager', true
) WHERE name = 'Business';
```

### 4. Test Upgrade/Downgrade Flow

1. **Test Free → Starter**: Should work smoothly
2. **Test Starter → Pro**: Should handle prorating
3. **Test Downgrade**: Pro → Starter should warn about feature loss
4. **Test Cancellation**: Should revert to Free tier

### 5. Add Trial Period (Optional but Recommended)

Consider offering a 7-day trial for paid plans:
```sql
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

UPDATE subscription_tiers SET trial_days = 7
WHERE name IN ('Starter', 'Pro', 'Business');
```

### 6. Ensure Smooth Migration for Existing Users

```sql
-- Check current active subscriptions
SELECT
  us.user_id,
  u.email,
  st.name as tier_name,
  us.status,
  us.created_at
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
JOIN auth.users u ON us.user_id = u.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;
```

## Testing Checklist

- [ ] Test payment flow with real card (small amount)
- [ ] Test subscription activation
- [ ] Test upgrade from Free to Starter
- [ ] Test upgrade from Starter to Pro
- [ ] Test cancellation
- [ ] Test limits enforcement (products, images, users)
- [ ] Test AI chat limits
- [ ] Verify Paystack webhook handling
- [ ] Check email notifications

## Monitor After Launch

1. **Paystack Dashboard**: Check for failed payments
2. **Supabase Logs**: Monitor Edge Function errors
3. **User Feedback**: Watch for confusion points
4. **Conversion Rate**: Track Free → Paid conversion

## Quick SQL to Run Now

```sql
-- 1. Fix unlimited products display
UPDATE subscription_tiers
SET max_products = 999999
WHERE name IN ('Pro', 'Business');

-- 2. Verify all tiers are active
UPDATE subscription_tiers
SET is_active = true
WHERE name IN ('Free', 'Starter', 'Pro', 'Business');

-- 3. Check plan codes are set
SELECT name,
       paystack_plan_code_monthly,
       paystack_plan_code_annual,
       price_monthly,
       price_annual,
       is_active
FROM subscription_tiers
ORDER BY display_order;
```