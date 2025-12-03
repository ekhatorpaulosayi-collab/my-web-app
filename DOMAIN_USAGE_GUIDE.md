# Domain & Subdomain Usage Guide

## 🎯 Overview

Your Storehouse app now has full subdomain and custom domain support baked in. This guide shows you how to use these features when building your frontend.

---

## 📦 What's Available

### Database Columns (stores table)
- `subdomain` - Auto-populated from store_slug (e.g., "my-store")
- `custom_domain` - User's custom domain (e.g., "mybusiness.com")
- `custom_domain_verified` - DNS verification status (boolean)
- `domain_verification_token` - Security token for verification
- `custom_domain_added_at` - Timestamp when domain was added
- `custom_domain_verified_at` - Timestamp when domain was verified

### TypeScript Types
All fields are now in `StoreProfile` interface (`src/types/index.ts`):
```typescript
interface StoreProfile {
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  domainVerificationToken?: string;
  customDomainAddedAt?: string;
  customDomainVerifiedAt?: string;
  // ... other fields
}
```

### Utilities
Domain validation and DNS instructions: `src/utils/domainVerification.ts`

---

## 🚀 Usage Examples

### 1. Display Store Subdomain

```typescript
import { useStore } from '../lib/supabase-hooks';

function StoreInfo() {
  const { store } = useStore(userId);

  return (
    <div>
      <h3>Your Store URL</h3>
      <p>https://{store?.subdomain}.yourdomain.com</p>
      <button onClick={() => window.open(`https://${store?.subdomain}.yourdomain.com`)}>
        Visit Store
      </button>
    </div>
  );
}
```

### 2. Add Custom Domain UI

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validateDomainFormat, generateDNSInstructions } from '../utils/domainVerification';

function CustomDomainSettings({ store }) {
  const [customDomain, setCustomDomain] = useState(store?.custom_domain || '');
  const [error, setError] = useState('');

  const handleAddDomain = async () => {
    // Validate format
    const validation = validateDomainFormat(customDomain);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Generate verification token
    const token = crypto.randomUUID();

    // Save to database
    const { error: dbError } = await supabase
      .from('stores')
      .update({
        custom_domain: customDomain,
        domain_verification_token: token,
        custom_domain_added_at: new Date().toISOString(),
      })
      .eq('id', store.id);

    if (dbError) {
      setError('Failed to save domain');
      return;
    }

    // Show DNS instructions
    const instructions = generateDNSInstructions(customDomain, store.subdomain);
    alert(`Add this DNS record:\n${instructions.recordType}: ${instructions.name} → ${instructions.value}`);
  };

  return (
    <div>
      <label>Custom Domain (Premium)</label>
      <input
        type="text"
        value={customDomain}
        onChange={(e) => setCustomDomain(e.target.value)}
        placeholder="yourbusiness.com"
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleAddDomain}>Add Domain</button>
    </div>
  );
}
```

### 3. Show Domain Verification Status

```typescript
function DomainStatus({ store }) {
  if (!store?.custom_domain) {
    return <p>No custom domain configured</p>;
  }

  return (
    <div>
      <p>Domain: {store.custom_domain}</p>
      <p>
        Status:{' '}
        {store.custom_domain_verified ? (
          <span style={{ color: 'green' }}>✅ Verified</span>
        ) : (
          <span style={{ color: 'orange' }}>⏳ Pending DNS Setup</span>
        )}
      </p>
      {!store.custom_domain_verified && (
        <button onClick={() => checkDNSVerification(store)}>
          Check DNS Status
        </button>
      )}
    </div>
  );
}
```

### 4. Route Based on Domain

```typescript
// In your StorefrontPage.tsx or routing logic
function getStoreIdentifier(url: string) {
  const hostname = new URL(url).hostname;

  // Check if using custom domain
  if (!hostname.includes('yourdomain.com')) {
    // This is a custom domain, find store by custom_domain
    return { type: 'custom', value: hostname };
  }

  // Check if subdomain
  const subdomain = hostname.split('.')[0];
  if (subdomain !== 'yourdomain' && subdomain !== 'www') {
    return { type: 'subdomain', value: subdomain };
  }

  // Fallback to path-based routing (/store/slug)
  const pathMatch = window.location.pathname.match(/^\/store\/([^\/]+)/);
  return pathMatch ? { type: 'slug', value: pathMatch[1] } : null;
}

// Fetch store based on identifier
async function fetchStore(identifier) {
  if (identifier.type === 'custom') {
    return supabase
      .from('stores')
      .select('*')
      .eq('custom_domain', identifier.value)
      .single();
  } else if (identifier.type === 'subdomain') {
    return supabase
      .from('stores')
      .select('*')
      .eq('subdomain', identifier.value)
      .single();
  } else {
    return supabase
      .from('stores')
      .select('*')
      .eq('store_slug', identifier.value)
      .single();
  }
}
```

---

## 🔧 DNS Configuration (When You Get Your Domain)

### Wildcard Subdomain Setup

Add this to your domain's DNS records:

```
Type: A (or CNAME)
Name: *
Value: [Your Server IP or Hosting Domain]
TTL: 3600
```

This allows all subdomains (*.yourdomain.com) to work automatically.

### Custom Domain Verification Flow

1. User adds their domain (e.g., "mybusiness.com")
2. System generates verification token
3. Show DNS instructions to user:
   ```
   Type: CNAME
   Name: @ (or www)
   Value: [store-subdomain].yourdomain.com
   ```
4. Poll DNS to check if configured correctly
5. Once verified, set `custom_domain_verified = true`

---

## 📱 Premium Feature Ideas

Use custom domains as a premium feature:

- **Free Tier**: `storename.yourdomain.com` only
- **Basic Tier**: Custom domain (1 domain)
- **Pro Tier**: Multiple domains + analytics

---

## 🎉 You're Ready!

Everything is now in place. When you get your domain:
1. Configure wildcard DNS
2. Update your frontend to show subdomain info
3. (Optional) Build custom domain UI for premium users

No backend changes needed - it's all baked in! 🚀
