# Live Production Testing Checklist

## Pre-Launch Checks

### 1. Environment Variables
- [ ] Updated `VITE_PAYSTACK_PUBLIC_KEY` to `pk_live_...` in Vercel
- [ ] Updated `PAYSTACK_SECRET_KEY` to `sk_live_...` in Supabase Edge Functions
- [ ] Verified no test keys are in production

### 2. Paystack Dashboard Setup
- [ ] Created live subscription plans in Paystack
- [ ] Updated database with live plan codes
- [ ] Set up webhook URL in Paystack (if using webhooks)

### 3. Database Preparation
- [ ] All subscription_tiers have live plan codes
- [ ] Cleared any test subscriptions from production database

## Live Testing Steps

### Step 1: Small Test Payment
1. Create a test account with a different email
2. Try subscribing to the **cheapest plan** (Starter - ₦5,000)
3. Use a real card with small amount
4. Verify:
   - [ ] Payment goes through
   - [ ] Subscription activates immediately
   - [ ] Database shows correct subscription
   - [ ] User can access paid features

### Step 2: Verify in Paystack Dashboard
1. Go to https://dashboard.paystack.com/
2. Switch to **Live Mode**
3. Check:
   - [ ] Transaction appears in Transactions list
   - [ ] Subscription appears in Subscriptions list
   - [ ] Customer is created
   - [ ] Payment amount is correct

### Step 3: Test Subscription Features
- [ ] Verify user can access tier-specific features
- [ ] Check product limits are enforced
- [ ] Test AI chat limits (if applicable)
- [ ] Confirm image upload limits

### Step 4: Test Edge Cases
- [ ] Cancel subscription and verify it works
- [ ] Try upgrading between plans
- [ ] Test with insufficient funds (should fail gracefully)
- [ ] Check monthly renewal (wait or simulate)

### Step 5: Monitor for Issues
- [ ] Check browser console for errors
- [ ] Monitor Supabase Edge Function logs
- [ ] Review Paystack dashboard for failed payments
- [ ] Check user feedback/support tickets

## Rollback Plan

If issues occur:
1. Immediately switch back to test keys
2. Document the issue
3. Fix in test environment
4. Re-deploy and test again

## Important URLs

- Paystack Dashboard: https://dashboard.paystack.com/
- Paystack Live Transactions: https://dashboard.paystack.com/#/transactions
- Paystack Live Subscriptions: https://dashboard.paystack.com/#/subscriptions
- Supabase Dashboard: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl
- Edge Function Logs: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/functions

## Support Contacts

- Paystack Support: support@paystack.com
- Paystack Status: https://status.paystack.com/

## Notes

- Paystack charges 1.5% + ₦100 per successful transaction
- First live transaction may take a few minutes to process
- Keep test and live environments completely separate
- Always test with small amounts first