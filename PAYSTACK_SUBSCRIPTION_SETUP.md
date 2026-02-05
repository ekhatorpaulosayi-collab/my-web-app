# Paystack Subscription Integration - Setup Guide

**Created:** December 26, 2024
**Phase:** Phase 1 - Basic Subscription & Webhook

---

## 🎯 WHAT'S BEEN IMPLEMENTED

### ✅ **Backend (Database & Functions)**
1. **payment_transactions** table - Tracks all payment records
2. **Paystack plan code columns** added to subscription_tiers table
3. **Supabase Edge Function** for webhook receiver (`/supabase/functions/paystack-webhook`)

### ✅ **Frontend (UI Components)**
1. **SubscriptionUpgrade component** - Beautiful pricing page with tier selection
2. **Paystack Inline Checkout** integration
3. **Real-time subscription status** display

---

## 📋 SETUP INSTRUCTIONS (MUST DO BEFORE GOING LIVE)

### **STEP 1: Create Paystack Plans** (30 minutes)

1. **Login to Paystack Dashboard**
   - Go to: https://dashboard.paystack.com/
   - Login with your Paystack account

2. **Navigate to Plans**
   - Click "Plans" in left sidebar
   - Or go to: https://dashboard.paystack.com/plans

3. **Create 6 Plans** (3 tiers × 2 billing cycles)

#### **Starter Plans:**

**Starter Monthly:**
- Name: `Storehouse - Starter (Monthly)`
- Description: `Starter tier - monthly billing`
- Amount: `500000` (₦5,000 in kobo)
- Interval: `Monthly`
- Currency: `NGN`

**Starter Annual:**
- Name: `Storehouse - Starter (Annual)`
- Description: `Starter tier - annual billing (20% discount)`
- Amount: `4800000` (₦48,000 in kobo)
- Interval: `Annually`
- Currency: `NGN`

#### **Pro Plans:**

**Pro Monthly:**
- Name: `Storehouse - Pro (Monthly)`
- Description: `Pro tier - monthly billing`
- Amount: `1000000` (₦10,000 in kobo)
- Interval: `Monthly`
- Currency: `NGN`

**Pro Annual:**
- Name: `Storehouse - Pro (Annual)`
- Description: `Pro tier - annual billing (20% discount)`
- Amount: `9600000` (₦96,000 in kobo)
- Interval: `Annually`
- Currency: `NGN`

#### **Business Plans:**

**Business Monthly:**
- Name: `Storehouse - Business (Monthly)`
- Description: `Business tier - monthly billing`
- Amount: `1500000` (₦15,000 in kobo)
- Interval: `Monthly`
- Currency: `NGN`

**Business Annual:**
- Name: `Storehouse - Business (Annual)`
- Description: `Business tier - annual billing (20% discount)`
- Amount: `14400000` (₦144,000 in kobo)
- Interval: `Annually`
- Currency: `NGN`

4. **Copy Plan Codes**
   - After creating each plan, copy the **Plan Code** (e.g., `PLN_abc123xyz`)
   - Save these codes - you'll need them in Step 2

---

### **STEP 2: Update Database with Plan Codes** (5 minutes)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Update Starter tier
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_starter_monthly_code_here',
  paystack_plan_code_annual = 'PLN_your_starter_annual_code_here'
WHERE name = 'Starter';

-- Update Pro tier
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_pro_monthly_code_here',
  paystack_plan_code_annual = 'PLN_your_pro_annual_code_here'
WHERE name = 'Pro';

-- Update Business tier
UPDATE subscription_tiers
SET
  paystack_plan_code_monthly = 'PLN_your_business_monthly_code_here',
  paystack_plan_code_annual = 'PLN_your_business_annual_code_here'
WHERE name = 'Business';
```

**Replace** the placeholder codes with your actual Paystack plan codes!

---

### **STEP 3: Deploy Webhook Function** (10 minutes)

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Your Project**
   ```bash
   supabase link --project-ref yzlniqwzqlsftxrtapdl
   ```

4. **Deploy Webhook Function**
   ```bash
   supabase functions deploy paystack-webhook
   ```

5. **Copy Webhook URL**
   - After deployment, you'll get a URL like:
   ```
   https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook
   ```
   - Save this URL - you'll need it in Step 4

---

### **STEP 4: Configure Paystack Webhook** (5 minutes)

1. **Go to Paystack Webhooks Settings**
   - URL: https://dashboard.paystack.com/settings/developer

2. **Add Webhook URL**
   - Click "Add webhook URL"
   - Enter your webhook URL from Step 3
   - Example: `https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook`

3. **Test Webhook**
   - Click "Test" next to your webhook URL
   - Select event: `subscription.create`
   - Click "Send Test"
   - Check Supabase function logs to confirm it received the test

4. **Save Webhook**
   - Click "Save" to activate the webhook

---

### **STEP 5: Set Environment Variables** (5 minutes)

#### **Supabase Secrets (for webhook function):**

```bash
# Set Paystack secret key
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here

# Or for testing:
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key_here
```

#### **Vercel Environment Variables (for frontend):**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add:
- **Variable:** `VITE_PAYSTACK_PUBLIC_KEY`
- **Value:** `pk_live_your_public_key_here` (or `pk_test_...` for testing)
- **Environments:** Production, Preview, Development

---

### **STEP 6: Run Database Migrations** (2 minutes)

Apply the new migrations to your database:

```bash
# Push migrations to Supabase
supabase db push
```

Or manually run the SQL files in Supabase SQL Editor:
1. `/supabase/migrations/20241226_payment_transactions.sql`
2. `/supabase/migrations/20241226_add_paystack_plan_codes.sql`

---

### **STEP 7: Deploy to Production** (5 minutes)

```bash
# Build production
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🧪 TESTING THE INTEGRATION

### **Test Mode (Recommended First)**

1. **Use Paystack Test Keys**
   - Public Key: `pk_test_...`
   - Secret Key: `sk_test_...`

2. **Test Card Numbers**
   - **Success:** `4084084084084081`
   - **Insufficient Funds:** `5060666666666666666`
   - **CVV:** Any 3 digits
   - **Expiry:** Any future date
   - **PIN:** `1234`

3. **Test Flow**
   - Go to your app
   - Click "Upgrade to Pro"
   - Select billing cycle (monthly/annual)
   - Click "Upgrade Now"
   - Enter test card: `4084084084084081`
   - Complete payment
   - Check that user is upgraded

4. **Verify in Supabase**
   ```sql
   -- Check user subscription
   SELECT * FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID';

   -- Check payment transactions
   SELECT * FROM payment_transactions WHERE user_id = 'YOUR_USER_ID';
   ```

5. **Check Webhook Logs**
   ```bash
   supabase functions logs paystack-webhook
   ```

---

## 🔍 VERIFYING EVERYTHING WORKS

### **Checklist:**

- [ ] Plans created in Paystack dashboard (6 plans)
- [ ] Plan codes saved in database (subscription_tiers table)
- [ ] Webhook function deployed to Supabase
- [ ] Webhook URL configured in Paystack dashboard
- [ ] Environment variables set (PAYSTACK_SECRET_KEY, VITE_PAYSTACK_PUBLIC_KEY)
- [ ] Database migrations applied
- [ ] App deployed to production
- [ ] Test subscription upgrade works
- [ ] Payment transaction recorded in database
- [ ] User subscription updated correctly
- [ ] Webhook receives and processes events

---

## 🎨 HOW TO USE THE UPGRADE UI

### **Add to Your App:**

**Option 1: As a Modal**
```tsx
import SubscriptionUpgrade from './components/SubscriptionUpgrade';

function SettingsPage() {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <button onClick={() => setShowUpgrade(true)}>
        Upgrade Plan
      </button>

      {showUpgrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SubscriptionUpgrade onClose={() => setShowUpgrade(false)} />
          </div>
        </div>
      )}
    </>
  );
}
```

**Option 2: As a Page**
```tsx
// In your routing
<Route path="/upgrade" element={<SubscriptionUpgrade />} />
```

**Option 3: In Settings Section**
```tsx
function SubscriptionSettings() {
  return (
    <div>
      <h2>Subscription</h2>
      <SubscriptionUpgrade />
    </div>
  );
}
```

---

## 📊 MONITORING & MAINTENANCE

### **Check Payment Status**
```sql
-- Today's successful payments
SELECT
  COUNT(*) as payment_count,
  SUM(amount) as total_revenue
FROM payment_transactions
WHERE status = 'success'
AND DATE(created_at) = CURRENT_DATE;

-- Failed payments (needs attention)
SELECT *
FROM payment_transactions
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **Check Active Subscriptions**
```sql
-- Active paid subscriptions
SELECT
  st.name as tier,
  COUNT(*) as subscriber_count
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.status = 'active'
AND st.name != 'Free'
GROUP BY st.name;
```

### **Monitor Webhook Health**
```bash
# View recent webhook logs
supabase functions logs paystack-webhook --tail

# Check for errors
supabase functions logs paystack-webhook | grep ERROR
```

---

## ⚠️ TROUBLESHOOTING

### **Issue: Payment successful but user not upgraded**

**Check:**
1. Webhook logs: `supabase functions logs paystack-webhook`
2. Payment transactions table: Does transaction exist?
3. User subscriptions table: Was tier_id updated?
4. Paystack webhook configuration: Is URL correct?

**Solution:**
- Manually update user subscription:
```sql
UPDATE user_subscriptions
SET tier_id = (SELECT id FROM subscription_tiers WHERE name = 'Pro'),
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = 'USER_ID';
```

---

### **Issue: Webhook signature verification fails**

**Check:**
1. Is `PAYSTACK_SECRET_KEY` set correctly in Supabase secrets?
2. Are you using test key for test webhooks and live key for live webhooks?

**Solution:**
```bash
# Update secret key
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_correct_key
```

---

### **Issue: User can't see upgrade UI**

**Check:**
1. Is `VITE_PAYSTACK_PUBLIC_KEY` set in Vercel?
2. Did you redeploy after adding environment variable?
3. Check browser console for errors

**Solution:**
- Add environment variable in Vercel
- Redeploy: `vercel --prod`

---

## 🚀 NEXT STEPS (Phase 2 - Optional)

After Phase 1 is working and you have paying customers, consider:

1. **Self-Service Cancellation UI**
   - Let users cancel without emailing support
   - Show cancellation confirmation
   - Keep access until period ends

2. **Billing History Page**
   - Show all past payments
   - Download invoices
   - View upcoming renewals

3. **Email Notifications**
   - Welcome email on upgrade
   - Payment receipt emails
   - Failed payment alerts
   - Renewal reminders

4. **Admin Dashboard**
   - View all subscriptions
   - Monthly revenue charts
   - Churn analytics
   - Failed payment tracking

5. **Failed Payment Retry**
   - Auto-retry failed payments
   - Grace period before downgrade
   - Smart retry logic (3 attempts over 7 days)

---

## 📞 SUPPORT & HELP

### **Paystack Support:**
- Docs: https://paystack.com/docs/
- Email: support@paystack.com
- Twitter: @PaystackHQ

### **Supabase Support:**
- Docs: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions

---

## 📝 IMPORTANT NOTES

1. **Test Everything First**
   - Use test mode before going live
   - Test all payment scenarios (success, failure, cancellation)
   - Verify webhook receives all events

2. **Security**
   - Never commit secret keys to Git
   - Always verify webhook signatures
   - Use environment variables for all keys

3. **Paystack Fees**
   - Paystack charges: 1.5% + ₦100 per transaction
   - Plan your pricing to account for fees
   - Example: ₦10,000 payment → You receive ₦9,750

4. **User Experience**
   - Clearly communicate billing cycle
   - Show what features they get
   - Make cancellation easy (builds trust)

5. **Legal**
   - Add Terms of Service
   - Add Refund Policy
   - GDPR compliance (if applicable)

---

**End of Setup Guide**

**Questions or Issues?** Check troubleshooting section or contact support.
