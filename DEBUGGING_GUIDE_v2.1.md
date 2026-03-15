# Storehouse Debugging & Development Guide

## 🚀 How to Debug Issues - Quick Guide

### 1. Open Browser Console (F12)
**First thing to check - errors show here!**

Look for red error messages:
- `Cannot read property 'X' of undefined` = Data is missing
- `Failed to fetch` = API/database problem
- `404 Not Found` = File or route doesn't exist

### 2. Check Console Logs
Components log important info:
```
[RecordSaleModalV2] Customer phone: +447459044
[StaffPinLogin] Authenticating staff with PIN
```

Look for `[ComponentName]` messages - they show what's happening.

### 3. Test Locally
```bash
cd /home/ekhator1/smartstock-v2
npm run dev
```
Open http://localhost:5173 and try to reproduce the issue.

### 4. Check the Database
Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl)

Quick SQL checks:
```sql
-- See my products
SELECT * FROM products WHERE user_id = 'YOUR_USER_ID' LIMIT 10;

-- See staff members
SELECT * FROM staff_members WHERE owner_uid = 'YOUR_USER_ID';

-- See invoices
SELECT * FROM invoices WHERE owner_uid = 'YOUR_USER_ID' LIMIT 5;
```

### 5. Common Fixes

**Button not working on mobile?**
- Needs `touchAction: 'manipulation'`

**Modal not appearing?**
- Check if parent is closing too early (unmounting issue)

**WhatsApp wrong number?**
- Check phone validation in console logs

**Styling broken?**
- className must match CSS file (example: `rs-cart-bar` not `sticky-cart-bar`)

### 6. Fix → Test → Deploy
```bash
# Make your changes, then:
git add <files>
git commit -m "Fix: what you fixed"
git push origin main
vercel --prod
```

### Quick Commands
```bash
# Restart dev server
lsof -ti:5173 | xargs kill -9 && npm run dev

# Check for TypeScript errors
npx tsc --noEmit

# Search for text in code
grep -r "searchTerm" src/
```

### Where to Find Files

| Feature | Main Files | Database |
|---------|-----------|----------|
| **Staff** | `src/pages/StaffManagement.tsx`<br>`src/components/StaffPinLogin.tsx` | `staff_members` |
| **Receipts** | `src/components/RecordSaleModalV2.tsx` | `sales` |
| **Invoices** | `src/pages/CreateInvoice.tsx` | `invoices` |
| **Chatbot** | `src/components/AIChatWidget.tsx` | `embeddings` |

---

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
| **Manage Staff** | Dashboard → **More** → Manage Staff | `src/pages/StaffManagement.tsx` | `staff_members`<br>`staff_activity_logs` |
| **Staff Mode** | Dashboard → More → Staff Mode | `src/contexts/StaffContext.tsx`<br>`src/components/StaffPinLogin.tsx` | `staff_members` |

### 📤 Data Features
| Feature | Access Path | Component | Function |
|---------|------------|-----------|----------|
| **Export Data (CSV)** | Dashboard → Export Data | Various pages with export buttons | `exportToCSV()` in respective components |

---

## 🔍 Quick Debugging by Feature

### Invoices Not Working
```bash
# Check database
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5;"

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
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, business_name, store_slug, custom_domain, subdomain FROM business_profiles WHERE store_slug IS NOT NULL;"

# 2. Check specific business
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT business_name, store_slug, storefront_enabled FROM business_profiles WHERE business_name = 'Your Business Name';"

# 3. Verify slug is URL-friendly (lowercase, hyphens, no spaces)
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT store_slug FROM business_profiles WHERE store_slug ~ '[^a-z0-9-]';"  # Should return empty if all valid

# 4. Check for duplicate slugs (should be unique!)
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT store_slug, COUNT(*) FROM business_profiles WHERE store_slug IS NOT NULL GROUP BY store_slug HAVING COUNT(*) > 1;"

# 5. Test the URL
curl -I https://storehouse.ng/store/YOUR-SLUG

# 6. Check component
code src/pages/StorefrontPage.tsx
```

**Common Issues:**

**Issue: "Store not found"**
```bash
# Check if slug exists
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM business_profiles WHERE store_slug = 'your-slug';"

# If empty, user needs to set up their store slug:
# Dashboard → Settings → Online Store → Store Slug
```

**Issue: "Store slug has spaces or special characters"**
```bash
# Find invalid slugs
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT business_name, store_slug FROM business_profiles WHERE store_slug ~ '[^a-z0-9-]';"

# Fix: Convert to lowercase with hyphens
# Example: "Paul's Tech Shop" → "pauls-tech-shop"
```

### Customer Reviews Not Appearing
```bash
# Check reviews table
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM reviews ORDER BY created_at DESC LIMIT 10;"

# Check component
code src/components/ReviewManagement.tsx
```

### Sales Channel Data Missing
```bash
# Check sales channels
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM sales_channels;"

# Check analytics component
code src/components/ChannelAnalytics.tsx
```

### Staff Management Issues

**✨ UPDATED 2026-03-11**

#### Staff Cannot Be Permanently Deleted

**By Design**: Staff members can ONLY be deactivated, not permanently deleted.

**Reason**: Preserves activity logs and sales history for business records and audit trails.

**Location**: `src/services/staffService.ts:248-253`

**How it works**:
```javascript
// The deleteStaffMember() function is actually a "soft delete"
export async function deleteStaffMember(ownerUid: string, staffId: string): Promise<void> {
  // Just deactivate instead of actual delete to preserve activity logs
  await toggleStaffActive(ownerUid, staffId, false);

  console.log('[staffService] ✅ Staff member deleted (deactivated)');
}
```

**What happens when staff is deactivated**:
- ✅ Staff PIN stops working immediately
- ✅ Cannot log in via Staff Mode
- ✅ Sales history remains intact
- ✅ Activity logs preserved
- ✅ Can be reactivated later if needed

**To deactivate staff**:
```bash
# Check staff table
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM staff_members ORDER BY created_at DESC LIMIT 10;"

# Check who is active/inactive
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, name, role, is_active, last_login_at FROM staff_members WHERE store_owner_uid = 'YOUR_UID';"
```

**Staff Navigation**:
- **CORRECT**: Dashboard → More → Manage Staff
- **WRONG**: Dashboard → Settings → Staff Management (Settings menu doesn't exist)

**Staff Roles** (Only 2 exist):
- **Manager**: Can view reports, manage customer debts, record sales
- **Cashier**: Limited access (sales only, no reports or debt management)
- ❌ **Viewer role does NOT exist**

**Staff Login Process**:
1. Owner logs in first (email + password)
2. Owner taps **More** → **Staff Mode**
3. Staff enters 4-6 digit PIN (NO phone number needed)
4. Staff Mode activated

**Check staff-related files**:
```bash
code src/pages/StaffManagement.tsx
code src/components/StaffPinLogin.tsx
code src/contexts/StaffContext.tsx
code src/services/staffService.ts
```

#### Buttons Not Working on Mobile

**✨ UPDATED 2026-03-11**

**Symptoms**:
- Buttons work perfectly on desktop
- Same buttons unresponsive to taps on mobile devices
- Especially common with activate/deactivate buttons

**Root Cause**:
Mobile browsers have 300ms tap delay to detect double-tap gestures.

**Solution**:
Add these CSS properties to button styles:

```javascript
// Example from src/pages/StaffManagement.tsx:483-485
<button
  onClick={() => onToggleActive(member)}
  style={{
    padding: '8px 12px',
    background: member.is_active ? '#FEF2F2' : '#ECFDF5',
    border: `1px solid ${member.is_active ? '#FEE2E2' : '#D1FAE5'}`,
    borderRadius: '6px',
    cursor: 'pointer',
    // Mobile optimization:
    touchAction: 'manipulation',  // ✅ Removes 300ms tap delay
    WebkitTapHighlightColor: 'transparent'  // ✅ Removes tap highlight
  }}
>
  {member.is_active ? 'Deactivate' : 'Activate'}
</button>
```

**How it works**:
- `touchAction: 'manipulation'` tells mobile browsers to fire click events immediately without waiting for double-tap detection
- `WebkitTapHighlightColor: 'transparent'` removes the default blue highlight on tap

**Files affected**:
- `src/pages/StaffManagement.tsx` (activate/deactivate buttons) ✅ Fixed 2026-03-11

**Testing**:
1. Open app on mobile device
2. Go to More → Manage Staff
3. Tap Activate/Deactivate button
4. Should respond instantly (no 300ms delay)

### Export Data Not Working
```bash
# Check browser console for errors
# Most export functions are client-side

# Search for export functions
grep -r "exportToCSV" src/
```

### Receipt & WhatsApp Issues

**✨ UPDATED 2026-03-11**

#### Issue 1: Receipt Modal Not Appearing

**Symptoms**:
- After completing sale, receipt modal doesn't show
- Have to click "record sales" again to see receipt
- Receipt appears briefly then disappears

**Root Cause**:
Receipt modal's `onClose` handler was calling parent modal's `onClose()`, which unmounted everything and destroyed state.

**Fix** (File: `src/components/RecordSaleModalV2.tsx`):
```javascript
// BEFORE (WRONG):
<ReceiptOptionsModal
  isOpen={showReceiptModal}
  onClose={() => {
    setShowReceiptModal(false);
    onClose();  // ❌ This closes parent modal, destroying state!
  }}
  receiptData={receiptData}
/>

// AFTER (CORRECT):
<ReceiptOptionsModal
  isOpen={showReceiptModal}
  onClose={() => {
    setShowReceiptModal(false);
    // ✅ Don't close parent modal - keep state alive
  }}
  receiptData={receiptData}
/>
```

**Benefits**:
- ✅ Receipt modal appears immediately after sale
- ✅ Can share receipt multiple times (WhatsApp, email, copy)
- ✅ WhatsApp won't destroy receipt state
- ✅ Better UX - explicit control over when to close

#### Issue 2: WhatsApp Receipt Goes to Wrong Number

**Symptoms**:
- WhatsApp opens but wrong phone number pre-filled
- Receipt sends to incorrect customer

**Debugging**:
```javascript
// Add logging in RecordSaleModalV2.tsx
console.log('📱 Phone validation:', {
  input: displayPhone,
  isValid: isPhoneValidForReceipt,
  formatted: formatPhoneForWhatsApp(displayPhone)
});

// Check WhatsApp function logs
console.log('WhatsApp formatting:', {
  input: phone,
  output: formattedPhone,
  countryCode: detectedCountryCode
});
```

**Common Issues**:

**a) International numbers not working**
```javascript
// Check src/utils/whatsapp.ts
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check if already has country code
  if (cleaned.startsWith('+')) {
    return cleaned.substring(1); // Remove + for WhatsApp
  }

  // Detect country codes
  if (cleaned.startsWith('234')) return cleaned; // Nigeria
  if (cleaned.startsWith('44')) return cleaned;  // UK
  if (cleaned.startsWith('1')) return cleaned;   // US/Canada
  if (cleaned.startsWith('0')) {
    return '234' + cleaned.substring(1); // Nigerian local format
  }

  // Default: assume Nigerian
  return '234' + cleaned;
}
```

**Fix applied**: Added support for UK (44), US (1), Australia (61), India (91), and other country codes.

**b) Phone input doesn't accept + sign**
```javascript
// BEFORE (WRONG):
<input type="tel" /> // ❌ tel keyboard doesn't have + key

// AFTER (CORRECT):
<input
  type="text"  // ✅ Shows full keyboard with +
  placeholder="+234 080 1234 5678 or +44 745 904 4..."
  onChange={handlePhoneChange}
/>
```

#### Issue 3: Complete Sale Button Hidden (Desktop)

**Symptoms**:
- Footer with "Complete Sale" button pushed below visible area
- Users have to scroll down to click button

**Root Cause**:
CSS class mismatch - component used `className="sticky-cart-bar"` but CSS defined `.rs-cart-bar`

**Fix** (File: `src/components/RecordSaleModalV2.tsx`):
```javascript
// BEFORE (WRONG):
<div className="sticky-cart-bar">  // ❌ CSS class doesn't exist!

// AFTER (CORRECT):
<div className="rs-cart-bar">  // ✅ Matches CSS definition
```

**CSS that now applies**:
```css
.rs-cart-bar {
  position: sticky;
  bottom: 0;
  z-index: 50;
  background: white;
  border-top: 1px solid #e5e7eb;
}
```

#### Debugging Receipt Flow

**Test the complete flow**:
```bash
# 1. Record a sale with customer phone
# 2. Check browser console for logs:

# Expected logs:
# "💾 Saving sale..."
# "✅ Sale saved, showing receipt modal"
# "📱 Phone validation: { input: '08012345678', isValid: true }"
# "🎯 Opening receipt modal with data: {...}"

# 3. Click WhatsApp share
# Expected: WhatsApp opens with correct phone and receipt text

# 4. Check WhatsApp URL format:
# https://wa.me/2348012345678?text=RECEIPT_TEXT_HERE
```

**Check phone validation**:
```javascript
// In browser console during sale:
console.log('Phone state:', {
  displayPhone: displayPhone,
  isValid: isPhoneValidForReceipt,
  formatted: formatPhoneForWhatsApp(displayPhone)
});
```

**Check receipt data**:
```javascript
// When receipt modal opens:
console.log('Receipt data:', receiptData);
// Should show: customer name, phone, items, total, etc.
```

#### Files to Check

**Receipt Modal**:
- `src/components/RecordSaleModalV2.tsx` - Main sales modal
- `src/components/ReceiptOptionsModal.tsx` - Receipt display modal

**Phone/WhatsApp**:
- `src/utils/phone.ts` - Phone validation (international support)
- `src/utils/whatsapp.ts` - WhatsApp formatting

**CSS**:
- Check for `.rs-cart-bar` class definition
- Verify `sticky` positioning

#### SQL Debugging

```sql
-- Check recent sales with customer phone
SELECT
  id,
  customer_name,
  customer_phone,
  total,
  created_at
FROM sales
WHERE customer_phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Find sales with missing/incorrect phone
SELECT
  id,
  customer_name,
  customer_phone,
  CASE
    WHEN customer_phone IS NULL THEN 'No phone'
    WHEN customer_phone !~ '^[\+0-9\s\-()]+$' THEN 'Invalid format'
    WHEN LENGTH(customer_phone) < 10 THEN 'Too short'
    ELSE 'OK'
  END as phone_status
FROM sales
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 🤖 AI Chatbot Debugging

**✨ UPDATED 2026-03-11**

### Architecture Overview

The Storehouse AI chatbot uses a **micro-chunks + RAG** architecture:

1. **Micro-chunks**: Small, focused documentation pieces (500-1000 lines each)
2. **RAG (Retrieval Augmented Generation)**: Vector search using OpenAI embeddings
3. **Embeddings**: 1536-dimension vectors stored in Supabase `documentation` table

### Documentation Files

```
src/data/
├── documentation.ts          # Main documentation array (imports all micro-chunks)
├── staffMicroChunks.js       # 6 chunks for staff management (500+ lines)
├── invoiceMicroChunks.js     # Invoice features
└── debtCreditMicroChunks.js  # Debt tracking and credit sales
```

### How Micro-Chunks Work

**Example: Staff Management**

File: `src/data/staffMicroChunks.js`

Contains 6 focused chunks:
1. **staff-add-member** - How to add staff (15 keywords)
2. **staff-mode-login** - Staff login process (15 keywords)
3. **staff-manage-existing** - Reset PIN, deactivate/reactivate (15 keywords)
4. **staff-roles-permissions** - Manager vs Cashier (14 keywords)
5. **staff-vs-owner-mode** - Mode differences (12 keywords)
6. **staff-setup-checklist** - Quick start guide (10 keywords)

**Total**: 81 keyword variations for optimal RAG retrieval

**Why micro-chunks are better**:
- ✅ Focused content (easier for RAG to find exact match)
- ✅ Faster retrieval (smaller chunks = higher precision)
- ✅ Better keyword targeting (each chunk optimized for specific queries)
- ❌ Old approach: 1,000+ line documents with mixed topics (poor RAG performance)

### Common AI Chatbot Issues

#### Issue 1: Chatbot Giving Wrong Answers

**Symptoms**:
- Chatbot says "Tap Settings → Staff" (wrong navigation)
- Mentions "Viewer" role (doesn't exist)
- Describes features that don't exist

**Root Cause**: Old documentation not updated or micro-chunks not imported

**Fix**:
```bash
# Step 1: Check if micro-chunks are imported
code src/data/documentation.ts

# Should see:
import { staffMicroChunks } from './staffMicroChunks';
import { invoiceMicroChunks } from './invoiceMicroChunks';
import { debtCreditMicroChunks } from './debtCreditMicroChunks';

# Step 2: Check if micro-chunks are spread into DOCUMENTATION array
# Around line 5710, should see:
export const DOCUMENTATION: Documentation[] = [
  ...invoiceMicroChunks,
  ...debtCreditMicroChunks,
  ...staffMicroChunks,  // ← CRITICAL!
  // ... other docs
];
```

**If micro-chunks are missing**:
```bash
# Add import at top of documentation.ts
import { staffMicroChunks } from './staffMicroChunks';

# Add spread in DOCUMENTATION array
...staffMicroChunks,

# Regenerate embeddings
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
OPENAI_API_KEY=your_openai_key \
npm run generate-embeddings
```

#### Issue 2: Embeddings Not Generated

**Symptoms**:
- Chatbot returns generic answers
- Documentation added but not retrieved

**Check embeddings**:
```sql
-- Check if documentation has embeddings
SELECT id, title, category,
       array_length(embedding, 1) as embedding_dimensions
FROM documentation
WHERE title LIKE '%staff%'
ORDER BY created_at DESC;

-- Should show 1536 dimensions for each document
```

**Regenerate embeddings**:
```bash
# Set environment variables
export VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
export OPENAI_API_KEY=your_openai_key

# Run embeddings generation
npm run generate-embeddings

# Expected output:
# ✅ Processing documentation... 73 total documents
# ✅ Document 53/73: staff-add-member
# ✅ Document 54/73: staff-mode-login
# ...
# ✅ Successfully saved 67/73 documents
```

#### Issue 3: Chatbot Widget Not Appearing

**Debugging Steps**:

```javascript
// 1. Check if widget is loaded (in browser console)
console.log(document.querySelector('.ai-chat-widget'));
// Should show: <div class="ai-chat-widget">...</div>
// If null: Widget not mounted

// 2. Check component is imported
// Location: src/pages/LandingPage.tsx (around line 1300-1400)
import AIChatWidget from '../components/AIChatWidget';

// 3. Check widget is rendered
<AIChatWidget />
```

**Check OpenAI API Key**:
```bash
# Check environment variables
vercel env ls | grep OPENAI

# Pull current environment
vercel env pull .env.local
grep OPENAI .env.local

# Expected: VITE_OPENAI_API_KEY or OPENAI_API_KEY
```

**Check Supabase Function**:
```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs chat-ai
```

**Network Debugging**:
1. Open DevTools → Network tab
2. Send a message in chatbot
3. Look for requests to:
   - `/functions/v1/chat-ai` (Supabase)
   - `api.openai.com` (OpenAI)

**Common errors**:
- ❌ 401 Unauthorized → API key invalid
- ❌ 429 Too Many Requests → Rate limit exceeded
- ❌ 500 Server Error → Check function logs
- ❌ CORS Error → Supabase configuration issue

### Debugging Wrong Chatbot Answers

**Add logging to trace RAG retrieval**:

```javascript
// In chatbot component or API function
console.log('User query:', userQuery);
console.log('Retrieved docs:', retrievedDocs);
console.log('Top matches:', retrievedDocs.slice(0, 3).map(d => ({
  title: d.title,
  score: d.similarity_score
})));
```

**Check RAG retrieval scores**:
```sql
-- Test search query manually
SELECT
  id,
  title,
  category,
  1 - (embedding <=> YOUR_QUERY_EMBEDDING) as similarity_score
FROM documentation
ORDER BY embedding <=> YOUR_QUERY_EMBEDDING
LIMIT 5;
```

**Expected scores**:
- 0.8 - 1.0: Excellent match
- 0.6 - 0.8: Good match
- 0.4 - 0.6: Moderate match
- < 0.4: Poor match (may need better keywords)

### Files to Check

- **Widget Component**: `src/components/AIChatWidget.tsx`
- **Chat Function**: `supabase/functions/chat-ai/index.ts`
- **Documentation**: `src/data/*.js`
- **Embeddings Generation**: `scripts/generate-embeddings.ts`
- **Environment**: `.env.local` and Vercel env vars

---

## Codebase Structure

```
smartstock-v2/
├── src/
│   ├── pages/              # All page components
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.jsx
│   │   ├── StaffManagement.tsx  # Staff management UI
│   │   ├── AffiliateDashboard.tsx
│   │   ├── AffiliateSignup.tsx
│   │   ├── AffiliateAdmin.tsx
│   │   └── StorefrontPage.tsx
│   ├── components/         # Reusable components
│   │   ├── AIChatWidget.tsx  # AI chatbot widget
│   │   ├── StaffPinLogin.tsx  # Staff PIN login modal
│   │   └── MultiImageUpload.tsx
│   ├── contexts/          # React contexts (Auth, Business, etc.)
│   │   └── StaffContext.tsx  # Staff mode state management
│   ├── services/          # API services
│   │   ├── staffService.ts    # Staff CRUD operations
│   │   ├── affiliateService.ts
│   │   ├── invoiceService.ts
│   │   ├── referralService.ts
│   │   └── subscriptionService.ts
│   ├── data/              # Documentation for AI chatbot
│   │   ├── documentation.ts        # Main doc array
│   │   ├── staffMicroChunks.js     # Staff docs (6 chunks)
│   │   ├── invoiceMicroChunks.js   # Invoice docs
│   │   └── debtCreditMicroChunks.js # Debt tracking docs
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
│       └── chat-ai/       # AI chatbot function
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

-- View staff members
SELECT id, name, role, is_active, last_login_at
FROM staff_members
ORDER BY created_at DESC LIMIT 10;

-- View staff activity logs
SELECT * FROM staff_activity_logs
ORDER BY created_at DESC LIMIT 20;
```

### Connection String
```
postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
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

#### 4. Check Subscription Limits (1 minute)
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

### Files to Check
- **Product Form**: Search for "AddProduct" or "ProductForm" component
- **Image Upload**: `src/components/MultiImageUpload.tsx`
- **Product Service**: `src/services/supabaseProducts.js`
- **Database**: Supabase > Table Editor > products

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
- `/rest/v1/staff_members` - Staff CRUD
- Paystack webhook: Check Vercel logs

---

## Common Debugging Scenarios

### Affiliate Commission Not Recording

1. **Check Paystack Webhook**
```bash
vercel logs https://storehouse.ng --follow
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

---

## Environment Variables

### Required for Production (Vercel)
```bash
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/onelove431212341234
VITE_IMAGEKIT_PUBLIC_KEY=public_QdLLjPTKH/+dRHxXqo0lSiOs310=
VITE_OPENAI_API_KEY=sk-proj-...  # For AI chatbot
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # For embeddings generation
OPENAI_API_KEY=sk-proj-...  # For embeddings generation
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
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM affiliate_commissions ORDER BY created_at DESC LIMIT 5;"
```

### 2. Test Staff Management Flow

**✨ UPDATED 2026-03-11**

```bash
# Step 1: Add a staff member
# Visit: https://storehouse.ng/dashboard
# Tap More → Manage Staff → Add Staff
# Fill: Name, PIN (4-6 digits), Role (Manager or Cashier)

# Step 2: Test Staff Mode login
# Tap More → Staff Mode
# Enter the 4-6 digit PIN
# Should log in successfully

# Step 3: Test permissions
# If Manager: Can view Reports, manage Customers
# If Cashier: Can only record Sales

# Step 4: Test deactivate/reactivate
# Go to Manage Staff
# Tap staff member
# Tap Deactivate
# Try logging in via Staff Mode → Should fail
# Tap Activate
# Try logging in → Should work

# Step 5: Verify in database
docker run --rm postgres:15 psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT name, role, is_active, last_login_at FROM staff_members ORDER BY created_at DESC LIMIT 5;"
```

### 3. Test AI Chatbot Accuracy

**✨ UPDATED 2026-03-11**

```bash
# Test queries in production chatbot widget
# Visit: https://storehouse.ng

# Test staff management queries:
# 1. "how do i add staff to my business"
# Expected: Should mention "More → Manage Staff" (NOT "Settings")

# 2. "what roles can i assign to staff"
# Expected: Should say "Manager or Cashier" (NOT mention "Viewer")

# 3. "how does staff login"
# Expected: Should explain "Owner logs in → More → Staff Mode → PIN only"

# 4. "can i delete staff permanently"
# Expected: Should explain deactivate/reactivate (not permanent delete)

# 5. "how to record installment payment"
# Expected: Should distinguish between invoice payments and credit sale debts

# Check chatbot retrieval in browser console:
# Should see logs like:
# Retrieved docs: [
#   { title: "staff-add-member", score: 0.85 },
#   { title: "staff-mode-login", score: 0.82 }
# ]
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

### Regenerate AI Chatbot Embeddings
```bash
# After updating documentation files
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
OPENAI_API_KEY=your_openai_key \
npm run generate-embeddings

# Expected output: 67/73 documents processed successfully
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
```

### Staff Analytics

**✨ UPDATED 2026-03-11**

```sql
-- Active vs inactive staff count
SELECT
  is_active,
  role,
  COUNT(*) as count
FROM staff_members
GROUP BY is_active, role
ORDER BY is_active DESC, role;

-- Recent staff activity
SELECT
  sm.name,
  sm.role,
  sal.action_type,
  sal.action_details,
  sal.created_at
FROM staff_activity_logs sal
JOIN staff_members sm ON sal.staff_id = sm.id
ORDER BY sal.created_at DESC
LIMIT 20;

-- Staff login frequency
SELECT
  name,
  role,
  last_login_at,
  is_active,
  CASE
    WHEN last_login_at > NOW() - INTERVAL '1 day' THEN 'Active Today'
    WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 'Active This Week'
    WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 'Active This Month'
    ELSE 'Inactive'
  END as login_status
FROM staff_members
ORDER BY last_login_at DESC NULLS LAST;
```

### Debug Specific User
```sql
-- Find user by email
SELECT id, email, created_at FROM auth.users WHERE email = 'user@example.com';

-- Check their subscription
SELECT * FROM user_subscriptions WHERE user_id = 'USER_ID_HERE';

-- Check if they were referred
SELECT * FROM referrals WHERE referred_user_id = 'USER_ID_HERE';

-- Check their staff members
SELECT * FROM staff_members WHERE store_owner_uid = 'USER_ID_HERE';
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
2. Filter by table: `affiliates`, `affiliate_commissions`, `referrals`, `staff_members`, `documentation`
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
| Run database query | `docker run --rm postgres:15 psql "postgresql://..." -c "YOUR_QUERY"` |
| Clear service worker | DevTools > Application > Service Workers > Unregister |
| View staff stats | See "Staff Analytics" SQL above |
| Test staff flow | More → Manage Staff → Add/Deactivate/Activate |
| Regenerate AI embeddings | `npm run generate-embeddings` |
| Test chatbot accuracy | Ask staff questions and check responses |

---

## Recent Changes (2026-03-11)

### ✨ Staff Management Improvements

1. **Fixed Mobile Touch Issues**
   - Added `touchAction: 'manipulation'` to activate/deactivate buttons
   - Removed 300ms tap delay on mobile devices
   - File: `src/pages/StaffManagement.tsx:483-485`

2. **Documented Soft Delete Behavior**
   - Staff can only be deactivated (not permanently deleted)
   - Preserves activity logs and sales history
   - Can be reactivated later
   - File: `src/services/staffService.ts:248-253`

3. **Updated Navigation Paths**
   - Correct: More → Manage Staff
   - Removed incorrect references to "Settings" menu

### ✨ AI Chatbot Improvements

1. **Created Staff Management Micro-Chunks**
   - 6 focused chunks with 81 keywords
   - Based on actual code (no aspirational features)
   - File: `src/data/staffMicroChunks.js`

2. **Fixed Critical Import Bug**
   - staffMicroChunks was created but never imported
   - Added import and spread to documentation.ts
   - Regenerated embeddings (67/73 success)

3. **Removed Incorrect Documentation**
   - Deleted 576 lines of wrong staff docs
   - No more "Settings", "Viewer role", "phone + PIN" references
   - File: `src/data/documentation.ts:5704-6275` (deleted)

4. **Enhanced Debt/Credit Documentation**
   - Added invoice vs debt payment disambiguation
   - Better keyword targeting for installment queries
   - File: `src/data/debtCreditMicroChunks.js`

### ✨ Receipt & WhatsApp Improvements

1. **Fixed Receipt Modal Not Appearing**
   - Root cause: Modal's onClose was unmounting parent, destroying state
   - Solution: Keep parent modal open, allow independent close
   - Benefits: Receipt appears immediately, can share multiple times
   - File: `src/components/RecordSaleModalV2.tsx`

2. **Added International Phone Number Support**
   - Created `validateInternationalPhone()` function
   - Supports: Nigerian (234/0), UK (44), US (1), Australia (61), India (91), etc.
   - Phone input changed from "tel" to "text" to show + key
   - Files: `src/utils/phone.ts`, `src/components/RecordSaleModalV2.tsx`

3. **Fixed WhatsApp Receipt for International Numbers**
   - Updated `formatPhoneForWhatsApp()` to detect country codes
   - Previously prepended 234 to ALL numbers (broke international)
   - Now correctly handles UK, US, and 8+ other countries
   - File: `src/utils/whatsapp.ts`

4. **Fixed Complete Sale Button Hidden on Desktop**
   - Root cause: CSS class mismatch (`sticky-cart-bar` vs `.rs-cart-bar`)
   - Cart bar had NO styling, pushing footer below viewport
   - Solution: Fixed className to match CSS definition
   - File: `src/components/RecordSaleModalV2.tsx`

### ✨ Search Bar UX Improvements

1. **Enhanced Edit/Delete Icon Logic**
   - Improved touch target and interaction logic for edit/delete icons
   - Better visual feedback and responsiveness
   - More intuitive icon placement and behavior

2. **Added Tappable Fields**
   - Can now tap quantity field to edit quantity
   - Can now tap price field to edit price
   - Can now tap item name to edit item
   - Makes inline editing more intuitive and mobile-friendly
   - Reduces need to use separate edit buttons

---

**Last Updated**: 2026-03-11
**Version**: 2.1
**Major Changes**: Staff management fixes, AI chatbot accuracy improvements, mobile UX fixes, receipt/WhatsApp improvements, search bar UX enhancements
