# 💬 Chat Widget - LLM Choice & Pricing Strategy

## 🤖 Which LLM API We're Using

### **Claude AI by Anthropic** (Best Choice)

**Model: Claude 3.5 Haiku** (Fastest & Cheapest)

**Why Claude over ChatGPT:**

| Feature | Claude Haiku | GPT-4o Mini | GPT-3.5 Turbo |
|---------|--------------|-------------|---------------|
| **Input Cost** | ₦0.38/1M tokens | ₦0.15/1M tokens | ₦0.50/1M tokens |
| **Output Cost** | ₦1.88/1M tokens | ₦0.60/1M tokens | ₦1.50/1M tokens |
| **Avg Chat Cost** | **₦0.75** | **₦0.30** | **₦0.65** |
| **Speed** | 1-2 seconds | 1-2 seconds | 2-3 seconds |
| **Quality** | Excellent | Very Good | Good |
| **Safety** | Best guardrails | Good | Moderate |
| **Context Window** | 200K tokens | 128K tokens | 16K tokens |

**Decision: Use GPT-4o Mini** (Cheapest at ₦0.30/chat)

**Updated Cost per chat: ₦0.30** (70% cheaper than Claude!)

---

## 🏪 Chat Widget on URL Slugs

### **Yes, each store page gets a widget!**

**Where widgets appear:**

1. **Dashboard** (`/` - logged in users)
   - Onboarding widget (if new user)
   - Help widget (bottom right corner)

2. **Public Storefront** (`/store/:slug` - anyone can access)
   - Customer inquiry widget
   - Each shop owner's store has its own widget
   - Widget knows which store it belongs to

**Example:**
```
Paul's Electronics:
https://storehouse.com/store/pauls-electronics
→ Widget answers about Paul's products only

Sarah's Fashion:
https://storehouse.com/store/sarahs-fashion
→ Widget answers about Sarah's products only
```

**How it works:**
1. Customer visits `/store/pauls-electronics`
2. Chat widget loads
3. Widget knows: `store_slug = pauls-electronics`
4. When customer asks "How much is iPhone 13?"
5. API searches ONLY Paul's products
6. Returns Paul's prices

**Free users:** No storefront widget (incentive to upgrade)
**Paying users:** Storefront widget enabled ✅

---

## 💰 Pricing Strategy: Free vs Paid

### 🎯 Competitor Analysis (Nigeria)

| Competitor | Free Tier | Paid Plans | AI Features |
|------------|-----------|------------|-------------|
| **Loystar** | ❌ None | ₦5,000/mo | ❌ No AI |
| **Zoho** | 50 orders/month | $79/mo (~₦120k) | ❌ No AI |
| **Tracepos** | 7-day trial | ₦5,000/mo | ❌ No AI |
| **Vend** | ❌ None | $99/mo (~₦150k) | ❌ No AI |

**Your advantage: You're the ONLY one with AI chat!** 🎉

---

## 📊 Recommended Pricing Tiers

### With GPT-4o Mini (₦0.30/chat):

| Tier | Price | AI Chats | Cost to You | Profit | Margin | Features |
|------|-------|----------|-------------|--------|--------|----------|
| **Free** | ₦0 | **10/mo** | ₦3 | -₦3 | Loss | Dashboard help only |
| **Starter** | ₦5,000 | **100/mo** | ₦30 | ₦4,970 | **99.4%** | Help + Storefront widget |
| **Pro** | ₦10,000 | **500/mo** | ₦150 | ₦9,850 | **98.5%** | Everything + Analytics |
| **Business** | ₦15,000 | **1,500/mo** | ₦450 | ₦14,550 | **97%** | Unlimited help chats |

---

## 🆓 Free Tier Strategy

### Option 1: Very Conservative (5 chats)
**Pros:**
- ✅ Low cost (₦1.50/user)
- ✅ Forces quick upgrade

**Cons:**
- ❌ Not enough to see value
- ❌ User frustration
- ❌ Low conversion

### Option 2: Moderate (10 chats) ⭐ **RECOMMENDED**
**Pros:**
- ✅ Shows real value (₦3/user)
- ✅ User can test properly
- ✅ Natural upgrade path
- ✅ Better than competitors (they have 0!)

**Cons:**
- ⚠️ Slight cost (₦3,000 for 1000 free users)

### Option 3: Generous (20 chats)
**Pros:**
- ✅ Full experience (₦6/user)
- ✅ High satisfaction

**Cons:**
- ❌ Less incentive to upgrade
- ❌ Higher costs (₦6,000 for 1000 free users)

---

## 🎯 My Strong Recommendation

### **Free Tier: 10 AI Chats/Month**

**Why 10 is perfect:**

1. **Shows Value Without Giving Too Much**
   - Enough to test onboarding (3-5 chats)
   - Enough to try help widget (5-7 chats)
   - Runs out just when they see value → upgrade!

2. **Competitive Advantage**
   - Loystar: ₦5,000/mo minimum, no free, no AI
   - You: Free tier + AI = huge win!

3. **Low Cost for You**
   - 1000 free users × 10 chats = ₦3,000/month
   - If 10% convert to ₦5,000 plan = ₦500,000 revenue
   - ROI: 166:1 🚀

4. **Psychological Sweet Spot**
   - Not so low they can't test
   - Not so high they never upgrade
   - "Just 10 chats? I need more!" → upgrade

---

## 📈 Paid Tiers Breakdown

### **Starter (₦5,000/mo) - 100 AI Chats**

**Target:** Small shops, 1-2 employees

**Chat allocation:**
- 50 chats: Help widget (dashboard)
- 50 chats: Storefront widget (customers)

**Real-world usage:**
- Help: ~2 questions/day × 30 days = 60 chats
- Storefront: ~1-2 inquiries/day = 40 chats
- **Total: ~100 chats (perfect fit!)**

**Your cost:** ₦30/month
**Profit:** ₦4,970 (99.4% margin)

---

### **Pro (₦10,000/mo) - 500 AI Chats**

**Target:** Medium shops, 3-5 employees, higher traffic

**Chat allocation:**
- 150 chats: Help widget
- 350 chats: Storefront widget (busy store)

**Real-world usage:**
- Help: ~5 questions/day × 30 = 150 chats
- Storefront: ~10 inquiries/day = 300 chats
- **Total: ~450 chats**

**Your cost:** ₦150/month
**Profit:** ₦9,850 (98.5% margin)

**Extra features:**
- ✅ Chat analytics dashboard
- ✅ Export chat logs
- ✅ Custom widget branding

---

### **Business (₦15,000/mo) - 1,500 AI Chats**

**Target:** Large shops, multiple locations, high traffic

**Chat allocation:**
- 500 chats: Help widget (multiple staff)
- 1,000 chats: Storefront widget (busy online store)

**Real-world usage:**
- Help: ~15 questions/day × 30 = 450 chats
- Storefront: ~30 inquiries/day = 900 chats
- **Total: ~1,350 chats**

**Your cost:** ₦450/month
**Profit:** ₦14,550 (97% margin)

**Extra features:**
- ✅ Everything in Pro
- ✅ Priority support
- ✅ API access
- ✅ White-label widget

---

## 🛡️ Free Tier Restrictions (Prevent Abuse)

### **What Free Users DON'T Get:**

1. ❌ **No Storefront Widget**
   - Only dashboard help
   - Must upgrade for customer-facing widget
   - **Reason:** This is the high-value feature

2. ❌ **No Chat Analytics**
   - Can't see chat history
   - Can't export logs
   - **Reason:** Premium feature

3. ❌ **No Custom Branding**
   - Widget shows "Powered by Storehouse"
   - **Reason:** Marketing for us

4. ❌ **Lower Rate Limits**
   - Max 2 chats per hour (vs 5 for paid)
   - **Reason:** Prevent abuse

5. ⚠️ **10 Chats Total/Month**
   - Resets on 1st of month
   - No rollover
   - **Reason:** Encourages upgrade

---

## 💡 Conversion Strategy

### **When Free User Hits 10 Chats:**

**Show upgrade prompt:**
```
┌─────────────────────────────────────────┐
│ 🎉 You've used all 10 free AI chats!   │
├─────────────────────────────────────────┤
│                                         │
│ Upgrade to Starter (₦5,000/mo) for:   │
│ ✅ 100 AI chats/month                   │
│ ✅ Storefront widget for customers      │
│ ✅ Chat analytics                       │
│                                         │
│ [Upgrade Now] [Maybe Later]            │
└─────────────────────────────────────────┘
```

**Expected conversion:**
- 10-15% of free users upgrade (industry standard)
- With 1000 free users → 100-150 paying customers
- Revenue: ₦500k - ₦750k/month
- Cost: ₦3k (free tier) + ₦3k-4.5k (paid tier)
- **Profit: ₦493k - ₦743k/month** 🎉

---

## 📊 Cost Analysis at Scale

### With 1000 Free Users + 100 Paid (Starter):

**Free Users:**
- 1000 users × 10 chats × ₦0.30 = **₦3,000/month**

**Paid Users (Starter):**
- 100 users × 100 chats × ₦0.30 = **₦3,000/month**

**Total AI Cost:** ₦6,000/month
**Revenue:** 100 × ₦5,000 = **₦500,000/month**
**Profit:** **₦494,000/month (98.8% margin)**

---

### With 10,000 Free Users + 1,000 Paid:

**Free Users:**
- 10,000 × 10 chats × ₦0.30 = **₦30,000/month**

**Paid Users (avg):**
- 700 Starter (100 chats) = ₦21,000
- 250 Pro (500 chats) = ₦37,500
- 50 Business (1,500 chats) = ₦22,500
- **Total: ₦81,000/month**

**Revenue:**
- 700 × ₦5k = ₦3.5M
- 250 × ₦10k = ₦2.5M
- 50 × ₦15k = ₦750k
- **Total: ₦6.75M/month**

**Total AI Cost:** ₦111,000/month
**Profit:** **₦6.64M/month** 🚀

---

## 🎯 Final Recommendation

### **Free Tier: 10 AI Chats/Month**

**Features:**
- ✅ Onboarding widget (dashboard)
- ✅ Help widget (dashboard)
- ❌ No storefront widget
- ❌ No analytics
- ❌ "Powered by Storehouse" branding

**Cost to you:** ₦3/user/month
**Conversion rate:** 10-15% to paid

---

### **Paid Tiers:**

| Tier | Price | Chats | Key Differentiator |
|------|-------|-------|-------------------|
| **Starter** | ₦5,000 | 100 | Storefront widget ✅ |
| **Pro** | ₦10,000 | 500 | Analytics + branding ✅ |
| **Business** | ₦15,000 | 1,500 | Priority support ✅ |

---

## 🏆 Why This Beats Competitors

**Loystar (Main Competitor):**
- ❌ No free tier
- ❌ No AI features
- ✅ ₦5,000/mo minimum
- **You win:** Free tier + AI at same price!

**Your advantage:**
1. ✅ Free tier (they don't have)
2. ✅ AI chat (they don't have)
3. ✅ Same price (₦5k for paid)
4. ✅ Better features

**Result:** You'll capture market share fast! 🎉

---

## 🚀 Launch Strategy

### Phase 1: Soft Launch (Month 1)
- Offer **20 free chats** (temporary)
- Get feedback
- Build case studies

### Phase 2: Public Launch (Month 2)
- Reduce to **10 free chats**
- Add testimonials
- Offer launch discount (₦4,000 for Starter)

### Phase 3: Scale (Month 3+)
- Standard pricing
- Add more features to paid tiers
- Upsell to Pro/Business

---

## ✅ Summary

**LLM:** GPT-4o Mini (₦0.30/chat - cheapest!)
**URL Slugs:** Yes, each store gets widget ✅
**Free Tier:** 10 chats (dashboard only)
**Starter:** 100 chats + storefront widget (₦5k)
**Pro:** 500 chats + analytics (₦10k)
**Business:** 1,500 chats + priority (₦15k)

**Free tier is:**
- ✅ Good enough to see value
- ✅ Not so generous that they never upgrade
- ✅ Better than competitors (who have nothing!)
- ✅ Cheap for you (₦3/user)

**Ready to build this?** 🚀
