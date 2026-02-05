# 🎉 PAYSTACK SUBSCRIPTION - DEPLOYMENT STATUS

**Deployed:** December 30, 2024
**Status:** ✅ **BACKEND COMPLETE - MANUAL STEPS REQUIRED**

---

## ✅ WHAT'S BEEN DEPLOYED (BACKEND)

### 1. **Database Tables** ✅
- ✅ `payment_transactions` table created
- ✅ `subscription_tiers` updated with correct prices:
  - **Starter:** ₦5,000/month or ₦48,000/year (save ₦12,000)
  - **Pro:** ₦10,000/month or ₦96,000/year (save ₦24,000)
  - **Business:** ₦15,000/month or ₦144,000/year (save ₦36,000)
- ✅ Paystack plan code columns added

### 2. **Webhook Function** ✅
- ✅ Deployed to Supabase Functions
- ✅ URL: `https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook`
- ✅ Handles all Paystack events (subscription.create, charge.success, etc.)

### 3. **UI Component** ✅
- ✅ SubscriptionUpgrade.tsx exists and ready
- ✅ Beautiful pricing page with tier selection
- ✅ Paystack inline checkout integration

---

## ⚠️ MANUAL STEPS YOU MUST COMPLETE

These steps **MUST** be done before Paystack will work:

### **STEP 1: Get Paystack API Keys** (5 minutes)

1. Go to: https://dashboard.paystack.com/settings/developer
2. Copy your **Test Public Key** (starts with `pk_test_`)
3. Copy your **Test Secret Key** (starts with `sk_test_`)
4. Save them somewhere safe (you'll need them in next steps)

**For production later:**
- Use **Live Public Key** (`pk_live_`)
- Use **Live Secret Key** (`sk_live_`)

---

### **STEP 2: Set Environment Variables** (5 minutes)

#### **A. Frontend (Vercel)**

1. Go to: https://vercel.com/dashboard
2. Select your Storehouse project
3. Go to **Settings** → **Environment Variables**
4. Add this variable:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_PAYSTACK_PUBLIC_KEY` | `pk_test_your_key_here` | Production, Preview, Development |

5. Click **Save**
6. **Redeploy** your app (Vercel will prompt you)

#### **B. Backend (Supabase)**

```bash
# Set Paystack secret key for webhook function
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
```

---

### **STEP 3: Create Paystack Subscription Plans** (20 minutes)

You need to create **6 plans** in Paystack Dashboard (3 tiers × 2 billing cycles):

1. Go to: https://dashboard.paystack.com/plans
2. Click **"Create Plan"**

#### **Plan 1: Starter Monthly**
- Name: `Storehouse - Starter (Monthly)`
- Description: `Starter tier - monthly billing`
- Amount: `500000` (₦5,000 in kobo - Paystack uses kobo!)
- Interval: `Monthly`
- Currency: `NGN`
- Click **Create Plan**
- **📋 COPY THE PLAN CODE** (e.g., `PLN_abc123xyz`)

#### **Plan 2: Starter Annual**
- Name: `Storehouse - Starter (Annual)`
- Description: `Starter tier - annual billing (20% discount)`
- Amount: `4800000` (₦48,000 in kobo)
- Interval: `Annually`
- Currency: `NGN`
- **📋 COPY THE PLAN CODE**

#### **Plan 3: Pro Monthly**
- Name: `Storehouse - Pro (Monthly)`
- Amount: `1000000` (₦10,000 in kobo)
- Interval: `Monthly`
- **📋 COPY THE PLAN CODE**

#### **Plan 4: Pro Annual**
- Name: `Storehouse - Pro (Annual)`
- Amount: `9600000` (₦96,000 in kobo)
- Interval: `Annually`
- **📋 COPY THE PLAN CODE**

#### **Plan 5: Business Monthly**
- Name: `Storehouse - Business (Monthly)`
- Amount: `1500000` (₦15,000 in kobo)
- Interval: `Monthly`
- **📋 COPY THE PLAN CODE**

#### **Plan 6: Business Annual**
- Name: `Storehouse - Business (Annual)`
- Amount: `14400000` (₦144,000 in kobo)
- Interval: `Annually`
- **📋 COPY THE PLAN CODE**

---

### **STEP 4: Update Database with Plan Codes** (5 minutes)

Once you have all 6 plan codes, run this script:

```javascript
// save-plan-codes.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

async function savePlanCodes() {
  // Update Starter
  await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: 'PLN_your_starter_monthly_code',
      paystack_plan_code_annual: 'PLN_your_starter_annual_code'
    })
    .eq('name', 'Starter');

  // Update Pro
  await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: 'PLN_your_pro_monthly_code',
      paystack_plan_code_annual: 'PLN_your_pro_annual_code'
    })
    .eq('name', 'Pro');

  // Update Business
  await supabase
    .from('subscription_tiers')
    .update({
      paystack_plan_code_monthly: 'PLN_your_business_monthly_code',
      paystack_plan_code_annual: 'PLN_your_business_annual_code'
    })
    .eq('name', 'Business');

  console.log('✅ Plan codes saved!');
}

savePlanCodes();
```

**Or run this SQL in Supabase Dashboard:**

```sql
-- Update Starter
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_starter_monthly_code',
  paystack_plan_code_annual = 'PLN_your_starter_annual_code'
WHERE name = 'Starter';

-- Update Pro
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_pro_monthly_code',
  paystack_plan_code_annual = 'PLN_your_pro_annual_code'
WHERE name = 'Pro';

-- Update Business
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_business_monthly_code',
  paystack_plan_code_annual = 'PLN_your_business_annual_code'
WHERE name = 'Business';
```

---

### **STEP 5: Configure Paystack Webhook** (5 minutes)

1. Go to: https://dashboard.paystack.com/settings/developer
2. Scroll to **"Webhooks"** section
3. Click **"Add webhook URL"**
4. Enter: `https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook`
5. Click **"Test"** to verify it works
6. Click **"Save"**

---

### **STEP 6: Add Subscription UI to Your App** (10 minutes)

Add the SubscriptionUpgrade component to your app:

**Option 1: In Settings Page**
```tsx
import SubscriptionUpgrade from './components/SubscriptionUpgrade';

function SettingsPage() {
  return (
    <div>
      <h2>Subscription</h2>
      <SubscriptionUpgrade />
    </div>
  );
}
```

**Option 2: As a Route**
```tsx
// In AppRoutes.jsx
<Route path="/upgrade" element={<SubscriptionUpgrade />} />
```

---

## 🧪 TESTING (Use Paystack Test Mode)

### **Test Card Details:**
- **Card Number:** `4084084084084081`
- **CVV:** Any 3 digits
- **Expiry:** Any future date
- **PIN:** `1234`

### **Test Flow:**
1. Go to your app
2. Navigate to upgrade page
3. Click "Upgrade to Pro"
4. Select billing cycle (Monthly/Annual)
5. Click "Upgrade Now"
6. Enter test card details
7. Complete payment
8. Check user is upgraded

### **Verify in Database:**
```sql
-- Check user subscription
SELECT * FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Check payment transaction
SELECT * FROM payment_transactions WHERE user_id = 'YOUR_USER_ID';
```

### **Check Webhook Logs:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c supabase functions logs paystack-webhook
```

---

## 📋 FINAL CHECKLIST

Before going live:

- [ ] ✅ Database tables created (payment_transactions, subscription_tiers)
- [ ] ✅ Webhook function deployed to Supabase
- [ ] ⚠️  Paystack API keys obtained
- [ ] ⚠️  Environment variables set (VITE_PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY)
- [ ] ⚠️  6 plans created in Paystack Dashboard
- [ ] ⚠️  Plan codes saved to database
- [ ] ⚠️  Webhook URL configured in Paystack
- [ ] ⚠️  SubscriptionUpgrade component added to app
- [ ] ⚠️  Test subscription flow works
- [ ] ⚠️  Webhook receives events (check logs)
- [ ] ⚠️  User subscription updates correctly

---

## 🎯 QUICK START COMMANDS

```bash
# 1. Set Supabase secret (replace with your key)
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_KEY

# 2. Check webhook logs
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c supabase functions logs paystack-webhook

# 3. Check current status
node check-paystack-status.js
```

---

## 🚨 IMPORTANT NOTES

### **Test Mode vs Live Mode:**
- **Test Mode:** Use `pk_test_` and `sk_test_` keys
- **Live Mode:** Use `pk_live_` and `sk_live_` keys
- **Switch to Live:** Update environment variables and create live plans

### **Pricing in Kobo:**
Paystack uses **kobo** (Nigerian currency subunit):
- ₦1 = 100 kobo
- ₦5,000 = 500,000 kobo
- ₦10,000 = 1,000,000 kobo

### **Webhook Security:**
- Webhook function verifies Paystack signature (HMAC SHA512)
- Never exposes secret key to frontend
- Uses service role key for database operations

### **Subscription Flow:**
1. User clicks "Upgrade"
2. Paystack popup opens (inline checkout)
3. User enters payment details
4. Paystack processes payment
5. Paystack sends webhook to your function
6. Webhook updates user subscription in database
7. User sees upgraded account

---

## 📞 SUPPORT & HELP

### **Paystack Issues:**
- Docs: https://paystack.com/docs/
- Support: support@paystack.com
- Test Dashboard: https://dashboard.paystack.com/

### **Supabase Issues:**
- Functions Logs: `supabase functions logs paystack-webhook`
- Dashboard: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl

### **Common Issues:**

**Issue: Payment succeeds but user not upgraded**
- Check webhook logs
- Verify webhook URL in Paystack
- Check PAYSTACK_SECRET_KEY is set correctly

**Issue: Paystack popup doesn't show**
- Check VITE_PAYSTACK_PUBLIC_KEY is set
- Redeploy after adding environment variable
- Check browser console for errors

**Issue: Wrong plan code error**
- Verify plan codes in database match Paystack
- Check you're using correct keys (test vs live)

---

## 🎊 WHAT'S NEXT (PHASE 2 - Optional)

After testing and confirming everything works:

1. **Self-Service Cancellation** - Let users cancel subscriptions
2. **Billing History** - Show past payments and invoices
3. **Email Notifications** - Payment receipts, failed payments
4. **Admin Dashboard** - View all subscriptions and revenue
5. **Failed Payment Retry** - Auto-retry failed payments

---

## 📄 FILES REFERENCE

**Frontend:**
- `/src/components/SubscriptionUpgrade.tsx` - Pricing UI
- `.env.local` - Add `VITE_PAYSTACK_PUBLIC_KEY`

**Backend:**
- `/supabase/functions/paystack-webhook/index.ts` - Webhook handler
- `/supabase/migrations/20241226000001_payment_transactions.sql` - Database
- `/supabase/migrations/20241226000002_add_paystack_plan_codes.sql` - Plan codes

**Documentation:**
- `/PAYSTACK_SUBSCRIPTION_SETUP.md` - Original setup guide
- `/PAYSTACK_DEPLOYMENT_COMPLETE.md` - This file

---

**STATUS:** ✅ Backend deployed, ⚠️  Manual steps required

**Next Action:** Complete STEP 1-6 above to go live!

**Questions?** Check the troubleshooting section or Paystack docs.

---

**End of Deployment Guide**
