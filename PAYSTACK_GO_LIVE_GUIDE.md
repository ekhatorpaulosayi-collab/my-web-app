# 🚀 PAYSTACK GO LIVE GUIDE

**Complete step-by-step guide to switch from test mode to live payments**

---

## 📋 PREREQUISITES CHECKLIST

Before you can go live, Paystack requires:

- [ ] Business registered in Nigeria
- [ ] Valid business registration documents (CAC certificate)
- [ ] Bank account in your business name
- [ ] Valid ID (National ID, Driver's License, or International Passport)
- [ ] Proof of address (utility bill, bank statement)
- [ ] Business website/app (you have this! ✅)

---

## PHASE 1: ACTIVATE YOUR PAYSTACK ACCOUNT (10-30 minutes)

### Step 1: Submit Business Information

**Go to:** https://dashboard.paystack.com/#/settings/preferences

1. Click **"Activate Your Account"** or **"Go Live"** button
2. Fill in business details:
   - **Business Name:** Storehouse (or your registered business name)
   - **Business Type:** Select appropriate type (e.g., "Limited Liability Company", "Sole Proprietorship")
   - **Business Address:** Your registered business address
   - **Business Phone:** Your business phone number
   - **Business Email:** Your business email
   - **RC Number:** Your CAC registration number (if incorporated)

3. Click **"Save"** or **"Continue"**

---

### Step 2: Upload Required Documents

**Still in Settings → Preferences:**

Upload these documents:
1. **Certificate of Incorporation (CAC)** (if registered company)
   - Or Business Registration Certificate (for sole proprietor)
2. **Valid ID** (Director/Owner)
   - National ID, Driver's License, or International Passport
3. **Proof of Address**
   - Utility bill (NEPA, water bill) dated within last 3 months
   - Or bank statement showing your address

**File Requirements:**
- Format: PDF, JPG, or PNG
- Size: Max 5MB per file
- Clear and readable

---

### Step 3: Add Settlement Bank Account

**Go to:** https://dashboard.paystack.com/#/settings/banks

1. Click **"Add Bank Account"**
2. Enter:
   - **Bank Name:** Select your bank
   - **Account Number:** Your business account number
   - **Account Name:** Should match your business name
3. Paystack will verify the account (takes a few seconds)
4. Click **"Save"**

**IMPORTANT:** The account name MUST match your registered business name!

---

### Step 4: Submit for Review

After uploading all documents:
1. Review all information
2. Click **"Submit for Review"** or **"Activate Account"**
3. Paystack will review (usually takes 24-48 hours, sometimes instant)

---

### Step 5: Wait for Approval

You'll receive an email when approved:
- ✅ Subject: "Your Paystack account is now live!"
- ✅ You can now accept real payments

**While waiting:** You can continue testing with test mode!

---

## PHASE 2: GET LIVE API KEYS (2 minutes)

**After account is approved:**

### Step 1: Get Live Keys

**Go to:** https://dashboard.paystack.com/#/settings/developer

1. Toggle to **"Live Mode"** (switch at top of page)
2. Find **"API Keys"** section
3. Copy both keys:
   - **Live Public Key:** Starts with `pk_live_...`
   - **Live Secret Key:** Starts with `sk_live_...`

**IMPORTANT:** Keep the secret key SECURE! Never share it or commit to GitHub!

---

## PHASE 3: CREATE LIVE SUBSCRIPTION PLANS (10 minutes)

### Step 1: Switch to Live Mode

**Go to:** https://dashboard.paystack.com/#/plans

1. Toggle to **"Live Mode"** at top of dashboard
2. Click **"Create Plan"**

### Step 2: Create All 6 Plans

Create the same 6 plans you created in test mode:

#### Plan 1: Starter Monthly
```
Name: Starter Monthly
Amount: 5000 (₦5,000)
Interval: Monthly
Currency: NGN
Description: 200 products, 3 images per product, 500 AI chats
```

#### Plan 2: Starter Annual
```
Name: Starter Annual
Amount: 48000 (₦48,000)
Interval: Annually
Currency: NGN
Description: 200 products, 3 images per product, 500 AI chats (Save 20%!)
```

#### Plan 3: Pro Monthly
```
Name: Pro Monthly
Amount: 10000 (₦10,000)
Interval: Monthly
Currency: NGN
Description: 1000 products, 10 images per product, 1500 AI chats
```

#### Plan 4: Pro Annual
```
Name: Pro Annual
Amount: 96000 (₦96,000)
Interval: Annually
Currency: NGN
Description: 1000 products, 10 images per product, 1500 AI chats (Save 20%!)
```

#### Plan 5: Business Monthly
```
Name: Business Monthly
Amount: 15000 (₦15,000)
Interval: Monthly
Currency: NGN
Description: Unlimited products, 20 images per product, 10000 AI chats
```

#### Plan 6: Business Annual
```
Name: Business Annual
Amount: 144000 (₦144,000)
Interval: Annually
Currency: NGN
Description: Unlimited products, 20 images per product, 10000 AI chats (Save 20%!)
```

### Step 3: Save All Live Plan Codes

After creating each plan, **SAVE THE PLAN CODE** (PLN_xxxxxxxxxxxxx)

You'll need all 6 live plan codes for the next phase.

---

## PHASE 4: UPDATE YOUR APPLICATION (15 minutes)

### Step 1: Update Supabase Secret Key

```bash
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c \
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

Replace `sk_live_YOUR_LIVE_SECRET_KEY` with your actual live secret key from Phase 2.

---

### Step 2: Update Vercel Environment Variable

**Go to:** https://vercel.com/dashboard

1. Click your project → Settings → Environment Variables
2. Find `VITE_PAYSTACK_PUBLIC_KEY`
3. Click **Edit**
4. Replace value with your **live public key** from Phase 2:
   ```
   pk_live_YOUR_LIVE_PUBLIC_KEY
   ```
5. Click **Save**
6. **IMPORTANT:** Redeploy your app
   - Go to Deployments tab
   - Click ⋯ menu on latest deployment
   - Click "Redeploy"

---

### Step 3: Update Plan Codes in Database

1. Open `save-plan-codes.js`
2. Replace the test plan codes with your **live plan codes** from Phase 3:

```javascript
const PLAN_CODES = {
  starter_monthly: 'PLN_your_live_code_here',   // Replace with live code
  starter_annual: 'PLN_your_live_code_here',    // Replace with live code
  pro_monthly: 'PLN_your_live_code_here',       // Replace with live code
  pro_annual: 'PLN_your_live_code_here',        // Replace with live code
  business_monthly: 'PLN_your_live_code_here',  // Replace with live code
  business_annual: 'PLN_your_live_code_here',   // Replace with live code
};
```

3. Run the script:
```bash
node save-plan-codes.js
```

4. Verify it worked:
```bash
node check-paystack-ready.js
```

---

### Step 4: Configure Live Webhook URL

**Go to:** https://dashboard.paystack.com/#/settings/developer

1. Toggle to **"Live Mode"**
2. Scroll to **"Webhooks"** section
3. In **"Live Webhook URL"** field, enter:
   ```
   https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook
   ```
4. Click **Save**

---

## PHASE 5: TEST LIVE PAYMENTS (10 minutes)

### Step 1: Make a Real Test Payment

**IMPORTANT:** You'll need to use a REAL card and make a REAL payment (you can refund it later).

1. Login to your app
2. Go to Settings → Subscription
3. Click **"Upgrade to Starter Monthly"** (cheapest plan - ₦5,000)
4. Paystack checkout should appear
5. **Use a REAL Nigerian debit/credit card** (not test card!)
6. Enter real card details
7. Complete payment with OTP from your bank

---

### Step 2: Verify Payment Worked

**Check webhook received the payment:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c \
supabase functions logs paystack-webhook
```

Look for log showing successful payment processing.

**Check database updated:**
```bash
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A'
);
const { data } = await supabase
  .from('payment_transactions')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);
console.log('Latest payment:', data);
"
```

**Check your subscription upgraded:**
- Refresh the app
- You should now have Starter tier features (200 products, 3 images, 500 AI chats)

---

### Step 3: Refund Test Payment (Optional)

**Go to:** https://dashboard.paystack.com/#/transactions

1. Find your test transaction
2. Click on it
3. Click **"Refund"**
4. Enter refund amount (₦5,000)
5. Confirm

Money will be returned to your card within 24 hours.

---

## PHASE 6: GO LIVE! 🚀

If everything worked in Phase 5:

✅ **Your Paystack integration is LIVE!**
✅ **You can now accept real payments from customers!**

---

## 🚨 IMPORTANT SECURITY NOTES

### 1. Protect Your Live Secret Key
- ❌ Never commit to GitHub
- ❌ Never share in Slack/Discord
- ❌ Never expose in frontend code
- ✅ Only store in Supabase secrets (already done)

### 2. Monitor Transactions
Check your Paystack dashboard daily:
- https://dashboard.paystack.com/#/transactions

### 3. Check Settlement Schedule
Paystack settles to your bank account:
- **T+1** (next business day) for most businesses
- Check: https://dashboard.paystack.com/#/settlements

### 4. Enable 2FA on Paystack
**Go to:** https://dashboard.paystack.com/#/settings/profile
- Enable Two-Factor Authentication
- Use Google Authenticator or similar

---

## 📊 PAYSTACK FEES (Important!)

Paystack charges per transaction:

### Local Cards (Nigerian cards):
- **1.5% + ₦100** per transaction
- Example: ₦5,000 payment = ₦175 fee, you receive ₦4,825

### International Cards:
- **3.9% + ₦100** per transaction

### Bank Transfer (if enabled):
- **₦50** flat fee (max ₦100)

**You receive:** Payment amount - Paystack fee

---

## 🎯 QUICK REFERENCE CHECKLIST

### Before Going Live:
- [ ] Paystack account activated and approved
- [ ] Business documents uploaded and verified
- [ ] Bank account added and verified
- [ ] Live API keys obtained
- [ ] 6 live subscription plans created
- [ ] Live plan codes saved
- [ ] Supabase secret key updated
- [ ] Vercel public key updated
- [ ] App redeployed
- [ ] Live webhook URL configured
- [ ] Test payment made and verified
- [ ] Webhook logs checked
- [ ] Database updated correctly

### After Going Live:
- [ ] Monitor transactions daily
- [ ] Check settlements are arriving
- [ ] Enable 2FA on Paystack account
- [ ] Set up transaction alerts (email/SMS)
- [ ] Test refund process
- [ ] Document all plan codes securely

---

## 🆘 TROUBLESHOOTING

### Issue 1: Account Not Approved Yet
**Solution:**
- Contact Paystack support: hi@paystack.com
- WhatsApp: +234 906 000 0030
- Expected wait: 24-48 hours

### Issue 2: Can't See Live Mode Toggle
**Solution:**
- Account not activated yet
- Complete Phase 1 first

### Issue 3: Live Payment Failed
**Solution:**
- Check webhook logs for errors
- Verify API keys are correct (pk_live_ and sk_live_)
- Verify plan codes match live plans
- Check card has sufficient funds

### Issue 4: Webhook Not Receiving Events
**Solution:**
- Verify webhook URL is correct
- Check Paystack webhook logs: https://dashboard.paystack.com/#/settings/developer
- Check Supabase function logs

---

## 📞 SUPPORT CONTACTS

### Paystack Support:
- Email: hi@paystack.com
- WhatsApp: +234 906 000 0030
- Twitter: @PaystackHQ
- Documentation: https://paystack.com/docs

### Hours:
- Monday - Friday: 9am - 6pm WAT
- Response time: Usually within 24 hours

---

## 🎉 CONGRATULATIONS!

Once you complete all phases, you'll have:
✅ A fully functional payment system
✅ Accepting real payments from customers
✅ Automatic subscription management
✅ Professional payment experience

**You're ready to make money!** 💰

---

## 📝 NOTES

### Test vs Live Modes

| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| API Keys | pk_test_... / sk_test_... | pk_live_... / sk_live_... |
| Payments | Fake (test cards) | Real money |
| Cards | 4084 0840 8408 4081 | Real cards |
| Settlements | Not sent | Sent to bank |
| Fees | Not charged | Charged |

### Keeping Test Mode

**Keep your test mode setup!** It's useful for:
- Testing new features before deploying
- Demonstrating to investors/partners
- Training team members
- Debugging issues

You can switch between test/live anytime in Paystack dashboard.

---

**Good luck with your launch!** 🚀
