# 🚀 WhatsApp AI - Complete Deployment Guide

## ✅ What We've Built

I've successfully built a complete WhatsApp AI integration for Storehouse that includes:

### Core Components Created:

1. **Database Schema** (`supabase-migrations/whatsapp-ai-setup.sql`)
   - Subscription tiers table
   - WhatsApp chat logs
   - WhatsApp settings per user
   - Usage tracking and quota management
   - Automatic monthly reset

2. **Supabase Edge Function** (`supabase/functions/whatsapp-webhook/index.ts`)
   - Receives WhatsApp messages from 360dialog or Twilio
   - Routes messages to correct shop owner
   - Searches products using AI
   - Generates responses using Claude AI
   - Logs chats and tracks usage

3. **UI Components**:
   - **WhatsAppAISettings.tsx** - Setup and configuration
   - **WhatsAppPricingTiers.tsx** - Subscription management
   - **WhatsAppAnalyticsDashboard.tsx** - Chat history and analytics
   - **WhatsAppAI.tsx** - Main page with tabs

4. **Features**:
   - ✅ Dual setup modes (self-setup or white-label)
   - ✅ Tiered pricing (Free, Starter, Pro, Business)
   - ✅ Real-time chat analytics
   - ✅ Product search and matching
   - ✅ Claude AI integration
   - ✅ Usage quota tracking
   - ✅ Chat history logging

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

**Go to Supabase Dashboard → SQL Editor**

1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Copy and paste the contents of `supabase-migrations/whatsapp-ai-setup.sql`
3. Click "Run"
4. Verify tables were created:
   ```sql
   SELECT * FROM subscription_tiers LIMIT 1;
   SELECT * FROM whatsapp_settings LIMIT 1;
   SELECT * FROM whatsapp_chats LIMIT 1;
   ```

**Expected result:** All 3 tables should be created successfully.

---

### Step 2: Deploy Supabase Edge Function

**Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

**Login to Supabase:**
```bash
supabase login
```

**Link your project:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Deploy the webhook function:**
```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

**Set environment variables:**
```bash
supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key_here
```

**Get webhook URL:**
After deployment, you'll get a URL like:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook
```

Save this URL - you'll need it for Step 3.

---

### Step 3: Set Up WhatsApp Provider (Choose One)

#### Option A: 360dialog (RECOMMENDED - ₦3/chat)

**1. Sign up:**
- Go to: https://www.360dialog.com/
- Create account
- Submit business verification (2-3 days)

**2. Get API Key:**
- After approval, go to Dashboard → API Keys
- Copy your D360-API-KEY

**3. Configure Webhook:**
```bash
curl -X POST "https://waba.360dialog.io/v1/configs/webhook" \
  -H "D360-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook"
  }'
```

**4. Get WhatsApp Number:**
- 360dialog will provision a WhatsApp number for you
- Note the number (format: +234XXXXXXXXXX)

---

#### Option B: Twilio (Easier but ₦24/chat)

**1. Sign up:**
- Go to: https://www.twilio.com/try-twilio
- Verify your email and phone

**2. Get Credentials:**
- Dashboard → Account → Account SID
- Dashboard → Account → Auth Token

**3. Enable WhatsApp:**
- Console → Messaging → Try it Out → Send a WhatsApp Message
- Follow sandbox setup (for testing)

**4. Configure Webhook:**
- Console → Messaging → Settings → WhatsApp Sandbox Settings
- Webhook URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook`
- Method: POST

**5. Production Number:**
- Request WhatsApp number: Console → Phone Numbers → Buy a Number
- Enable WhatsApp messaging
- Set webhook URL

---

### Step 4: Get Claude AI API Key

**1. Sign up for Anthropic:**
- Go to: https://console.anthropic.com/
- Create account

**2. Generate API Key:**
- Dashboard → API Keys → Create Key
- Copy the key (starts with `sk-ant-`)

**3. Add to Supabase Secrets:**
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Cost:** ~₦20 per chat (Claude Haiku model)

---

### Step 5: Test the Integration

**1. Access WhatsApp AI Page:**
- Go to: `https://your-storehouse-url.vercel.app/whatsapp-ai`
- Click "Settings" tab

**2. Configure Settings:**
- Choose "Self-Setup (Advanced)"
- Enter your Twilio/360dialog credentials
- Test connection

**3. Send Test Message:**
- Save a test WhatsApp number
- Send message: "How much is iPhone 13?"
- Check if AI responds

**4. Verify in Dashboard:**
- Go to "Analytics" tab
- Check if chat appears in history

---

## 💰 Pricing Configuration

### Current Tiers (From Code)

| Tier | Price | Chats/Month | Features |
|------|-------|-------------|----------|
| Free | ₦0 | 10 | Testing only |
| Starter | ₦10,000 | 100 | Basic AI |
| Pro | ₦15,000 | 500 | Advanced + Analytics |
| Business | ₦25,000 | 2,000 | Enterprise features |

### Cost Breakdown (Per Chat)

**With 360dialog:**
- Claude AI: ₦20
- WhatsApp: ₦3
- **Total Cost: ₦23/chat**
- **Profit Margin: 77% on Starter plan**

**With Twilio:**
- Claude AI: ₦20
- WhatsApp: ₦24
- **Total Cost: ₦44/chat**
- **Profit Margin: 56% on Starter plan**

---

## 🔧 Environment Variables Needed

### Supabase Edge Function Secrets:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend (.env.local):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🎯 How Customers Will Use It

### For Self-Setup Customers:

1. **Customer signs up for Storehouse**
2. **Goes to WhatsApp AI page** (`/whatsapp-ai`)
3. **Chooses "Self-Setup (Advanced)"**
4. **Creates own Twilio/360dialog account**
5. **Enters API keys in Storehouse**
6. **AI starts responding to customers**

### For White-Label Customers (Future):

1. **Customer signs up for Storehouse**
2. **Clicks "Get New AI Number"**
3. **YOU provision a number for them** (via 360dialog Partner API)
4. **Number is instantly activated**
5. **Customer pays YOU ₦15,000/month (all-inclusive)**

---

## 🚀 White-Label Setup (Optional - For Scaling)

### To Become 360dialog Partner:

**1. Apply for Partner Program:**
- Go to: https://www.360dialog.com/partner
- Explain: "Building WhatsApp-enabled inventory software for Nigerian SMEs"
- Benefits: Create unlimited numbers, resell WhatsApp

**2. After Approval:**
- Get partner/reseller API key
- Use API to provision numbers automatically
- Charge customers ₦15,000/month (all-inclusive)

**3. Add Platform Config Table:**
```sql
-- Already created in migration!
INSERT INTO platform_config (provider, api_key, webhook_url)
VALUES ('360dialog', 'YOUR_PARTNER_API_KEY', 'YOUR_WEBHOOK_URL');
```

**4. Update Edge Function:**
- Edge function already supports white-label mode
- Will automatically use `platform_config` API key for sending

---

## 📊 Monitoring & Maintenance

### Check Logs:
```bash
# View Edge Function logs
supabase functions logs whatsapp-webhook

# View errors
supabase functions logs whatsapp-webhook --level error
```

### Database Queries:

**Check usage:**
```sql
SELECT
  u.email,
  st.tier,
  st.chats_used_this_month,
  st.monthly_chat_limit
FROM subscription_tiers st
JOIN auth.users u ON st.user_id = u.id
ORDER BY st.chats_used_this_month DESC;
```

**Top chatting customers:**
```sql
SELECT
  customer_phone,
  COUNT(*) as chat_count,
  AVG(response_time_ms) as avg_response_time
FROM whatsapp_chats
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY customer_phone
ORDER BY chat_count DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue 1: Edge Function Returns 500

**Cause:** Missing environment variables

**Fix:**
```bash
supabase secrets list  # Check if ANTHROPIC_API_KEY is set
supabase secrets set ANTHROPIC_API_KEY=your-key-here
```

---

### Issue 2: No WhatsApp Messages Received

**Cause:** Webhook not configured

**Fix:**
1. Check webhook URL in Twilio/360dialog dashboard
2. Verify URL is correct: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook`
3. Test webhook manually:
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"from":"+2348012345678","text":{"body":"test"}}]}'
```

---

### Issue 3: AI Response Slow

**Cause:** Claude API latency

**Fix:**
1. Check `response_time_ms` in `whatsapp_chats` table
2. If > 3000ms consistently, consider:
   - Upgrading Claude plan
   - Caching common responses
   - Pre-generating responses for popular products

---

### Issue 4: Quota Exceeded

**Cause:** User reached monthly chat limit

**Fix:**
1. Check `subscription_tiers.chats_used_this_month`
2. Offer upgrade: "You've used 100/100 chats. Upgrade to Pro for 500 chats!"
3. Auto-reset on 1st of each month (handled by DB function)

---

## 📈 Next Steps

### Phase 1: Testing (Now)
- ✅ All code is built
- ⏳ Run database migration
- ⏳ Deploy Edge Function
- ⏳ Set up Twilio sandbox
- ⏳ Test with 1-2 products

### Phase 2: Beta Launch (Week 1)
- Invite 5-10 beta users
- Collect feedback
- Monitor usage and costs
- Fix bugs

### Phase 3: Production (Week 2)
- Apply for 360dialog partner
- Switch from Twilio to 360dialog
- Launch to all users
- Add payment integration

### Phase 4: Scale (Month 1+)
- Implement white-label provisioning
- Add advanced features:
  - Image responses (product photos)
  - Order placement via WhatsApp
  - Payment links
  - Voice message support

---

## 🎉 Summary

**What's Ready:**
- ✅ All UI components built
- ✅ Database schema created
- ✅ Edge Function webhook handler written
- ✅ Claude AI integration complete
- ✅ Product search logic implemented
- ✅ Analytics dashboard ready
- ✅ Pricing tiers configured
- ✅ Routes added to app

**What You Need to Do:**
1. Run database migration in Supabase (5 minutes)
2. Deploy Edge Function to Supabase (5 minutes)
3. Sign up for Twilio/360dialog (15 minutes)
4. Get Claude AI API key (5 minutes)
5. Test the integration (10 minutes)

**Total Setup Time: ~40 minutes**

**Then you can start selling to customers!**

---

## 💡 Business Model Recommendations

### Option A: Start Simple (Month 1-2)
- Let customers self-setup (Twilio)
- Charge ₦10,000-15,000/month
- YOU don't manage WhatsApp costs
- Focus on building user base

### Option B: White-Label (Month 3+)
- Become 360dialog partner
- Provision numbers for customers
- Charge ₦15,000/month all-inclusive
- YOU pay ₦3/chat to 360dialog
- Higher margins (77% vs 56%)

**Recommendation:** Start with Option A, transition to Option B after 50+ customers.

---

**Need help with any step? Let me know!** 🚀
