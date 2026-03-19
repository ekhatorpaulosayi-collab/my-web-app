# 🔧 DNS Configuration Fix for storehouse.ng

## Current Issue
Your domain `storehouse.ng` is not pointing to Vercel. It's currently pointing to:
- IP: 216.198.79.1 (Not Vercel)
- Nameservers: dns1.doveserver.com, dns2.doveserver.com

## Solution Options

### Option 1: Use Vercel's Nameservers (Recommended)
Change your domain's nameservers at your registrar to Vercel's:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### Option 2: Keep Current Nameservers and Add Records
If you want to keep using doveserver.com, add these DNS records in your DNS control panel:

#### For storehouse.ng (root domain):
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
TTL: 3600
```

#### For www.storehouse.ng:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

## Step-by-Step Instructions

### If your registrar is Namecheap/GoDaddy/etc:
1. Log into your domain registrar account
2. Find "storehouse.ng" in your domains list
3. Look for "DNS Settings" or "Nameservers"
4. Choose "Custom DNS" or "Custom Nameservers"
5. Replace current nameservers with Vercel's nameservers above
6. Save changes

### If using doveserver.com control panel:
1. Log into your hosting account (possibly at doveserver.com)
2. Find DNS management or Zone Editor
3. Delete any existing A records for @ and www
4. Add the records specified in Option 2 above
5. Save changes

## Verification Steps

After making changes:
1. Wait 5-30 minutes for DNS propagation
2. Test by visiting: https://www.storehouse.ng
3. Check propagation status at: https://www.whatsmydns.net/#A/storehouse.ng

## Current Vercel Deployment
Your site is live and working at:
- https://smartstock-v2.vercel.app ✅
- https://smartstock-v2-6vi5dz0v1-pauls-projects-cfe953d7.vercel.app ✅

Once DNS is fixed, it will also work at:
- https://storehouse.ng
- https://www.storehouse.ng

## Need Help?
- Vercel DNS Docs: https://vercel.com/docs/concepts/projects/domains/add-a-domain
- If you're unsure about your registrar, check: https://who.is/whois/storehouse.ng