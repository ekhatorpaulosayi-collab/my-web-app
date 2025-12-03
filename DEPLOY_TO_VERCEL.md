# 🚀 Deploy to Vercel - Complete Guide

## ✅ Your App Is Ready to Deploy

All authentication issues are fixed and the app is production-ready!

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:
- ✅ Supabase project configured (smartstock)
- ✅ SMTP/Email working (Supabase built-in email)
- ✅ Password reset flow tested and working locally
- ✅ Service worker updated to v2.1
- ✅ All environment variables ready

---

## 🎯 Step 1: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# If not logged in yet
vercel login

# Deploy to production
vercel --prod
```

The CLI will:
1. Build your app
2. Upload to Vercel
3. Give you a production URL (e.g., `https://storehouse-xyz.vercel.app`)

### Option B: Using Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click: **Add New** → **Project**
3. Import your repository
4. Click: **Deploy**

---

## 🎯 Step 2: Add Environment Variables to Vercel

After deployment, add your Supabase credentials:

### Via Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select project: **smartstock-v2**
3. Click: **Settings** → **Environment Variables**
4. Add these variables:

```
VITE_SUPABASE_URL = https://yzlniqwzqlsftxrtapdl.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ
```

5. Click **Save**
6. **Redeploy** the project (Vercel → Deployments → ⋯ → Redeploy)

### Via Vercel CLI:

```bash
# Add environment variables
vercel env add VITE_SUPABASE_URL production
# Paste: https://yzlniqwzqlsftxrtapdl.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ

# Redeploy
vercel --prod
```

---

## 🎯 Step 3: Update Supabase URLs (CRITICAL!)

After deployment, you'll get a Vercel URL like:
```
https://smartstock-v2-xyz.vercel.app
```

Now update Supabase to use this production URL:

### 3.1 Update Site URL

1. Go to: https://supabase.com/dashboard
2. Select project: **smartstock**
3. Click: **Authentication** → **URL Configuration**
4. Find: **Site URL**
5. Change from: `http://localhost:4000`
6. Change to: `https://smartstock-v2-xyz.vercel.app` (your actual Vercel URL)
7. Click: **Save**

### 3.2 Update Redirect URLs

In the same page, update **Redirect URLs**:

```
https://smartstock-v2-xyz.vercel.app/**
https://smartstock-v2-xyz.vercel.app/auth/confirm
https://smartstock-v2-xyz.vercel.app/update-password
https://smartstock-v2-xyz.vercel.app/auth/callback
```

**Important:** Keep the localhost URLs too for local development:
```
http://localhost:4000/**
http://localhost:4000/auth/confirm
http://localhost:4000/update-password
http://localhost:4000/auth/callback
```

Click: **Save**

---

## 🎯 Step 4: Test Production Deployment

1. **Open your production URL in incognito window**
   ```
   https://smartstock-v2-xyz.vercel.app
   ```

2. **Test Password Reset:**
   - Go to: `/forgot-password`
   - Enter email
   - Check inbox
   - Click email link (should open your Vercel URL)
   - Set new password
   - Login

3. **Test Signup:**
   - Go to: `/signup`
   - Create new account
   - Should be able to login immediately (email confirmation is OFF)

---

## 🎯 Step 5: Share with Your 5 Users

Once testing passes, share with your users:

**Send them:**
```
🎉 Storehouse is now live!

Access it here: https://smartstock-v2-xyz.vercel.app

How to get started:
1. Click "Sign Up" to create an account
2. Login with your email and password
3. Start managing your inventory!

Forgot password?
- Click "Forgot Password" on the login page
- Check your email for reset link
- Set a new password

Need help? Let me know!
```

---

## 📊 Deployment Checklist

Before telling users it's ready:

- [ ] App deployed to Vercel
- [ ] Environment variables added
- [ ] Site URL updated in Supabase (production URL)
- [ ] Redirect URLs updated in Supabase (production URL)
- [ ] Tested password reset on production
- [ ] Tested signup on production
- [ ] Tested login on production
- [ ] Service worker working correctly (no console errors)

---

## 🐛 Common Issues

### Issue: "Invalid redirect URL"
**Fix:** Make sure you added your Vercel URL to Supabase Redirect URLs

### Issue: Email link goes to localhost
**Fix:** Update Site URL in Supabase to your Vercel URL

### Issue: Service worker errors
**Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue: Environment variables not working
**Fix:** Redeploy after adding environment variables

---

## 🔄 Future Updates

When you make changes and want to deploy:

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push

# If using Vercel CLI
vercel --prod

# If using Vercel GitHub integration, it deploys automatically on push
```

---

## 📞 Need Help?

If deployment fails:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables are set
4. Verify Supabase URLs are correct

---

**You're ready to deploy! Run `vercel --prod` and follow Steps 3-5 above.** 🚀
