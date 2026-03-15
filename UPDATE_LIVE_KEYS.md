# 🔴 IMPORTANT: Update Your Live Paystack Keys

Your deployment is ready but you need to update the placeholder keys with your actual LIVE keys from Paystack.

## Step 1: Get Your Live Keys from Paystack

1. Go to: https://dashboard.paystack.com/#/settings/developer
2. Make sure you're in **LIVE MODE** (check top-right corner)
3. Copy your keys:
   - **Public Key**: `pk_live_...`
   - **Secret Key**: `sk_live_...`

## Step 2: Update Vercel (Public Key)

Run this command and paste your LIVE public key when prompted:
```bash
vercel env rm VITE_PAYSTACK_PUBLIC_KEY production
vercel env add VITE_PAYSTACK_PUBLIC_KEY production
# Paste: pk_live_YOUR_ACTUAL_KEY
```

## Step 3: Update Supabase Edge Functions (Secret Key)

Run this command with your LIVE secret key:
```bash
export SUPABASE_ACCESS_TOKEN=sbp_0e49aecc340f38054a0a937101177d76f7b3574c
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY
```

## Step 4: Redeploy

After updating both keys, redeploy to apply changes:
```bash
vercel --prod
```

## Step 5: Verify Live Setup

Check that everything is working:
1. Visit your production site
2. Try subscribing with a REAL card (you'll be charged)
3. Start with the cheapest plan (₦5,000)
4. Check Paystack dashboard for the transaction

## ⚠️ Security Notes

- **NEVER** commit these keys to Git
- **NEVER** share your secret key (`sk_live_...`) publicly
- Keep test and live keys completely separate
- The public key (`pk_live_...`) is safe for frontend use

## Current Status

✅ Code deployed to production
✅ Edge Functions deployed
⚠️ Keys are placeholders - YOU MUST UPDATE THEM

Once you update the keys, your live payment system will be fully operational!