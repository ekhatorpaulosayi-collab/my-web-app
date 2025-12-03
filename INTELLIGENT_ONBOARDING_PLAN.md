# 🤖 Intelligent Onboarding Chat - Personalized Feature Discovery

## 🎯 The Vision

Instead of showing everyone the same tutorial, the AI chat asks each user:
- "What do you want to use Storehouse for?"
- Then unveils the perfect features for their specific use case

**Result:** Personalized onboarding that feels like a human guide! 🎉

---

## 📋 All Storehouse Features (What I Built)

### Core Inventory Management:
1. **Product Management**
   - Add/edit/delete products
   - Track quantities
   - Set purchase & selling prices
   - Low stock alerts
   - Product images
   - Categories & variants
   - Barcode support

2. **Sales Tracking**
   - Record sales (cash/credit/transfer)
   - Sale history
   - Payment methods
   - Customer purchase history
   - Daily/weekly/monthly reports

3. **Money Management**
   - Revenue tracking
   - Profit calculations
   - Expense tracking
   - Financial summaries
   - EOD (End of Day) reports

### Customer Features:
4. **Customer Management**
   - Customer profiles
   - Purchase history per customer
   - Contact information
   - Customer search

5. **Credit/Debt Tracking**
   - Track credit sales
   - Payment reminders
   - Outstanding balances
   - Payment history

### Advanced Features:
6. **Invoicing** (B2B)
   - Create professional invoices
   - Invoice templates
   - Payment tracking
   - Public invoice view
   - Partial payments

7. **Online Storefront**
   - Public store page (`/store/:slug`)
   - Custom URL (e.g., `/store/pauls-shop`)
   - Online catalog
   - Customer inquiries
   - Store branding

8. **Staff Management**
   - Add staff accounts
   - Role-based permissions
   - Activity tracking
   - Multi-user access

9. **Referral Program**
   - Earn by inviting friends
   - Referral tracking
   - Rewards dashboard

10. **Settings & Customization**
    - Business profile
    - Store branding
    - Currency settings
    - Low stock thresholds
    - Receipt customization

---

## 👥 User Types & Their Needs

### 1. **Small Retail Shop Owner** (Most Common)
**Goal:** Track inventory, record sales, know profit

**Key Features:**
- ✅ Product management (add items quickly)
- ✅ Quick sale recording
- ✅ Daily profit reports
- ✅ Low stock alerts
- ⚠️ Later: Online store, staff management

**Onboarding Flow:**
```
AI: Hi! 👋 Welcome to Storehouse! What do you sell?

User: I sell phones and electronics

AI: Perfect! Electronics shop - got it! 📱
    Let me help you get started.

    First, let's add your first product.
    Click "Add Product" in the top right.

    What's one item you sell a lot?

User: iPhone 13

AI: Great! Here's what you need:
    1. Product name: iPhone 13 Pro 128GB
    2. Purchase price: What you paid supplier
    3. Selling price: What customers pay you
    4. Quantity: How many you have

    Try adding it now! I'll wait... 😊

[User adds product]

AI: 🎉 Awesome! Your first product is live!

    Want to know something cool?
    When you record a sale, Storehouse automatically:
    - Reduces quantity
    - Calculates your profit
    - Tracks daily revenue

    Try recording a sale: Click "Sell" button
```

---

### 2. **E-commerce Seller** (Online Focus)
**Goal:** Online store + inventory management

**Key Features:**
- ✅ Online storefront (public page)
- ✅ Product catalog
- ✅ Customer inquiries
- ✅ Inventory sync
- ⚠️ Later: Invoicing, shipping

**Onboarding Flow:**
```
AI: Hi! 👋 What brings you to Storehouse?

User: I sell online, need to manage my store

AI: Online seller! Perfect for you! 🛍️

    Storehouse gives you:
    1. Your own online store (free!)
    2. Inventory management
    3. Customer chat widget

    Let me set you up in 2 minutes...

    First, what's your store name?

User: Sarah's Fashion

AI: Love it! Your store will be:
    storehouse.com/store/sarahs-fashion

    Now add 3-5 products. These will show
    on your online store automatically!

    What do you sell?

User: Dresses, shoes, bags

AI: Perfect! Add them as products, then I'll
    show you your live store page! 🎨
```

---

### 3. **Wholesale/B2B Business**
**Goal:** Invoicing, bulk orders, payment tracking

**Key Features:**
- ✅ Professional invoices
- ✅ Customer management
- ✅ Payment tracking
- ✅ Credit sales
- ⚠️ Later: Multi-location

**Onboarding Flow:**
```
AI: Welcome! What type of business do you run?

User: I sell to other businesses wholesale

AI: B2B wholesale! Got it! 📦

    You'll love these features:
    ✅ Professional invoices
    ✅ Track customer payments
    ✅ Credit sales management

    Let's create your first invoice!

    Go to: Invoices → Create Invoice

    Who's your biggest customer?

User: ABC Electronics

AI: Perfect! Here's how to invoice them:
    1. Customer name: ABC Electronics
    2. Add items they ordered
    3. Set payment terms (e.g., 30 days)
    4. Generate & send invoice

    They'll get a professional invoice they
    can view online. You track payments! 💰
```

---

### 4. **Multi-Location Business**
**Goal:** Manage multiple branches

**Key Features:**
- ✅ Staff management
- ✅ Per-location tracking
- ✅ Centralized inventory
- ⚠️ Later: Transfer between locations

**Onboarding Flow:**
```
AI: Hi! Tell me about your business.

User: I have 3 shops in different locations

AI: Multi-location! Impressive! 🏪

    You can:
    ✅ Add staff per location
    ✅ Track sales per branch
    ✅ Manage all inventory centrally

    Let's set up your first location!

    What's the main branch called?

User: Ikeja branch

AI: Great! Now add staff for Ikeja:
    Settings → Staff Management

    Each staff gets their own login.
    You see everything they do! 👀
```

---

### 5. **Service Provider** (Non-physical products)
**Goal:** Customer management, invoicing

**Key Features:**
- ✅ Customer database
- ✅ Service invoicing
- ✅ Payment tracking
- ⚠️ Optional: Track supplies

**Onboarding Flow:**
```
AI: What do you do?

User: I'm a photographer, need to track clients

AI: Service business! Perfect! 📸

    Storehouse isn't just for products!
    You can:
    ✅ Manage client database
    ✅ Create service invoices
    ✅ Track payments

    Let's add your first client:
    Go to: Customers → Add Customer

    Who's a recent client?

User: John's wedding

AI: Nice! Add them, then create an invoice:
    - Service: Wedding Photography
    - Amount: ₦200,000
    - Payment status: Pending

    You can send them a professional invoice! 💼
```

---

## 🎨 Chat Onboarding Flow (Universal)

### **Stage 1: Discovery (1-2 minutes)**
```
AI: 👋 Hi! I'm your Storehouse guide!

    Quick question: What do you want to use
    Storehouse for?

    a) Track my shop inventory
    b) Sell online
    c) Manage wholesale/B2B
    d) Multiple locations
    e) Something else

[User selects or types]

AI: [Personalized response based on choice]

    Great! Let me show you the perfect features
    for [their use case]...
```

---

### **Stage 2: First Action (2-3 minutes)**
```
AI: Let's get you started with the most important
    thing for [their business type]:

    [For retail]: Add your first product
    [For online]: Set up your store URL
    [For B2B]: Create your first invoice
    [For multi-location]: Add your first staff

    I'll guide you step by step! 🚀
```

---

### **Stage 3: Feature Discovery (ongoing)**
```
AI: 🎉 Nice work! You're set up!

    Want to know some cool features you might
    not know about?

    [Dynamically suggest based on their type]:

    For retail:
    - "Did you know you can get an online store?"
    - "Want to track credit sales?"

    For online:
    - "Want to add a chat widget for customers?"
    - "You can create invoices for bulk orders"

    For B2B:
    - "You can track partial payments"
    - "Want to add your sales team?"
```

---

## 🧠 AI System Prompt (GPT-4o Mini)

```
You are an intelligent onboarding assistant for Storehouse,
a Nigerian inventory management app.

Your job:
1. Ask users what they want to use Storehouse for
2. Identify their business type
3. Guide them to the right features
4. Be friendly, concise, and helpful

Available Storehouse features:
- Product management (all businesses)
- Sales tracking (all businesses)
- Customer management (all businesses)
- Online storefront (e-commerce sellers)
- Professional invoicing (B2B/wholesale)
- Staff management (multi-location)
- Credit/debt tracking (retail/wholesale)
- Financial reports (all businesses)
- Referral program (all users)

User types you'll encounter:
1. Small retail shop (phones, fashion, food)
2. E-commerce seller (online focus)
3. Wholesale/B2B (invoicing, bulk)
4. Multi-location (multiple branches)
5. Service provider (non-physical)

RULES:
1. Ask ONE question at a time
2. Keep responses under 100 words
3. Use emojis sparingly (1-2 per message)
4. Focus on THEIR needs, not all features
5. Guide them to complete ONE task first
6. NEVER discuss topics outside Storehouse

When user asks off-topic:
"I can only help with Storehouse setup!
What feature would you like to explore?"

Current conversation context:
- User type: {user_type}
- Products added: {product_count}
- Sales recorded: {sales_count}
- Store setup: {store_setup_complete}
```

---

## 💾 Database Schema

```sql
-- Chat conversations
CREATE TABLE ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  context_type TEXT DEFAULT 'onboarding', -- onboarding, help, storefront
  user_type TEXT, -- retail, ecommerce, wholesale, multilocation, service
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Individual messages
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user or assistant
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences discovered during onboarding
CREATE TABLE user_onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_type TEXT, -- retail, ecommerce, wholesale, etc.
  primary_goal TEXT, -- track_inventory, sell_online, invoicing, etc.
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  features_shown TEXT[], -- Array of features we've introduced
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat usage tracking (for free tier limits)
CREATE TABLE ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- '2025-01-01'
  chats_used INTEGER DEFAULT 0,
  chat_limit INTEGER NOT NULL, -- 10 for free, 100/500/1500 for paid
  last_chat_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Rate limiting (prevent abuse)
CREATE TABLE ai_chat_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL, -- IP address or user_id
  hour_bucket TIMESTAMP NOT NULL, -- Rounded to hour
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, hour_bucket)
);

-- Indexes
CREATE INDEX idx_ai_chat_conversations_user_id ON ai_chat_conversations(user_id);
CREATE INDEX idx_ai_chat_messages_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX idx_ai_chat_usage_user_id_month ON ai_chat_usage(user_id, month);
CREATE INDEX idx_ai_chat_rate_limits_identifier_hour ON ai_chat_rate_limits(identifier, hour_bucket);

-- RLS Policies
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON ai_chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON ai_chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM ai_chat_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own preferences" ON user_onboarding_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON ai_chat_usage
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 🚀 Implementation Plan

### Step 1: Database Setup (10 min)
- Run SQL migration
- Create tables for chat, preferences, usage

### Step 2: Edge Function (30 min)
- Create `/ai-chat` endpoint
- Integrate GPT-4o Mini
- Add context awareness (user type, features used)
- Implement guardrails

### Step 3: Chat Widget UI (1 hour)
- Floating chat bubble
- Chat window with history
- Message input
- Auto-open on first visit

### Step 4: Onboarding Logic (30 min)
- Detect new users (< 5 products)
- Show discovery questions
- Store user type
- Personalize responses

### Step 5: Feature Unveiling (30 min)
- Track which features user has seen
- Suggest next features based on type
- Progressive disclosure

**Total: ~3 hours**

---

## 💡 Example Conversations

### Retail Shop Owner:
```
AI: Hi! What do you sell?
User: Women's clothing
AI: Fashion! Let's add your first item.
    Click "Add Product" →
User: [adds product]
AI: 🎉 Perfect! Now record a sale to see
    how Storehouse tracks profit automatically!
```

### E-commerce Seller:
```
AI: What's your business?
User: I sell online
AI: Online store! You'll love this:
    Your storefront: /store/your-name
    Let's set it up! What's your store name?
User: Tola's Boutique
AI: Perfect! storehouse.com/store/tolas-boutique
    Add 5 products, I'll show you your live store!
```

---

## ✅ Success Metrics

**Onboarding completion:**
- 80%+ users complete first product addition
- 50%+ users record first sale
- 30%+ users explore second feature

**Engagement:**
- Avg 5-10 messages per onboarding
- < 2 minutes to first action
- User satisfaction: "This felt personal!" 🎯

---

**Ready to build this intelligent onboarding system?** 🚀
