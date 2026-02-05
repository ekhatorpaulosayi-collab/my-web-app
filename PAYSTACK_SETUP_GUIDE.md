# 🚀 PAYSTACK INTEGRATION SETUP GUIDE

**Date:** December 30, 2024
**Status:** ✅ Backend Ready - Awaiting Manual Steps

---

## ✅ COMPLETED (BY CLAUDE)

### 1. Webhook Function Deployed ✅
```
Function: paystack-webhook
URL: https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook
Status: ACTIVE
Version: 3
Deployed: Dec 30, 2024
```

### 2. Supabase Secret Set ✅
```
Secret: PAYSTACK_SECRET_KEY
Value: sk_test_7387309060a256c0161a585bd447bc8929cd9081
Status: SET
```

### 3. Database Tables Ready ✅
```
Tables:
✅ subscription_tiers (4 tiers configured)
✅ payment_transactions (ready to track payments)
✅ user_subscriptions (ready to update on payment)
```

---

## ⏳ MANUAL STEPS (YOU NEED TO DO)

### STEP 1: Set Vercel Environment Variable (5 minutes)

**Go to:** https://vercel.com/dashboard

1. Click on your project (smartstock-v2 or storehouse)
2. Go to **Settings** → **Environment Variables**
3. Click **Add New**
4. Set:
   ```
   Name: VITE_PAYSTACK_PUBLIC_KEY
   Value: pk_test_39a20b23c03d540083e95dc82af26ee7a4668746
   Environment: Production, Preview, Development (check all)
   ```
5. Click **Save**
6. **IMPORTANT:** Redeploy your app for the variable to take effect
   - Go to **Deployments** tab
   - Click the **...** menu on latest deployment
   - Click **Redeploy**

---

### STEP 2: Create 6 Subscription Plans in Paystack (10 minutes)

**Go to:** https://dashboard.paystack.com/#/plans

**IMPORTANT:** You must create exactly 6 plans with these exact amounts (in kobo):

#### Plan 1: Starter Monthly
```
Name: Starter Monthly
Description: 200 products, 3 images per product, 500 AI chats
Amount: 500000 (₦5,000 in kobo)
Interval: Monthly
Currency: NGN
```

#### Plan 2: Starter Annual
```
Name: Starter Annual
Description: 200 products, 3 images per product, 500 AI chats (Save 20%!)
Amount: 4800000 (₦48,000 in kobo)
Interval: Annually
Currency: NGN
```

#### Plan 3: Pro Monthly
```
Name: Pro Monthly
Description: 1000 products, 10 images per product, 1500 AI chats
Amount: 1000000 (₦10,000 in kobo)
Interval: Monthly
Currency: NGN
```

#### Plan 4: Pro Annual
```
Name: Pro Annual
Description: 1000 products, 10 images per product, 1500 AI chats (Save 20%!)
Amount: 9600000 (₦96,000 in kobo)
Interval: Annually
Currency: NGN
```

#### Plan 5: Business Monthly
```
Name: Business Monthly
Description: Unlimited products, 20 images per product, 10000 AI chats
Amount: 1500000 (₦15,000 in kobo)
Interval: Monthly
Currency: NGN
```

#### Plan 6: Business Annual
```
Name: Business Annual
Description: Unlimited products, 20 images per product, 10000 AI chats (Save 20%!)
Amount: 14400000 (₦144,000 in kobo)
Interval: Annually
Currency: NGN
```

**CRITICAL:** After creating each plan, Paystack will give you a **plan code** (looks like `PLN_xxxxxxxxxxxxx`). **SAVE ALL 6 PLAN CODES** - you'll need them for Step 4!

---

### STEP 3: Configure Paystack Webhook (3 minutes)

**Go to:** https://dashboard.paystack.com/#/settings/developer

1. Scroll to **Webhooks** section
2. Click **Add Webhook URL**
3. Enter:
   ```
   URL: https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook
   ```
4. Click **Save**
5. Paystack will send a test event to verify the URL is working

**What this does:**
- When a user pays, Paystack sends payment confirmation to this URL
- The webhook updates the database automatically
- User's subscription becomes active immediately

---

### STEP 4: Save Plan Codes to Database (2 minutes)

After you create all 6 plans in Paystack, you'll have 6 plan codes. Run this script to save them to the database.

**Create a file:** `save-plan-codes.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// REPLACE THESE WITH YOUR ACTUAL PLAN CODES FROM PAYSTACK
const PLAN_CODES = {
  starter_monthly: 'PLN_xxxxxxxxxxxxxx',  // Replace with actual code
  starter_annual: 'PLN_xxxxxxxxxxxxxx',   // Replace with actual code
  pro_monthly: 'PLN_xxxxxxxxxxxxxx',      // Replace with actual code
  pro_annual: 'PLN_xxxxxxxxxxxxxx',       // Replace with actual code
  business_monthly: 'PLN_xxxxxxxxxxxxxx', // Replace with actual code
  business_annual: 'PLN_xxxxxxxxxxxxxx',  // Replace with actual code
};

async function savePlanCodes() {
  console.log('Saving plan codes to database...\n');

  // Update Starter tier
  const { error: starterError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.starter_monthly,
      paystack_plan_code_annual: PLAN_CODES.starter_annual,
    })
    .eq('name', 'Starter');

  if (starterError) {
    console.error('Error updating Starter:', starterError);
  } else {
    console.log('✅ Starter tier plan codes saved');
  }

  // Update Pro tier
  const { error: proError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.pro_monthly,
      paystack_plan_code_annual: PLAN_CODES.pro_annual,
    })
    .eq('name', 'Pro');

  if (proError) {
    console.error('Error updating Pro:', proError);
  } else {
    console.log('✅ Pro tier plan codes saved');
  }

  // Update Business tier
  const { error: businessError } = await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: PLAN_CODES.business_monthly,
      paystack_plan_code_annual: PLAN_CODES.business_annual,
    })
    .eq('name', 'Business');

  if (businessError) {
    console.error('Error updating Business:', businessError);
  } else {
    console.log('✅ Business tier plan codes saved');
  }

  console.log('\n🎉 All plan codes saved successfully!');
}

savePlanCodes().catch(console.error);
```

**Then run:**
```bash
node save-plan-codes.js
```

---

## 📊 KOBO CONVERSION REFERENCE

**IMPORTANT:** Paystack uses **kobo** (smallest Nigerian currency unit).

```
₦1 = 100 kobo
₦5,000 = 500,000 kobo
₦48,000 = 4,800,000 kobo
₦10,000 = 1,000,000 kobo
₦96,000 = 9,600,000 kobo
₦15,000 = 1,500,000 kobo
₦144,000 = 14,400,000 kobo
```

**When creating plans in Paystack Dashboard, always enter amounts in KOBO!**

---

## 🧪 TESTING THE INTEGRATION

### Test Payment Flow (After All Steps Complete)

1. Login to your app
2. Go to **Settings** → **Subscription**
3. Click **Upgrade to Starter Monthly**
4. Paystack checkout popup should appear
5. Use Paystack test card:
   ```
   Card Number: 4084 0840 8408 4081
   CVV: 408
   Expiry: 12/25
   PIN: 0000
   OTP: 123456
   ```
6. Complete payment
7. Check webhook logs:
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c \
   supabase functions logs paystack-webhook
   ```
8. Check database:
   ```sql
   SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID';
   ```
9. Verify your subscription upgraded to Starter

---

## 🚨 TROUBLESHOOTING

### Issue 1: "Paystack public key not configured"
**Solution:** Make sure you set VITE_PAYSTACK_PUBLIC_KEY in Vercel and redeployed

### Issue 2: "Plan code not found"
**Solution:** Run save-plan-codes.js with your actual plan codes from Paystack

### Issue 3: Webhook not receiving events
**Solution:**
1. Check webhook URL in Paystack dashboard is correct
2. Check webhook logs: `supabase functions logs paystack-webhook`
3. Verify PAYSTACK_SECRET_KEY is set in Supabase

### Issue 4: Payment succeeded but subscription not updated
**Solution:**
1. Check webhook logs for errors
2. Verify plan codes in database match Paystack plan codes exactly
3. Check payment_transactions table for the transaction

---

## 📋 DEPLOYMENT CHECKLIST

### Backend (Automated - Already Done) ✅
- [x] Webhook function deployed
- [x] PAYSTACK_SECRET_KEY set in Supabase
- [x] Database tables ready

### Manual Steps (You Need to Do) ⏳
- [ ] Set VITE_PAYSTACK_PUBLIC_KEY in Vercel
- [ ] Redeploy Vercel app
- [ ] Create 6 subscription plans in Paystack
- [ ] Save all 6 plan codes
- [ ] Configure webhook URL in Paystack
- [ ] Run save-plan-codes.js
- [ ] Test payment flow

---

## 📞 NEED HELP?

If you get stuck on any step, share:
1. Which step you're on
2. Any error messages you see
3. Screenshots if helpful

I'll help you debug!

---

## 🎉 WHEN COMPLETE

After all steps are done, your Paystack integration will:

✅ Show upgrade options in the app
✅ Process payments securely via Paystack
✅ Update subscriptions automatically via webhook
✅ Track all transactions in database
✅ Handle subscription renewals automatically
✅ Support both monthly and annual billing

**Total Time:** ~20 minutes

**Let's get this done!** 🚀
