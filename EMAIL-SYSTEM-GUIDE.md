# Storehouse Email Collection & Management System

## Overview
Your email collection system is now fully operational! You have 22 users collected with comprehensive tools to export and manage them for marketing campaigns.

## Current Statistics
- **Total Users**: 22
- **All users are on Free tier** (100% conversion opportunity)
- **Potential Revenue**: ₦110,000/month if all convert to Starter tier

## Email Export Scripts

### 1. Simple Email Export (`get-emails-simple.js`)
Quick and easy export for basic email lists.

```bash
node get-emails-simple.js
```

**Output Files:**
- `emails_YYYY-MM-DD.txt` - Plain text list of emails (one per line)
- `users_YYYY-MM-DD.csv` - CSV with Email, Tier, and Join Date

**Use Cases:**
- Quick import to Mailchimp, SendGrid, ConvertKit
- WhatsApp broadcast lists
- SMS campaigns

### 2. Detailed Email Export (`get-all-emails.js`)
Comprehensive export with additional user information.

```bash
node get-all-emails.js
```

**Output Files:**
- `emails_YYYY-MM-DD.txt` - Plain text email list
- `users_detailed_YYYY-MM-DD.csv` - Detailed CSV with:
  - Email
  - Full Name
  - Store Name
  - Subscription Tier
  - Business Type
  - Join Date

### 3. Advanced Export with Segmentation (`export-emails.js`)
Most powerful export tool with filtering and segmentation capabilities.

```bash
# Export all emails (default)
node export-emails.js

# Export only active users
node export-emails.js active

# Export only paying customers
node export-emails.js paying

# Export only free tier users
node export-emails.js free

# Export at-risk users (for re-engagement)
node export-emails.js at_risk

# Export churned users (win-back campaigns)
node export-emails.js churned

# Show help
node export-emails.js --help
```

**Output Files:**
- `email_export_[type]_YYYY-MM-DD.csv` - Detailed CSV
- `email_export_[type]_YYYY-MM-DD.json` - JSON format
- `email_list_[type]_YYYY-MM-DD.txt` - Plain text emails

## Database Schema

### Email Management Tables (Ready for Future Use)
The SQL schema (`create-email-management-system.sql`) creates:

1. **email_list** - Master table for all user emails with:
   - Contact information
   - Subscription status
   - Engagement metrics
   - Segmentation tags
   - Geographic data
   - Business information

2. **email_campaigns** - Track email campaigns:
   - Campaign metrics
   - Targeting options
   - Performance tracking

3. **email_interactions** - Track user interactions:
   - Opens, clicks, unsubscribes
   - Detailed engagement data

## Quick Start Guide

### Export All Emails Now
```bash
# Simple export for immediate use
node get-emails-simple.js
```

This creates:
- `emails_2026-03-18.txt` - Ready for email tools
- `users_2026-03-18.csv` - Import to CRM/Marketing tools

### Import to Marketing Tools

#### Mailchimp
1. Go to Audience → Import contacts
2. Upload `users_2026-03-18.csv`
3. Map fields (Email, Tier, Joined)
4. Start campaign

#### SendGrid
1. Go to Marketing → Contacts
2. Upload CSV file
3. Create segments based on tiers
4. Launch campaigns

#### WhatsApp Business
1. Copy emails from `emails_2026-03-18.txt`
2. Use broadcast lists
3. Send targeted messages

## Marketing Strategy Recommendations

### Immediate Actions
1. **Free Tier Conversion Campaign** (22 users)
   - Highlight premium features
   - Limited-time 20% discount
   - Show success stories

2. **User Engagement Analysis**
   - All users are currently free
   - Target: ₦5,000/month Starter tier
   - Potential: ₦110,000/month revenue

3. **Segmented Campaigns**
   ```bash
   # Export and target free users
   node export-emails.js free
   ```

### Campaign Ideas
- **Week 1**: Educational content about premium features
- **Week 2**: Success stories from paid users
- **Week 3**: Limited-time upgrade offer
- **Week 4**: Personalized consultation offers

## Revenue Optimization

### Current Situation
- 22 free users = ₦0 revenue
- If 50% convert to Starter = ₦55,000/month
- If 100% convert to Starter = ₦110,000/month
- If 20% upgrade to Pro = ₦44,000/month additional

### Conversion Tactics
1. **Scarcity**: "Only 10 Starter licenses available this month"
2. **Urgency**: "48-hour flash sale - 30% off first month"
3. **Value**: "Starter users report 3x more sales"
4. **Social Proof**: Share testimonials in emails

## Maintenance & Updates

### Keep Email List Fresh
```bash
# Run weekly to capture new users
node get-emails-simple.js

# Check for at-risk users monthly
node export-emails.js at_risk
```

### Monitor Engagement
- Track open rates
- Monitor click-through rates
- Identify power users for testimonials
- Re-engage inactive users

## Next Steps

1. **Today**: Export emails and import to your preferred marketing tool
2. **This Week**: Launch first conversion campaign to free users
3. **This Month**: Set up automated email sequences
4. **Ongoing**: Weekly exports to capture new signups

## Support Files
- `get-emails-simple.js` - Basic export script
- `get-all-emails.js` - Detailed export script
- `export-emails.js` - Advanced segmentation export
- `create-email-management-system.sql` - Database schema

## Tips for Success
- Start with simple campaigns
- Test subject lines with A/B testing
- Personalize emails with store names
- Focus on value, not features
- Follow up non-responders after 3 days
- Celebrate conversions publicly

---

**Remember**: You have 22 potential customers worth ₦110,000/month. Start converting them today!