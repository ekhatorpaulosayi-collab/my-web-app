# 🚀 WhatsApp AI Integration - Build Plan

## 📋 Project Overview

**Goal:** Add WhatsApp AI chatbot to Storehouse that answers product price inquiries 24/7

**Timeline:** 46 hours (~1.5 weeks at 30 hrs/week)

**Pricing:**
- Base Storehouse: ₦5,000/month
- + AI Starter (100 chats): ₦10,000/month
- + AI Pro (500 chats): ₦15,000/month
- + AI Business (2,000 chats): ₦25,000/month

---

## 🏗️ Architecture

```
Customer                    Twilio WhatsApp API
    │                              │
    │ "How much is iPhone 13?"     │
    └──────────────────────────────>
                                   │
                        ┌──────────▼──────────┐
                        │  Supabase Edge      │
                        │  Function           │
                        │  (Webhook Handler)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Claude AI          │
                        │  (Parse query)      │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Storehouse DB      │
                        │  (Search products)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Format Response    │
                        │  (AI + Template)    │
                        └──────────┬──────────┘
                                   │
Customer receives reply ◄──────────┘
```

---

## 📅 Week-by-Week Plan

### Week 1: Backend Infrastructure (30 hours)

**Day 1-2 (12 hours): Twilio Setup & Database Changes**
- [ ] Create Twilio account
- [ ] Get WhatsApp sandbox number (for testing)
- [ ] Add database tables for WhatsApp chats
- [ ] Add pricing tier table

**Day 3-4 (12 hours): Supabase Edge Function**
- [ ] Create webhook endpoint
- [ ] Handle incoming WhatsApp messages
- [ ] Send responses via Twilio API
- [ ] Test with simple echo bot

**Day 5 (6 hours): Claude AI Integration**
- [ ] Set up Claude API
- [ ] Create product search logic
- [ ] Test AI understanding of queries

---

### Week 2: Features & Testing (16 hours)

**Day 6-7 (10 hours): Response Generation**
- [ ] Create response templates
- [ ] Add emoji support
- [ ] Handle multiple products
- [ ] Handle out-of-stock scenarios

**Day 8 (4 hours): Admin Dashboard**
- [ ] Show chat usage
- [ ] Display remaining quota
- [ ] Analytics (most asked products)

**Day 9 (2 hours): End-to-End Testing**
- [ ] Test full flow
- [ ] Test edge cases
- [ ] Fix bugs

---

## 🎯 Phase 1: Start Today - Database Setup

Let's begin with the database structure.

### Step 1: Create New Tables

We need to add these tables to Storehouse:

```sql
-- Pricing tiers for WhatsApp AI
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business')),
  monthly_chat_limit INTEGER NOT NULL,
  chats_used_this_month INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp conversation log
CREATE TABLE whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_message TEXT NOT NULL,
  bot_response TEXT,
  products_mentioned TEXT[], -- Array of product IDs
  created_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp settings per user
CREATE TABLE whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  business_phone TEXT, -- Their WhatsApp Business number
  greeting_message TEXT DEFAULT 'Hello! I''m your 24/7 AI assistant. Ask me about product prices!',
  out_of_stock_message TEXT DEFAULT 'Sorry, this item is currently out of stock. Would you like to be notified when it''s back?',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Chat quota tracking
CREATE OR REPLACE FUNCTION reset_monthly_chat_quota()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE - INTERVAL '1 month' THEN
    NEW.chats_used_this_month := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_quota_trigger
BEFORE UPDATE ON subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION reset_monthly_chat_quota();

-- RLS policies
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscription_tiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chats"
  ON whatsapp_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own WhatsApp settings"
  ON whatsapp_settings FOR ALL
  USING (auth.uid() = user_id);
```

---

## 🔧 Next Steps (Start Building Today)

### Today's Tasks:

1. **Run SQL migration** (15 mins)
   - Add the tables above to Supabase

2. **Create pricing tier UI** (2 hours)
   - Add "WhatsApp AI" section to settings
   - Show current tier and usage
   - Upgrade buttons

3. **Set up Twilio account** (30 mins)
   - Sign up at twilio.com
   - Get WhatsApp sandbox number
   - Test sending a message

---

## 📝 What I Need from You Today

**Ready to start?** Let's do this in order:

1. **First:** Let me create the SQL migration file
2. **Second:** Add pricing tier UI to Storehouse
3. **Third:** Set up Twilio account (I'll guide you)

---

**Shall we start with Step 1: Creating the database tables?**

I'll create the migration SQL file right now! 🚀
