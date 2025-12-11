# Domain Setup Guide for storehouse.ng

Since you already own **www.storehouse.ng**, here's how to connect it to your Vercel deployment.

---

## Current Setup Status

**Domain:** www.storehouse.ng (ACTIVE)
**Vercel Project:** smartstock-v2
**Production URL:** https://smartstock-v2.vercel.app

---

## Step 1: Add Domain to Vercel (5 minutes)

### Via Vercel Dashboard:

1. Go to https://vercel.com/dashboard
2. Click your **smartstock-v2** project
3. Go to **Settings** → **Domains**
4. Click **"Add Domain"**
5. Enter both:
   - `storehouse.ng`
   - `www.storehouse.ng`
6. Click **"Add"**

Vercel will show you DNS records to add.

---

## Step 2: Update DNS Records (10 minutes)

Go to your domain registrar (wherever you bought storehouse.ng - Namecheap, GoDaddy, etc.)

### Add These DNS Records:

**For apex domain (storehouse.ng):**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Important:** Remove any conflicting A or CNAME records for @ and www.

---

## Step 3: Wait for Propagation (Up to 24 hours)

- DNS changes can take 5 minutes to 24 hours
- Usually works within 1-2 hours
- Check status: https://www.whatsmydns.net/#A/storehouse.ng

---

## Step 4: Configure SSL (Automatic)

Vercel automatically provisions SSL certificates via Let's Encrypt.

Once DNS propagates:
- ✅ https://storehouse.ng → Works with SSL
- ✅ https://www.storehouse.ng → Works with SSL
- ✅ http://storehouse.ng → Redirects to HTTPS
- ✅ http://www.storehouse.ng → Redirects to HTTPS

---

## Step 5: Update Supabase Configuration

### Site URL:
1. Go to Supabase Dashboard → Settings → API
2. Update **Site URL** to: `https://www.storehouse.ng`

### Redirect URLs:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these to **Redirect URLs**:
```
https://storehouse.ng/**
https://www.storehouse.ng/**
https://storehouse.ng/auth/confirm
https://www.storehouse.ng/auth/confirm
http://localhost:5173/** (for development)
```

---

## Step 6: Update Code (Optional)

You might want to update some hardcoded URLs:

### In your codebase:
Search for `smartstock-v2.vercel.app` and replace with `www.storehouse.ng`

```bash
# Find all occurrences
grep -r "smartstock-v2.vercel.app" src/
```

Most should work automatically, but it's cleaner to use your custom domain.

---

## Testing Checklist

Once DNS propagates, test these URLs:

- [ ] https://storehouse.ng → Loads app
- [ ] https://www.storehouse.ng → Loads app
- [ ] https://www.storehouse.ng/signup → Sign up works
- [ ] https://www.storehouse.ng/login → Login works
- [ ] http://storehouse.ng → Redirects to HTTPS
- [ ] SSL certificate valid (green lock icon)

---

## Common Issues

### "Domain is not verified"
- DNS records not propagated yet
- Wait 1-2 hours and check again
- Use https://www.whatsmydns.net to check

### "SSL certificate pending"
- Normal for first 5-30 minutes after DNS propagates
- Vercel is provisioning Let's Encrypt certificate
- Refresh after 10 minutes

### "Redirect URL mismatch" on login
- Update Supabase redirect URLs (see Step 5)
- Add both apex and www domains

### Old Vercel URL still works
- Normal! Keep it as backup
- Vercel allows multiple domains
- Users can use either URL

---

## Resend.com Domain Verification (For Later)

When you set up Resend.com for emails, verify your domain:

1. Resend Dashboard → Domains → Add Domain
2. Enter: `storehouse.ng`
3. Add these DNS records:
```
Type: TXT
Name: _dmarc
Value: [Resend will provide]

Type: CNAME  
Name: resend._domainkey
Value: [Resend will provide]
```

4. Emails will be sent from: `noreply@storehouse.ng`

---

## Next Steps

**Immediate:**
1. Add domain to Vercel
2. Update DNS records
3. Wait for propagation

**After DNS Propagates:**
1. Update Supabase URLs
2. Test signup/login
3. Share new URL with users: **www.storehouse.ng**

**Much Later (After 100 Users):**
1. Set up Resend.com
2. Verify domain in Resend
3. Send emails from @storehouse.ng

---

## Professional Touch

Update your branding everywhere:

**Email signatures:**
```
Visit: www.storehouse.ng
```

**Social media:**
```
🔗 www.storehouse.ng
```

**Support messages:**
```
Access your store at www.storehouse.ng
```

**Invoices/Receipts:**
```
Powered by Storehouse
www.storehouse.ng
```

---

You now have a professional, branded domain! 🎉
