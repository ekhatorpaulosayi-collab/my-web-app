# 🔧 How to Fix storehouse.ng DNS on Smartweb/Doveserver

## ✅ All Fixes Are Deployed!
Your app is working perfectly at: **https://smartstock-v2.vercel.app**

## 🌐 To Make storehouse.ng Work Again:

Since you purchased the domain through **Smartweb Nigeria**, you need to update the DNS records in their control panel.

### Option 1: Login to Smartweb Control Panel

1. **Go to:** https://doveserver.com or https://smartweb.com.ng
2. **Login** with your Smartweb account credentials
3. **Find:** Domain Management / DNS Management / Zone Editor
4. **Look for:** storehouse.ng

### Option 2: Update DNS Records

Once you're in the DNS management for storehouse.ng, you need to:

#### DELETE these records (if they exist):
- Any A record pointing to 216.198.79.1
- Any old hosting records

#### ADD these NEW records:

**For storehouse.ng (root domain):**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
TTL: 3600
```

**For www.storehouse.ng:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### Option 3: Change Nameservers (Alternative)

If you can't find DNS management, you can change the nameservers instead:

1. In Smartweb domain management, find "Nameservers" or "DNS Servers"
2. Change from:
   - dns1.doveserver.com
   - dns2.doveserver.com

3. To Vercel's nameservers:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com

### 📞 Contact Smartweb Support

If you can't access your account or find the DNS settings:

**Smartweb Nigeria Limited Support:**
- Website: https://smartweb.com.ng
- Support Email: support@smartweb.com.ng
- Phone: Check their website for current phone numbers

**Tell them:**
"I need to update the DNS records for storehouse.ng to point to my new hosting at Vercel. I need to change the A record to 76.76.21.21 and the www CNAME to cname.vercel-dns.com"

## 🎯 What's Happening:

Your domain has been with Smartweb for the past 5 months and was probably pointing to their hosting servers. Something changed recently (possibly):
- Hosting expired at Smartweb
- DNS records were modified
- Their server IP changed

The domain itself is still active and registered, it just needs to point to Vercel instead of the old Smartweb hosting.

## ⏰ Timeline:
- **5 minutes:** Update DNS records in Smartweb
- **5-30 minutes:** DNS starts working
- **Up to 48 hours:** Full global propagation

## 🚀 Meanwhile, Use These URLs:
- **https://smartstock-v2.vercel.app** ✅ (Works NOW!)
- **https://storehouse.vercel.app** ✅ (Alternative)

Share these with your customers temporarily while DNS is being fixed.

## ✅ What's Already Fixed:
1. **Product limit bug** - You can now add products!
2. **Upgrade modal** - Shows correct limits
3. **Customer Chats** - New feature added (in More Menu)
4. **React errors** - All fixed

Your app is fully functional and deployed!