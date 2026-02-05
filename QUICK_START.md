# Storehouse - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to: http://localhost:5173
```

### 2. Quick Debug Commands
```bash
# Make the script executable (one time)
chmod +x DEBUG_COMMANDS.sh

# Use it
./DEBUG_COMMANDS.sh help           # Show all commands
./DEBUG_COMMANDS.sh dev            # Start dev server
./DEBUG_COMMANDS.sh deploy         # Deploy to production
./DEBUG_COMMANDS.sh db-affiliates  # View affiliates
./DEBUG_COMMANDS.sh db-stats       # View statistics
./DEBUG_COMMANDS.sh logs           # View production logs
```

---

## 📁 Key Files & Locations

### 🧾 Business Features
- **Invoices**: `src/pages/Invoices.tsx`, `src/pages/CreateInvoice.tsx`, `src/services/invoiceService.ts`
- **Online Store**: `src/components/OnlineStoreSetup.tsx`, `src/pages/StorefrontPage.tsx`
- **Customer Reviews**: `src/components/ReviewManagement.tsx`
- **Customers**: `src/pages/CustomersPage.tsx`

### 💰 Revenue Features
- **Affiliate Signup**: `src/pages/AffiliateSignup.tsx`
- **Affiliate Dashboard**: `src/pages/AffiliateDashboard.tsx`
- **Affiliate Admin**: `src/pages/AffiliateAdmin.tsx`
- **Affiliate Service**: `src/services/affiliateService.ts`
- **Referral Dashboard**: `src/pages/ReferralDashboard.tsx`

### 📊 Analytics Features
- **Sales by Channel**: `src/components/ChannelAnalytics.tsx`
- **Daily Sales Summary**: `src/components/DailySalesSummary.tsx`

### 👥 Team Features
- **Staff Management**: `src/pages/StaffManagement.tsx`
- **Staff Context**: `src/contexts/StaffContext.tsx`

### 🖼️ Images
- **ImageKit Config**: `src/lib/imagekit.ts`
- **Landing Page Images**: `src/pages/LandingPage.tsx`

### 💾 Database
- **Connection**: See `DEBUGGING_GUIDE.md`
- **Key Tables**: affiliates, affiliate_commissions, referrals, invoices, customers, reviews, staff, products

---

## 🐛 Debugging

### Quick Checks
1. **Is the site loading?** → Check https://storehouse.ng
2. **Are images showing?** → Check browser console for errors
3. **Is affiliate working?** → Run `./DEBUG_COMMANDS.sh db-stats`

### Common Issues

#### Images Not Loading
```bash
# Check console for "Failed parsing srcset" errors
# If found, images are using old cached version

# Solution: Clear browser cache
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

#### Affiliate Commission Not Recording
```bash
# Check if referral was captured
./DEBUG_COMMANDS.sh db-referrals

# Check if commission was created
./DEBUG_COMMANDS.sh db-commissions

# Check Paystack webhook logs
./DEBUG_COMMANDS.sh logs
```

#### Database Connection Issues
```bash
# Test connection
PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT NOW();"
```

---

## 📊 Monitoring

### Real-time Production Logs
```bash
./DEBUG_COMMANDS.sh logs
```

### Check Affiliate Stats
```bash
./DEBUG_COMMANDS.sh db-stats
```

### View Recent Activity

**Affiliate & Revenue:**
```bash
./DEBUG_COMMANDS.sh db-affiliates
./DEBUG_COMMANDS.sh db-commissions
./DEBUG_COMMANDS.sh db-referrals
```

**Business Features:**
```bash
./DEBUG_COMMANDS.sh db-invoices      # Latest invoices
./DEBUG_COMMANDS.sh db-customers     # Latest customers
./DEBUG_COMMANDS.sh db-reviews       # Latest reviews
./DEBUG_COMMANDS.sh db-products      # Latest products
```

**Team Features:**
```bash
./DEBUG_COMMANDS.sh db-staff         # Staff members
```

**Technical:**
```bash
./DEBUG_COMMANDS.sh db-chat-history  # AI chat logs
./DEBUG_COMMANDS.sh db-errors        # Recent errors
```

**Custom Queries:**
```bash
./DEBUG_COMMANDS.sh db-query "SELECT * FROM your_table LIMIT 10;"
```

---

## 🔧 Deployment

### Deploy to Production
```bash
./DEBUG_COMMANDS.sh deploy
```

### Manual Deployment
```bash
npm run build
vercel --prod --yes
```

### Rollback
```bash
vercel ls --prod              # List deployments
vercel alias set OLD_URL storehouse.ng  # Rollback
```

---

## 📚 Documentation

- **Full Debugging Guide**: `DEBUGGING_GUIDE.md`
- **Architecture**: See codebase structure in `DEBUGGING_GUIDE.md`
- **API Reference**: Check individual service files in `src/services/`

---

## 🧪 Testing Affiliate Flow

### Step-by-Step Test
```bash
# Run this command for instructions
./DEBUG_COMMANDS.sh test-affiliate
```

### Manual Test
1. Visit: https://storehouse.ng/affiliate/signup
2. Sign up as affiliate
3. Get referral link from: https://storehouse.ng/affiliate/dashboard
4. Open incognito window
5. Visit: https://storehouse.ng/?ref=YOUR_CODE
6. Sign up and subscribe (use test card: 4084084084084081)
7. Check dashboard for 30% commission

---

## 🔑 Important URLs

| Service | URL |
|---------|-----|
| **Production Site** | https://storehouse.ng |
| **Affiliate Signup** | https://storehouse.ng/affiliate/signup |
| **Affiliate Dashboard** | https://storehouse.ng/affiliate/dashboard |
| **Affiliate Admin** | https://storehouse.ng/affiliate/admin |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl |
| **Vercel Dashboard** | https://vercel.com/pauls-projects-cfe953d7/smartstock-v2 |
| **ImageKit Dashboard** | https://imagekit.io/dashboard |

---

## 💡 Tips

1. **Always use the debug script**: `./DEBUG_COMMANDS.sh` for common tasks
2. **Check logs first**: When debugging issues, always check `./DEBUG_COMMANDS.sh logs`
3. **Test in incognito**: When testing user flows (signups, referrals)
4. **Use SQL queries**: Fastest way to verify data - see `DEBUGGING_GUIDE.md`
5. **Clear cache often**: Browser cache can cause confusing issues

---

## ⚡ Quick Reference

```bash
# Development
npm run dev                         # Start dev server
npm run build                       # Build for production

# Debugging
./DEBUG_COMMANDS.sh logs            # View production logs
./DEBUG_COMMANDS.sh db-stats        # View statistics

# Database - Revenue
./DEBUG_COMMANDS.sh db-affiliates   # Latest affiliates
./DEBUG_COMMANDS.sh db-commissions  # Latest commissions
./DEBUG_COMMANDS.sh db-referrals    # Latest referrals

# Database - Business
./DEBUG_COMMANDS.sh db-invoices     # Latest invoices
./DEBUG_COMMANDS.sh db-customers    # Latest customers
./DEBUG_COMMANDS.sh db-reviews      # Latest reviews
./DEBUG_COMMANDS.sh db-products     # Latest products
./DEBUG_COMMANDS.sh db-staff        # Staff members

# Database - Custom
./DEBUG_COMMANDS.sh db-query "SQL"  # Run custom query

# Deployment
./DEBUG_COMMANDS.sh deploy          # Build & deploy to production

# See all commands
./DEBUG_COMMANDS.sh help            # Show complete list
```

---

**Need help?** Check `DEBUGGING_GUIDE.md` for detailed documentation.

**Last Updated**: 2026-01-17
