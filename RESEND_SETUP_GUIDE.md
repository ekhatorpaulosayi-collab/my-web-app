# Resend.com Setup Guide for Storehouse
## Professional Email Delivery for Email Confirmation

This guide will help you set up Resend.com for sending email confirmations when you're ready to enable them (after your first 100 users).

---

## Why Resend.com?

**Perfect for Nigerian startups:**
- ✅ **Free tier**: 3,000 emails/month forever
- ✅ **Best deliverability**: 99%+ inbox rate (better than Gmail/Yahoo for transactional emails)
- ✅ **No credit card required** for free tier
- ✅ **Easy setup**: 10 minutes
- ✅ **Beautiful emails**: Modern templates included
- ✅ **Supabase integration**: Official support

**Comparison:**
| Provider | Free Tier | Deliverability | Setup Time |
|----------|-----------|----------------|------------|
| Resend | 3,000/month | 99%+ | 10 min |
| SendGrid | 100/day | 95% | 30 min |
| Mailgun | 5,000/month (3 months) | 97% | 45 min |
| Gmail SMTP | Unlimited (but risky) | 60% | 5 min |

---

## Setup Steps (Do This When You Have 100+ Users)

### Step 1: Create Resend Account (2 minutes)

1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email address
4. You're in! No credit card needed.

---

### Step 2: Get Your API Key (1 minute)

1. Go to https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it: `Storehouse Production`
4. Click **"Create"**
5. **Copy the API key** (starts with `re_...`)
   - ⚠️ Save it somewhere safe - you won't see it again!

---

### Step 3: Add API Key to Supabase (3 minutes)

1. Open your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **smartstock-v2** project
3. Go to **Settings** → **Authentication**
4. Scroll to **"SMTP Settings"**
5. Click **"Enable Custom SMTP"**
6. Fill in these values:

```
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP Username: resend
SMTP Password: [YOUR_RESEND_API_KEY]  ← Paste the re_... key here
Sender Email: noreply@storehouse.ng  ← Use your domain (or resend subdomain)
Sender Name: Storehouse
```

7. Click **"Save"**

---

### Step 4: Verify Domain (Optional but Recommended)

**Without domain verification:**
- ✅ Emails work immediately
- ⚠️ Sent from `@resend.dev` subdomain
- ⚠️ Lower trust score (but still 90%+ delivery)

**With domain verification** (recommended when you buy storehouse.ng):
1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter: `storehouse.ng`
4. Copy the DNS records Resend shows you
5. Add them to your domain registrar (Namecheap, GoDaddy, etc.)
6. Wait 24-48 hours for verification
7. Emails now sent from `noreply@storehouse.ng` ✅

---

### Step 5: Enable Email Confirmation in Supabase (1 minute)

Once Resend is configured:

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click **"Email"**
3. Check **"Confirm email"** ✅
4. Click **"Save"**

Done! New signups will now receive confirmation emails.

---

## Test Email Delivery (Before Going Live)

1. Sign up with your personal email
2. Check inbox (and spam folder)
3. Click confirmation link
4. Should redirect to `/auth/confirm` and log you in

**If emails don't arrive:**
- Check Supabase **"Logs"** → **"Auth Logs"**
- Check Resend **"Emails"** dashboard for delivery status
- Common issues:
  - SMTP password wrong (re-copy API key)
  - Port blocked (try port 587 instead of 465)
  - Sender email not verified

---

## Email Templates (Optional Enhancement)

### Current Default (Supabase)
```
Subject: Confirm your email

Click here to confirm your email:
https://smartstock-v2.vercel.app/auth/confirm?token=abc123

This link expires in 24 hours.
```

### Custom Template (via Resend)
You can create beautiful HTML emails in Resend dashboard:
1. Go to **"Emails"** → **"Templates"**
2. Use drag-and-drop builder
3. Add Storehouse branding, logo, colors
4. Much more professional!

---

## Monitoring & Analytics

### Resend Dashboard Shows:
- Total emails sent
- Delivery rate (should be 99%+)
- Open rate (industry average: 20-25%)
- Click rate (if you track links)
- Bounce rate (should be <1%)
- Spam complaints (should be 0%)

### Red Flags to Watch:
- Delivery rate <95% → Check domain/SMTP settings
- Bounce rate >5% → Bad email addresses in database
- Spam complaints >0.1% → Your email content too salesy

---

## Cost Breakdown

**Free Tier (Forever):**
- 3,000 emails/month
- ~100 signups/day = 3,000/month
- Perfect for early stage

**When You Need to Upgrade:**
- $20/month = 50,000 emails
- Only when you're doing 1,600+ signups/day
- At that point, you can afford it! 🎉

---

## Alternative: Use Gmail SMTP (Not Recommended)

If you want to test immediately without Resend:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-gmail@gmail.com
SMTP Password: [App-specific password]
```

**Problems with Gmail:**
- Often marked as spam (60% delivery)
- Daily limit: 500 emails
- Can get your account suspended
- Not professional (emails from personal Gmail)

**Use only for testing**, not production.

---

## Summary: When to Enable Email Confirmation

| Timeline | Action | Why |
|----------|--------|-----|
| **Week 1-4** | Keep email confirmation OFF | Zero friction for early adopters |
| **After 100 users** | Set up Resend.com | You have traction, time to professionalize |
| **After Resend setup** | Enable email confirmation | Better security, verified emails |
| **After domain purchase** | Verify domain in Resend | Branded emails, higher trust |

---

## Need Help?

**Common Issues:**

1. **"SMTP authentication failed"**
   - Double-check API key is correct
   - Make sure you copied it exactly (no spaces)

2. **"Emails not arriving"**
   - Check spam folder
   - Check Resend dashboard for delivery status
   - Try different email provider (Gmail vs Yahoo)

3. **"Invalid sender email"**
   - Use verified domain
   - Or use Resend's subdomain: `yourname@resend.dev`

4. **"Too many requests"**
   - Hit free tier limit
   - Upgrade or wait until next month

---

## Next Steps

**Right now (before 100 users):**
1. ✅ Email confirmation is OFF in Supabase
2. ✅ Users can sign up instantly
3. ✅ Rate limiting prevents spam

**Later (after 100 users):**
1. Follow this guide to set up Resend
2. Test email delivery
3. Enable email confirmation in Supabase
4. Monitor delivery rates

**Much later (after domain purchase):**
1. Verify storehouse.ng in Resend
2. Update sender email to `noreply@storehouse.ng`
3. Create custom email templates

---

## Resources

- Resend Docs: https://resend.com/docs
- Supabase SMTP Guide: https://supabase.com/docs/guides/auth/auth-smtp
- Email Deliverability Best Practices: https://resend.com/docs/send-with-resend/deliverability

---

**Questions?** Check the Resend dashboard or Supabase logs for debugging info.
