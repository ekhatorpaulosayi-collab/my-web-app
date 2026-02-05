# Sentry Error Monitoring Setup Guide

## What is Sentry?

Sentry is a production-grade error monitoring platform that helps you:
- **Catch bugs before users report them**
- **See exactly where errors occur** (with source maps)
- **Track user sessions** leading up to errors
- **Monitor performance** of your app
- **Get instant alerts** when errors happen

## Free Tier Benefits
- 5,000 errors/month
- 10,000 performance transactions/month
- Session replay for errors
- 1 GB file storage
- 90 days data retention

---

## Step-by-Step Setup

### 1. Create a Sentry Account

1. Go to: **https://sentry.io/signup/**
2. Sign up with your email or GitHub
3. Choose the **free Developer plan**

### 2. Create a New Project

1. After signing in, click **"Create Project"**
2. Select platform: **React**
3. Set alert frequency: **On every new issue** (recommended)
4. Project name: **storehouse** (or your preferred name)
5. Click **"Create Project"**

### 3. Get Your DSN (Data Source Name)

After creating the project, you'll see a setup page with your DSN. It looks like:

```
https://abc123def456@o123456.ingest.sentry.io/7654321
```

**Copy this DSN - you'll need it next!**

If you closed the page, you can find it at:
- **Settings → Projects → Your Project → Client Keys (DSN)**

---

## 4. Configure Your Environment Variables

### Development (.env.local)

Open `.env.local` and replace `YOUR_SENTRY_DSN_HERE` with your actual DSN:

```env
VITE_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7654321
VITE_SENTRY_ENVIRONMENT=development
```

**Note:** By default, Sentry is disabled in development to avoid noise. To enable it for testing:
```env
VITE_SENTRY_ENABLED=true
```

### Production (.env.production.local)

Open `.env.production.local` and add your DSN:

```env
VITE_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7654321
VITE_SENTRY_ENVIRONMENT=production
```

### Vercel Environment Variables

To enable Sentry in production on Vercel:

1. Go to: **https://vercel.com/your-project/settings/environment-variables**
2. Add these variables:
   - **Name:** `VITE_SENTRY_DSN`
   - **Value:** Your Sentry DSN
   - **Environment:** Production

   - **Name:** `VITE_SENTRY_ENVIRONMENT`
   - **Value:** `production`
   - **Environment:** Production

3. Redeploy your app

---

## 5. Test Sentry Integration

### Test in Development (Optional)

1. Enable Sentry in dev by adding to `.env.local`:
   ```env
   VITE_SENTRY_ENABLED=true
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Open browser console and run:
   ```javascript
   throw new Error("Test Sentry Error!")
   ```

4. Check your Sentry dashboard - you should see the error!

### Test in Production

1. Deploy your app to production
2. Visit your live site
3. Trigger an error (or wait for real errors to occur)
4. Check your Sentry dashboard

---

## 6. Integrate Sentry with User Auth

To track which users experience errors, update your login code:

```typescript
import { setUserContext } from './lib/sentry';

// After successful login
const user = await login(email, password);
setUserContext({
  id: user.uid,
  email: user.email,
  name: user.displayName
});

// On logout
import { clearUserContext } from './lib/sentry';
clearUserContext();
```

---

## Features Already Configured

✅ **Error Tracking** - All uncaught errors are automatically sent to Sentry
✅ **Performance Monitoring** - Tracks slow API calls and page loads
✅ **Session Replay** - Records user sessions when errors occur
✅ **Breadcrumbs** - Tracks user actions before errors
✅ **Source Maps** - See exact code line where errors happen
✅ **Privacy** - Sensitive data is automatically sanitized

---

## Dual Error Monitoring (Sentry + Supabase)

Your app now has **two error monitoring systems**:

### Sentry (External)
- **Use for:** Production error tracking, alerts, debugging
- **Best for:** Finding and fixing bugs quickly
- **Data:** Stored in Sentry cloud

### Supabase (Internal)
- **Use for:** Custom analytics, internal dashboards
- **Best for:** Business-specific error tracking
- **Data:** Stored in your Supabase database

Both systems work together - you get the best of both worlds!

---

## Sentry Dashboard Features

Once errors start coming in, you can:

1. **View error trends** - See which errors are most common
2. **Filter by user** - See errors for specific users
3. **Search by tags** - Filter by page, browser, etc.
4. **Set up alerts** - Get notified via email, Slack, etc.
5. **Create releases** - Track which deployment introduced bugs
6. **View stack traces** - See exactly where code failed

---

## Advanced Configuration (Optional)

### Custom Error Capturing

```typescript
import { captureError, addBreadcrumb } from './lib/sentry';

try {
  // Your code
  riskyOperation();
} catch (error) {
  // Manually send to Sentry with context
  captureError(error, {
    operation: 'riskyOperation',
    userId: currentUser.id
  });
}

// Add breadcrumb before critical operations
addBreadcrumb('User clicked checkout button', 'user-action', {
  cartTotal: 150.00
});
```

### Set Custom Tags

```typescript
import { setTag } from './lib/sentry';

// Tag errors by store
setTag('store_id', 'store-123');

// Tag errors by feature
setTag('feature', 'checkout');
```

---

## Troubleshooting

### Errors not appearing in Sentry?

1. **Check DSN is set:**
   ```bash
   echo $VITE_SENTRY_DSN
   ```

2. **Check environment:**
   - Development: Set `VITE_SENTRY_ENABLED=true`
   - Production: Sentry is auto-enabled

3. **Check browser console:**
   - Look for `[Sentry] Initialized successfully`

4. **Test manually:**
   ```javascript
   throw new Error("Sentry test error");
   ```

### Too many errors?

Adjust sample rates in `src/lib/sentry.ts`:

```typescript
tracesSampleRate: 0.1, // 10% of requests
replaysOnErrorSampleRate: 0.5, // 50% of error sessions
```

---

## Cost Management

Sentry free tier is generous, but if you exceed limits:

### Free Tier Limits:
- 5,000 errors/month
- 10,000 performance events/month

### Tips to stay within limits:
1. **Ignore non-critical errors** (already configured)
2. **Lower sample rates** for performance monitoring
3. **Filter by environment** (only track production)
4. **Delete old projects** you're not using

---

## Support & Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Sentry Status:** https://status.sentry.io/
- **Community:** https://discord.gg/sentry

---

## Quick Reference

| Task | Command/Location |
|------|------------------|
| Get DSN | https://sentry.io/settings/YOUR_PROJECT/keys/ |
| View Errors | https://sentry.io/organizations/YOUR_ORG/issues/ |
| Set Alerts | https://sentry.io/organizations/YOUR_ORG/alerts/ |
| Performance | https://sentry.io/organizations/YOUR_ORG/performance/ |
| Releases | https://sentry.io/organizations/YOUR_ORG/releases/ |

---

**Next Step:** Get your Sentry DSN and add it to `.env.local` and `.env.production.local`! 🚀
