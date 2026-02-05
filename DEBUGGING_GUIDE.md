# Storehouse Debugging & Development Guide

## Quick Access URLs

### Production
- **Landing Page**: https://storehouse.ng
- **Dashboard**: https://storehouse.ng/dashboard
- **Affiliate Signup**: https://storehouse.ng/affiliate/signup
- **Affiliate Dashboard**: https://storehouse.ng/affiliate/dashboard
- **Affiliate Admin**: https://storehouse.ng/affiliate/admin
- **Storefront**: https://storehouse.ng/store/{businessName}

### Development
- **Local Dev**: http://localhost:5173
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl
- **Vercel Dashboard**: https://vercel.com/pauls-projects-cfe953d7/smartstock-v2
- **ImageKit Dashboard**: https://imagekit.io/dashboard

---

## 📍 Feature Navigation Guide

Complete list of all features accessible from the Getting Started Guide:

### 🧾 Business Features
| Feature | Access Path | Component | Database Tables |
|---------|------------|-----------|-----------------|
| **Professional Invoices** | Dashboard → Invoices | `src/pages/Invoices.tsx`<br>`src/pages/CreateInvoice.tsx`<br>`src/pages/InvoiceDetail.tsx` | `invoices`<br>`invoice_items` |
| **Online Store** | Dashboard → Online Store | `src/components/OnlineStoreSetup.tsx`<br>`src/pages/StorefrontPage.tsx` | `business_profiles`<br>`products` |
| **Customer Reviews** | Dashboard → Reviews | `src/components/ReviewManagement.tsx` | `reviews`<br>`business_profiles` |
| **Customers** | Dashboard → Customers | `src/pages/CustomersPage.tsx` | `customers`<br>`debts` |

### 💰 Revenue Features
| Feature | Access Path | Component | Database Tables |
|---------|------------|-----------|-----------------|
| **Affiliate Program** | Dashboard → 💰 Affiliate Program<br>OR: https://storehouse.ng/affiliate/signup | `src/pages/AffiliateSignup.tsx`<br>`src/pages/AffiliateDashboard.tsx`<br>`src/pages/AffiliateAdmin.tsx` | `affiliates`<br>`affiliate_commissions`<br>`referrals` |
| **Referral Program** | Dashboard → Referral Program | `src/pages/ReferralDashboard.tsx` | `referrals`<br>`referral_rewards` |

### 📊 Analytics Features
| Feature | Access Path | Component | Database Tables |
|---------|------------|-----------|-----------------|
| **Sales by Channel** | Dashboard → Sales by Channel | `src/components/ChannelAnalytics.tsx` | `sales`<br>`sales_channels` |
| **Daily Sales Summary** | Dashboard → Daily Sales Summary | `src/components/DailySalesSummary.tsx` | `sales`<br>`sales_summary` |

### 👥 Team Features
| Feature | Access Path | Component | Database Tables |
|---------|------------|-----------|-----------------|
| **Manage Staff** | Dashboard → Settings → Staff Management | `src/pages/StaffManagement.tsx` | `staff`<br>`staff_permissions` |
| **Staff Mode** | Dashboard → Staff Mode Toggle | `src/contexts/StaffContext.tsx` | `staff` |

### 📤 Data Features
| Feature | Access Path | Component | Function |
|---------|------------|-----------|----------|
| **Export Data (CSV)** | Dashboard → Export Data | Various pages with export buttons | `exportToCSV()` in respective components |

---

## 🔍 Quick Debugging by Feature

### Invoices Not Working
```bash
# Check database
./DEBUG_COMMANDS.sh db-query "SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5;"

# Check component
code src/pages/Invoices.tsx

# Check service
code src/services/invoiceService.ts
```

### Online Store Not Showing / Store URL Slug Issues

**Understanding Store URLs:**
Storehouse supports 3 types of store URLs (in priority order):

1. **Custom Domain** (e.g., `https://mystore.com`)
2. **Subdomain** (e.g., `https://mystore.storehouse.ng`)
3. **Path-based Slug** (e.g., `https://storehouse.ng/store/myshop`)

**How It Works:**
```javascript
// URL Format: https://storehouse.ng/store/{slug}
// Example: https://storehouse.ng/store/pauls-tech-shop

// The {slug} is stored in: business_profiles.store_slug
// Route defined in: src/AppRoutes.jsx
// Component: src/pages/StorefrontPage.tsx (line 55: useParams)
```

**Debugging Steps:**

```bash
# 1. Check if store slug exists in database
./DEBUG_COMMANDS.sh db-query "SELECT id, business_name, store_slug, custom_domain, subdomain FROM business_profiles WHERE store_slug IS NOT NULL;"

# 2. Check specific business
./DEBUG_COMMANDS.sh db-query "SELECT business_name, store_slug, storefront_enabled FROM business_profiles WHERE business_name = 'Your Business Name';"

# 3. Verify slug is URL-friendly (lowercase, hyphens, no spaces)
./DEBUG_COMMANDS.sh db-query "SELECT store_slug FROM business_profiles WHERE store_slug ~ '[^a-z0-9-]';"  # Should return empty if all valid

# 4. Check for duplicate slugs (should be unique!)
./DEBUG_COMMANDS.sh db-query "SELECT store_slug, COUNT(*) FROM business_profiles WHERE store_slug IS NOT NULL GROUP BY store_slug HAVING COUNT(*) > 1;"

# 5. Test the URL
curl -I https://storehouse.ng/store/YOUR-SLUG

# 6. Check component
code src/pages/StorefrontPage.tsx
```

**Common Issues:**

**Issue: "Store not found"**
```bash
# Check if slug exists
./DEBUG_COMMANDS.sh db-query "SELECT * FROM business_profiles WHERE store_slug = 'your-slug';"

# If empty, user needs to set up their store slug:
# Dashboard → Settings → Online Store → Store Slug
```

**Issue: "Store slug has spaces or special characters"**
```bash
# Find invalid slugs
./DEBUG_COMMANDS.sh db-query "SELECT business_name, store_slug FROM business_profiles WHERE store_slug ~ '[^a-z0-9-]';"

# Fix: Convert to lowercase with hyphens
# Example: "Paul's Tech Shop" → "pauls-tech-shop"
```

**Issue: "My custom domain isn't working"**
```bash
# Check custom domain configuration
./DEBUG_COMMANDS.sh db-query "SELECT business_name, custom_domain, subdomain FROM business_profiles WHERE custom_domain IS NOT NULL;"

# Custom domains require:
# 1. DNS A record pointing to Vercel IP
# 2. Domain added to Vercel project
# 3. SSL certificate (auto-generated by Vercel)
```

**Issue: "Subdomain not working"**
```bash
# Check subdomain setup
./DEBUG_COMMANDS.sh db-query "SELECT business_name, subdomain FROM business_profiles WHERE subdomain IS NOT NULL;"

# Subdomain format: {subdomain}.storehouse.ng
# Requires wildcard DNS setup on storehouse.ng
```
```

### Customer Reviews Not Appearing
```bash
# Check reviews table
./DEBUG_COMMANDS.sh db-query "SELECT * FROM reviews ORDER BY created_at DESC LIMIT 10;"

# Check component
code src/components/ReviewManagement.tsx
```

### Sales Channel Data Missing
```bash
# Check sales channels
./DEBUG_COMMANDS.sh db-query "SELECT * FROM sales_channels;"

# Check analytics component
code src/components/ChannelAnalytics.tsx
```

### Staff Management Issues
```bash
# Check staff table
./DEBUG_COMMANDS.sh db-query "SELECT * FROM staff ORDER BY created_at DESC LIMIT 10;"

# Check permissions
./DEBUG_COMMANDS.sh db-query "SELECT * FROM staff_permissions;"

# Check component
code src/pages/StaffManagement.tsx
```

### Export Data Not Working
```bash
# Check browser console for errors
# Most export functions are client-side

# Search for export functions
grep -r "exportToCSV" src/
```

---

## Codebase Structure

```
smartstock-v2/
├── src/
│   ├── pages/              # All page components
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.jsx
│   │   ├── AffiliateDashboard.tsx
│   │   ├── AffiliateSignup.tsx
│   │   ├── AffiliateAdmin.tsx
│   │   └── StorefrontPage.tsx
│   ├── components/         # Reusable components
│   ├── contexts/          # React contexts (Auth, Business, etc.)
│   ├── services/          # API services
│   │   ├── affiliateService.ts  # Affiliate CRUD operations
│   │   ├── invoiceService.ts
│   │   ├── referralService.ts
│   │   └── subscriptionService.ts
│   ├── lib/               # Core utilities
│   │   ├── supabase.js    # Supabase client
│   │   ├── imagekit.ts    # Image optimization
│   │   └── firebase.js    # Firebase (legacy)
│   ├── utils/             # Helper functions
│   │   ├── logger.ts      # Logging utility
│   │   └── errorMonitoring.ts
│   └── db/                # Database helpers
├── supabase/
│   ├── migrations/        # Database migrations
│   │   └── 20250115_affiliate_program.sql
│   └── functions/         # Edge functions
└── public/
    └── sw.js             # Service worker
```

---

## Database Tables (Supabase)

### Key Tables for Debugging

```sql
-- View all affiliates
SELECT * FROM affiliates ORDER BY created_at DESC LIMIT 10;

-- View affiliate commissions
SELECT * FROM affiliate_commissions ORDER BY created_at DESC LIMIT 10;

-- View referrals
SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10;

-- Check subscription tiers
SELECT id, name, price_monthly, price_annual FROM subscription_tiers ORDER BY display_order;

-- View user subscriptions
SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 10;
```

### Connection String
```
postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## Debugging Tools

### 1. Enable Development Logs
In production, logs are suppressed. To enable:

```javascript
// Temporarily comment out in src/main.jsx
// if (import.meta.env.PROD) {
//   const noop = () => {};
//   console.log = noop;
//   console.debug = noop;
//   console.info = noop;
// }
```

### 2. Use the Debug Console
Add `?debug=1` to any URL:
```
https://storehouse.ng/?debug=1
```
This shows an on-screen debug console with all logs.

### 3. Browser DevTools Filters
In Chrome DevTools Console:
- Filter by error: `-level:info -level:log`
- Filter by file: `file:affiliateService`
- Filter by text: `commission`

### 4. Network Tab Monitoring
Watch these endpoints:
- `/rest/v1/affiliates` - Affiliate CRUD
- `/rest/v1/affiliate_commissions` - Commission tracking
- `/rest/v1/referrals` - Referral tracking
- Paystack webhook: Check Vercel logs

---

## Common Debugging Scenarios

### Affiliate Commission Not Recording

1. **Check Paystack Webhook**
```bash
vercel logs https://smartstock-v2.vercel.app --follow
```

2. **Verify Referral Code**
```sql
SELECT * FROM referrals WHERE referral_code = 'YOUR_CODE';
```

3. **Check Commission Calculation**
```sql
SELECT
  ac.*,
  a.payout_email,
  r.referral_code
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
JOIN referrals r ON ac.referral_id = r.id
ORDER BY ac.created_at DESC;
```

### Image Not Loading

1. **Check ImageKit URL**
```javascript
// In browser console
import { getImageKitUrl } from './src/lib/imagekit';
console.log(getImageKitUrl('test.jpg', { width: 400, quality: 90 }));
// Should output: https://ik.imagekit.io/onelove431212341234/tr:w-400,q-90/test.jpg
```

2. **Check Service Worker Cache**
```javascript
// In browser console
caches.keys().then(console.log);
caches.open('storehouse-v2.1-images').then(cache => cache.keys()).then(console.log);
```

3. **Clear All Caches**
```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
location.reload(true);
```

### Affiliate Dashboard Not Showing Data

1. **Check Auth Context**
```javascript
// Add to AffiliateDashboard.tsx temporarily
console.log('Current User:', currentUser);
console.log('Affiliate Data:', affiliate);
```

2. **Check Supabase Query**
```sql
-- Run in Supabase SQL Editor
SELECT
  a.*,
  COUNT(r.id) as total_referrals,
  COALESCE(SUM(ac.amount), 0) as total_earnings
FROM affiliates a
LEFT JOIN referrals r ON a.id = r.affiliate_id
LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
WHERE a.user_id = 'USER_ID_HERE'
GROUP BY a.id;
```

---

## Environment Variables

### Required for Production (Vercel)
```bash
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/onelove431212341234
VITE_IMAGEKIT_PUBLIC_KEY=public_QdLLjPTKH/+dRHxXqo0lSiOs310=
```

### Check Vercel Env Vars
```bash
vercel env ls
vercel env pull .env.local
```

---

## Testing Workflow

### 1. Test Affiliate Flow End-to-End

```bash
# Step 1: Create affiliate
# Visit: https://storehouse.ng/affiliate/signup
# Sign up with test email

# Step 2: Get referral code
# Visit: https://storehouse.ng/affiliate/dashboard
# Copy referral link

# Step 3: Test referral
# Open incognito window
# Visit: https://storehouse.ng/?ref=YOUR_CODE
# Sign up and subscribe

# Step 4: Verify commission
# Check affiliate dashboard for updated earnings

# Step 5: Verify in database
psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM affiliate_commissions ORDER BY created_at DESC LIMIT 5;"
```

### 2. Test Image Loading

```bash
# Visit landing page
open https://storehouse.ng

# Check console for errors
# Should see NO "Failed parsing srcset" errors

# Verify ImageKit is serving images
# Open Network tab, filter by 'imagekit'
# Should see requests to: ik.imagekit.io/onelove431212341234/
```

---

## Quick Fix Commands

### Rebuild and Deploy
```bash
npm run build && vercel --prod --yes
```

### Clear Local Cache
```bash
rm -rf node_modules/.vite
rm -rf dist
npm run build
```

### Reset Service Worker
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
location.reload(true);
```

### Check Build Errors
```bash
npm run build 2>&1 | grep -i error
```

---

## Useful SQL Queries

### Affiliate Analytics
```sql
-- Top earning affiliates
SELECT
  a.payout_email,
  a.referral_code,
  COUNT(DISTINCT r.id) as total_referrals,
  COALESCE(SUM(ac.amount), 0) as total_earnings,
  a.status
FROM affiliates a
LEFT JOIN referrals r ON a.id = r.affiliate_id
LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
GROUP BY a.id, a.payout_email, a.referral_code, a.status
ORDER BY total_earnings DESC
LIMIT 10;

-- Recent commissions
SELECT
  ac.amount,
  ac.commission_rate,
  ac.status,
  ac.created_at,
  a.payout_email as affiliate_email,
  r.referral_code,
  us.subscription_tier_id
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
JOIN referrals r ON ac.referral_id = r.id
LEFT JOIN user_subscriptions us ON r.referred_user_id = us.user_id
ORDER BY ac.created_at DESC
LIMIT 20;

-- Conversion rate
SELECT
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT r.referred_user_id) as converted_users,
  ROUND(COUNT(DISTINCT r.referred_user_id)::numeric / NULLIF(COUNT(DISTINCT r.id), 0) * 100, 2) as conversion_rate
FROM referrals r;
```

### Debug Specific User
```sql
-- Find user by email
SELECT id, email, created_at FROM auth.users WHERE email = 'user@example.com';

-- Check their subscription
SELECT * FROM user_subscriptions WHERE user_id = 'USER_ID_HERE';

-- Check if they were referred
SELECT * FROM referrals WHERE referred_user_id = 'USER_ID_HERE';
```

---

## Monitoring & Logs

### Vercel Logs (Real-time)
```bash
vercel logs https://storehouse.ng --follow
```

### Check Specific Deployment
```bash
vercel ls --prod
vercel inspect DEPLOYMENT_URL --logs
```

### Supabase Logs
1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/logs/explorer
2. Filter by table: `affiliates`, `affiliate_commissions`, `referrals`
3. Check for errors

---

## Emergency Rollback

### Rollback to Previous Deployment
```bash
# List recent deployments
vercel ls --prod

# Rollback
vercel alias set PREVIOUS_DEPLOYMENT_URL storehouse.ng
```

### Restore Database Backup
1. Go to Supabase Dashboard > Database > Backups
2. Select backup from before the issue
3. Click "Restore"

---

## Contact & Support

- **Supabase Support**: https://supabase.com/dashboard/support
- **Vercel Support**: https://vercel.com/help
- **ImageKit Support**: https://imagekit.io/contact-us

---

## Cheat Sheet

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build production | `npm run build` |
| Deploy to production | `vercel --prod --yes` |
| Check deployment logs | `vercel logs storehouse.ng --follow` |
| Run database migration | `PGPASSWORD="Godisgood1." psql "postgresql://..." -f migration.sql` |
| Clear service worker | DevTools > Application > Service Workers > Unregister |
| View affiliate stats | See "Affiliate Analytics" SQL above |
| Test referral flow | Open incognito + use `?ref=CODE` |

---

**Last Updated**: 2026-01-17
**Version**: 2.0

---

## AI Chatbot Not Working

### Symptoms
- Chatbot doesn't appear on landing page
- Messages not sending
- No response from chatbot
- Widget appears but is unresponsive

### Debugging Steps

#### 1. Check if Widget is Loaded (30 seconds)
```javascript
// In browser console on landing page
console.log(document.querySelector('.ai-chat-widget'));
// Should show: <div class="ai-chat-widget">...</div>
// If null: Widget not mounted
```

#### 2. Check OpenAI API Key (1 minute)
```bash
# Check if environment variable is set
vercel env ls | grep OPENAI

# Pull current environment
vercel env pull .env.local
grep OPENAI .env.local
```

**Expected**: Should see `VITE_OPENAI_API_KEY` or `OPENAI_API_KEY`

#### 3. Check Supabase Function (2 minutes)
```bash
# Check if the chat function is deployed
supabase functions list

# View function logs
supabase functions logs chat-ai
```

#### 4. Check Network Requests (1 minute)
1. Open DevTools > Network tab
2. Click chatbot, send a message
3. Look for requests to:
   - `/functions/v1/chat-ai` (Supabase)
   - `api.openai.com` (OpenAI)

**Common Issues**:
- ❌ 401 Unauthorized → API key invalid
- ❌ 429 Too Many Requests → Rate limit exceeded
- ❌ 500 Server Error → Check function logs
- ❌ CORS Error → Supabase configuration issue

#### 5. Test Chat Functionality
```sql
-- Check if chat history is being saved
SELECT * FROM ai_chat_history ORDER BY created_at DESC LIMIT 10;

-- Check for error logs
SELECT * FROM error_logs WHERE error_type LIKE '%chat%' ORDER BY created_at DESC LIMIT 10;
```

### Quick Fixes

#### Widget Not Appearing
```javascript
// Location: src/pages/LandingPage.tsx
// Check around line 1300-1400 for AIChatWidget component

// Verify it's included:
import AIChatWidget from '../components/AIChatWidget';

// Verify it's rendered:
<AIChatWidget />
```

#### Messages Not Sending
```javascript
// Location: src/components/AIChatWidget.tsx
// Check handleSendMessage function

// Add debug logging:
console.log('Sending message:', message);
```

#### API Key Issues
```bash
# Add/update API key in Vercel
vercel env add OPENAI_API_KEY
# Enter your key when prompted

# Redeploy
./DEBUG_COMMANDS.sh deploy
```

### Files to Check
- **Widget Component**: `src/components/AIChatWidget.tsx`
- **Chat Function**: `supabase/functions/chat-ai/index.ts`
- **Styles**: Look for `.ai-chat-widget` in CSS files
- **Environment**: `.env.local` and Vercel env vars

### SQL Debugging Queries
```sql
-- View recent chat interactions
SELECT
  ch.message,
  ch.response,
  ch.created_at,
  u.email as user_email
FROM ai_chat_history ch
LEFT JOIN auth.users u ON ch.user_id = u.id
ORDER BY ch.created_at DESC
LIMIT 20;

-- Check for error patterns
SELECT
  error_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE error_type LIKE '%chat%' OR error_type LIKE '%openai%'
GROUP BY error_type
ORDER BY error_count DESC;
```

---

## Adding Item/Product Not Working

### Symptoms
- "Add Product" button doesn't work
- Form submits but product not saved
- Image upload fails
- Product appears but data is incomplete

### Debugging Steps

#### 1. Check Console Errors (30 seconds)
```javascript
// Open DevTools > Console
// Look for errors when clicking "Add Product"

// Common errors:
// - "Cannot read property 'id' of undefined" → User context issue
// - "Permission denied" → RLS policy issue
// - "Failed to upload image" → Storage/ImageKit issue
```

#### 2. Check Database Insert (1 minute)
```sql
-- Check if products are being created
SELECT * FROM products ORDER BY created_at DESC LIMIT 10;

-- Check user's products specifically
SELECT * FROM products WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'products';
```

#### 3. Check Image Upload (2 minutes)

**Method 1 - Check Supabase Storage**:
```bash
# In Supabase Dashboard:
# Storage > products > user_id folders
# Should see uploaded images
```

**Method 2 - Check ImageKit**:
```bash
# Visit: https://imagekit.io/dashboard
# Media Library > Should see images
# Check upload limits
```

**Method 3 - Check Network Tab**:
1. Open DevTools > Network
2. Try adding product with image
3. Look for:
   - `/storage/v1/object/products/...` (Supabase upload)
   - `ik.imagekit.io/...` (ImageKit transformation)

#### 4. Check Form Validation (1 minute)
```javascript
// Location: Look for AddProduct or ProductForm component
// Check validation logic

// Add debug logging:
console.log('Form data:', formData);
console.log('Validation errors:', errors);
```

#### 5. Check Subscription Limits (1 minute)
```sql
-- Check user's subscription tier
SELECT
  us.subscription_tier_id,
  st.name as tier_name,
  st.max_products,
  COUNT(p.id) as current_products
FROM user_subscriptions us
JOIN subscription_tiers st ON us.subscription_tier_id = st.id
LEFT JOIN products p ON us.user_id = p.user_id
WHERE us.user_id = 'USER_ID_HERE'
GROUP BY us.subscription_tier_id, st.name, st.max_products;

-- If current_products >= max_products, user hit limit!
```

### Common Issues & Fixes

#### Issue: "Product not saving"
```sql
-- Check RLS policies allow insert
SELECT * FROM pg_policies WHERE tablename = 'products' AND cmd = 'INSERT';

-- Fix: Enable RLS insert for authenticated users
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own products"
ON products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

#### Issue: "Image upload fails"
```javascript
// Check MultiImageUpload component
// Location: src/components/MultiImageUpload.tsx

// Common issues:
// 1. File too large (check max size)
// 2. Invalid file type
// 3. Storage bucket not accessible
// 4. ImageKit quota exceeded

// Debug:
console.log('File size:', file.size);
console.log('File type:', file.type);
console.log('Upload response:', response);
```

#### Issue: "Form submits but data incomplete"
```javascript
// Check supabaseProducts.js or product service
// Location: src/services/supabaseProducts.js

// Add logging before insert:
console.log('Inserting product:', productData);

// Check response:
const { data, error } = await supabase.from('products').insert(productData);
console.log('Insert result:', { data, error });
```

### Files to Check
- **Product Form**: Search for "AddProduct" or "ProductForm" component
- **Image Upload**: `src/components/MultiImageUpload.tsx`
- **Product Service**: `src/services/supabaseProducts.js`
- **Database**: Supabase > Table Editor > products

### SQL Debugging Queries
```sql
-- Find failed product insertions (check error_logs)
SELECT *
FROM error_logs
WHERE error_type LIKE '%product%' OR error_type LIKE '%insert%'
ORDER BY created_at DESC
LIMIT 20;

-- Check product counts per user
SELECT
  p.user_id,
  u.email,
  COUNT(*) as product_count,
  MAX(p.created_at) as last_product_added
FROM products p
JOIN auth.users u ON p.user_id = u.id
GROUP BY p.user_id, u.email
ORDER BY product_count DESC;

-- Check image upload success rate
SELECT
  COUNT(*) FILTER (WHERE images IS NOT NULL AND array_length(images, 1) > 0) as with_images,
  COUNT(*) FILTER (WHERE images IS NULL OR array_length(images, 1) = 0) as without_images,
  COUNT(*) as total_products
FROM products
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Quick Test
```bash
# Test product creation flow
# 1. Login to dashboard
# 2. Click "Add Product"
# 3. Open DevTools Console
# 4. Fill form and submit
# 5. Check console for errors
# 6. Verify in database:
./DEBUG_COMMANDS.sh db-products  # (add this command if needed)
```

---

## Automated Monitoring with Sentry

### What is Sentry?
Sentry automatically captures errors in production and sends you alerts BEFORE users report them.

### Setup (Already Configured!)
```bash
# 1. Sign up at https://sentry.io (FREE tier available)
# 2. Create new project: "Storehouse"
# 3. Get your DSN key
# 4. Add to Vercel:
vercel env add VITE_SENTRY_DSN
# Paste your Sentry DSN

# 5. Deploy
./DEBUG_COMMANDS.sh deploy
```

### What Sentry Monitors
✅ **JavaScript Errors**: Uncaught exceptions, promise rejections  
✅ **Network Errors**: Failed API calls, timeouts  
✅ **Performance**: Slow page loads, API response times  
✅ **User Context**: Which user experienced the error  
✅ **Breadcrumbs**: What user did before error occurred  
✅ **Session Replay**: Video recording of user's session  

### Example Alert
```
🚨 New Error in Production!

Error: Cannot read property 'id' of undefined
  at ProductForm.tsx:145:23
  at handleSubmit

Affected: 5 users
Last seen: 2 minutes ago
Browser: Chrome 120
Page: /dashboard

[View in Sentry] [Ignore] [Resolve]
```

### Sentry Dashboard Features
1. **Issues**: List of all errors, grouped by similarity
2. **Performance**: Slow transactions, API calls
3. **Releases**: Track errors per deployment
4. **Alerts**: Configure email/Slack notifications

### Manual Error Capturing
```javascript
// In your code, capture specific errors:
import { captureError, captureMessage } from './lib/sentry';

try {
  await createProduct(data);
} catch (error) {
  // Automatically sends to Sentry with context
  captureError(error, {
    feature: 'product-creation',
    userId: currentUser.id,
    metadata: { productData: data }
  });
}

// Track important events
captureMessage('User hit product limit', 'warning', {
  userId: currentUser.id,
  currentCount: productCount,
  limit: maxProducts
});
```

### Cost
- **FREE**: Up to 5,000 errors/month + 50 session replays
- **Paid**: $26/month for 50,000 errors + unlimited replays

**Recommendation**: Start with FREE tier. Upgrade only if you exceed limits.

