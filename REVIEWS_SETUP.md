# Product Reviews Setup Guide

## Step 1: Run Database Migration ⚡

### Quick Setup (2 minutes):

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Go to **SQL Editor** (left sidebar)

2. **Copy and paste the SQL:**
   - Open: `/supabase/migrations/20250103_create_reviews.sql`
   - Copy the entire file content
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify it worked:**
   ```sql
   SELECT * FROM product_reviews LIMIT 1;
   ```
   - If no errors → ✅ Success!

---

## What This Creates:

### Tables:
- ✅ `product_reviews` - Stores all customer reviews
- ✅ `review_votes` - Tracks helpfulness votes
- ✅ `product_review_stats` - Cached review statistics

### Features:
- ✅ **Automatic stat updates** - When reviews are approved, stats update instantly
- ✅ **Row Level Security** - Customers can only see approved reviews
- ✅ **Store owner moderation** - All reviews start as "pending"
- ✅ **Helpfulness voting** - Customers vote on helpful reviews
- ✅ **Store responses** - You can reply to any review

---

## Step 2: The Components Are Ready!

Once the migration runs, the review system will work automatically:

### For Customers:
- See review stats on product cards (⭐ 4.3 from 127 reviews)
- Read reviews on product detail pages
- Submit reviews with ratings and text
- Vote on helpful reviews
- See store owner responses

### For Store Owners:
- Get email notifications for new reviews (coming soon)
- Approve/reject reviews from dashboard
- Respond to reviews publicly
- View review analytics

---

## Cost: ₦0 💰

Text-only reviews cost nothing:
- Uses existing Supabase database
- No image storage needed
- Unlimited reviews
- Automatic backups included

---

## Next Steps After Migration:

The review system will be live on your storefront immediately! Test it by:

1. Visiting a product on your store
2. Clicking "Write a Review"
3. Submitting a test review
4. Checking your dashboard to approve it
5. Seeing it appear on the product page

**Ready to run the migration? Just copy the SQL and paste it in Supabase! 🚀**
