# 🏢 WhatsApp AI - Full White-Label Model (NO Third-Party for Customers)

## 🎯 What You Want

**Your requirement:**
- Shop owners pay YOU only
- Shop owners DON'T deal with 360dialog, Twilio, or any third party
- YOU handle everything
- They just use Storehouse

**This is called: White-Label / Reseller Model**

---

## 🏗️ How It Works

```
Shop Owner (Paul)
    ↓
Signs up for Storehouse (pays YOU ₦15,000/month)
    ↓
Clicks "Enable WhatsApp AI" in Storehouse
    ↓
YOU automatically provision WhatsApp number for him
    ↓
Paul gets: +234 801 234 5678 (managed by YOU)
    ↓
Paul's customers message this number
    ↓
YOUR backend routes to Paul's inventory
    ↓
AI responds with Paul's products
    ↓
YOU pay 360dialog ₦3/chat (in the background)
    ↓
Paul never knows about 360dialog
```

---

## 💰 Pricing Model (All-Inclusive)

### Option A: Flat Monthly Fee (Simplest)

**Your pricing:**
- Storehouse Base: ₦5,000/month
- + WhatsApp AI (unlimited*): ₦10,000/month
- **Total: ₦15,000/month flat**

*Fair usage policy: 500 chats/month, then ₦50/chat extra

**Customer perspective:**
- One bill: ₦15,000/month
- Everything included
- No third-party accounts
- Just works

**Your economics (per customer):**
- Revenue: ₦15,000/month
- Cost: ~₦5,000/month (200 avg chats × ₦20 + ₦600 WhatsApp)
- **Profit: ₦10,000/month**

**With 100 customers:**
- Revenue: ₦1,500,000/month
- Costs: ₦500,000/month
- **Profit: ₦1,000,000/month**

---

### Option B: Tiered Pricing (Better Margins)

| Tier | Price | Chats Included | Extra Chats | Your Cost | Profit |
|------|-------|----------------|-------------|-----------|--------|
| **Starter** | ₦10,000 | 100/month | ₦100/chat | ₦2,300 | ₦7,700 |
| **Pro** | ₦15,000 | 300/month | ₦75/chat | ₦6,900 | ₦8,100 |
| **Business** | ₦25,000 | 1,000/month | ₦50/chat | ₦23,000 | ₦2,000 |
| **Enterprise** | ₦50,000 | Unlimited* | Included | ₦46,000* | ₦4,000 |

*Up to 2,000 chats, then negotiate custom

---

## 🔧 Technical Implementation

### Backend Architecture

```
Customer WhatsApp Message
    ↓
Sent to: +234 801 234 5678 (Paul's number via YOUR 360dialog)
    ↓
360dialog webhook → YOUR server
    ↓
YOUR server checks: "Which shop owns +234 801 234 5678?"
    ↓
Finds: Paul's Electronics (user_id: abc123)
    ↓
Queries: Paul's products in Storehouse DB
    ↓
Claude AI: Generate response based on Paul's inventory
    ↓
YOUR server sends response via 360dialog
    ↓
Customer receives answer from +234 801 234 5678
```

---

### Database Schema (Updated)

```sql
-- Map WhatsApp numbers to shop owners
CREATE TABLE whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number TEXT UNIQUE NOT NULL, -- +234 801 234 5678
  whatsapp_number_id TEXT, -- 360dialog internal ID
  display_name TEXT, -- "Paul's Electronics"
  status TEXT DEFAULT 'active', -- active, suspended, pending
  provisioned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- One number per user
);

-- Track usage per shop
CREATE TABLE whatsapp_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  month DATE NOT NULL, -- '2025-11-01'
  chats_used INTEGER DEFAULT 0,
  chats_included INTEGER NOT NULL, -- From their tier
  overage_chats INTEGER DEFAULT 0,
  overage_cost DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Master 360dialog account config (YOUR credentials)
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT DEFAULT '360dialog',
  api_key TEXT NOT NULL, -- YOUR master API key
  webhook_url TEXT,
  available_numbers INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Webhook Handler (Supabase Edge Function)

```typescript
// supabase/functions/whatsapp-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Parse incoming WhatsApp message
  const webhook = await req.json();
  const {
    messages: [{
      from: customerPhone, // Customer's number
      text: { body: customerMessage }
    }],
    contacts: [{
      wa_id: recipientNumber // The number customer messaged (shop's number)
    }]
  } = webhook;

  // 2. Find which shop owns this WhatsApp number
  const { data: shop } = await supabase
    .from('whatsapp_numbers')
    .select('user_id, display_name')
    .eq('whatsapp_number', recipientNumber)
    .single();

  if (!shop) {
    return new Response('Number not found', { status: 404 });
  }

  // 3. Check if shop has quota remaining
  const { data: usage } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('user_id', shop.user_id)
    .single();

  if (usage.chats_used_this_month >= usage.monthly_chat_limit) {
    // Send "quota exceeded" message
    await sendWhatsAppMessage(
      recipientNumber,
      customerPhone,
      "⚠️ This business has reached their monthly chat limit. Please contact them directly."
    );
    return new Response('Quota exceeded', { status: 429 });
  }

  // 4. Search shop's products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', shop.user_id)
    .ilike('name', `%${extractProductName(customerMessage)}%`);

  // 5. Generate AI response
  const aiResponse = await generateAIResponse(
    customerMessage,
    products,
    shop.display_name
  );

  // 6. Send response via WhatsApp
  await sendWhatsAppMessage(recipientNumber, customerPhone, aiResponse);

  // 7. Log chat and increment usage
  await supabase.from('whatsapp_chats').insert({
    user_id: shop.user_id,
    customer_phone: customerPhone,
    customer_message: customerMessage,
    bot_response: aiResponse
  });

  await supabase.rpc('increment_chat_usage', { p_user_id: shop.user_id });

  return new Response('OK', { status: 200 });
});

// Helper: Send WhatsApp message using YOUR 360dialog API
async function sendWhatsAppMessage(from: string, to: string, message: string) {
  const { data: config } = await supabase
    .from('platform_config')
    .select('api_key')
    .single();

  await fetch('https://waba.360dialog.io/v1/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': config.api_key, // YOUR master API key
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: to,
      from: from,
      type: 'text',
      text: { body: message }
    })
  });
}
```

---

## 🚀 Customer Onboarding Flow

### What Customer Sees:

**Step 1: Sign Up for Storehouse**
```
┌─────────────────────────────────────────┐
│ Choose Your Plan                        │
├─────────────────────────────────────────┤
│                                         │
│ ⭐ Starter                 ₦10,000/mo  │
│    • Inventory management               │
│    • 100 AI chats/month                 │
│    • WhatsApp number included           │
│    [Select Plan]                        │
│                                         │
│ 🚀 Pro                    ₦15,000/mo  │
│    • Everything in Starter              │
│    • 300 AI chats/month                 │
│    • Priority support                   │
│    [Select Plan] ← Popular              │
└─────────────────────────────────────────┘
```

**Step 2: Activate WhatsApp AI (One Click)**
```
┌─────────────────────────────────────────┐
│ WhatsApp AI Setup                       │
├─────────────────────────────────────────┤
│                                         │
│ Get your own WhatsApp number for your  │
│ business - managed by Storehouse!      │
│                                         │
│ Business Name:                          │
│ [Paul's Electronics____]                │
│                                         │
│ Preferred Area Code:                    │
│ ( ) Lagos - 0801, 0802, 0803           │
│ ( ) Abuja - 0901, 0902                 │
│                                         │
│ [Activate WhatsApp AI]                 │
└─────────────────────────────────────────┘
```

**Step 3: Number Provisioned Instantly**
```
┌─────────────────────────────────────────┐
│ ✅ WhatsApp AI Activated!               │
├─────────────────────────────────────────┤
│                                         │
│ Your WhatsApp Business Number:          │
│                                         │
│   📱 +234 801 234 5678                  │
│                                         │
│ Share this with your customers!         │
│                                         │
│ Test it now:                            │
│ 1. Save +234 801 234 5678 on WhatsApp  │
│ 2. Send: "How much is iPhone 13?"      │
│ 3. Get instant AI response!            │
│                                         │
│ [Download QR Code] [Share on Social]   │
└─────────────────────────────────────────┘
```

**That's it! No third-party setup!**

---

## 🔧 What YOU Need to Do (Backend Setup)

### Option 1: 360dialog Partner Program (BEST)

**Requirements:**
- Become 360dialog Solution Partner
- Get partner/reseller API access
- Ability to provision multiple numbers

**Process:**
1. Apply at: partners.360dialog.com
2. Explain: "Building WhatsApp-enabled inventory software for Nigerian SMEs"
3. Get partner account (may take 1-2 weeks)
4. Get master API key
5. Use partner API to create numbers for each customer

**Cost:**
- Partner fee: Typically FREE or ₦50,000-100,000 one-time
- Per number: ₦0 (just pay per message)
- Per message: ₦3

---

### Option 2: Twilio Reseller (Easier but more expensive)

**Requirements:**
- Twilio account
- Request multiple WhatsApp numbers

**Process:**
1. Sign up for Twilio
2. For each new customer, buy a WhatsApp number (₦2,000/month per number)
3. Configure webhook to your server
4. Customers never see Twilio

**Cost:**
- Per number: ~₦2,000/month rental
- Per message: ₦24

**Economics (per customer):**
- Revenue: ₦15,000/month
- Number cost: ₦2,000/month
- Message cost: ~₦4,800/month (200 chats)
- **Profit: ₦8,200/month** (still profitable!)

---

### Option 3: Start with Shared Number, Migrate Later

**Phase 1: Single Number (First 10-20 customers)**
- Use ONE WhatsApp number for all customers
- Route messages based on customer's phone
- Add customer's name in response: "Hello from Paul's Electronics!"

**Phase 2: Individual Numbers (After validation)**
- Get 360dialog partner status
- Provision individual numbers
- Migrate customers gradually

---

## 💡 Recommended Approach

### Month 1-2: Validate with Shared Number

**Use:** One Twilio number (₦24/chat)
**Test with:** 5-10 beta customers
**Learn:** Do they actually use it? How many chats?

**Example:**
```
Customer messages: +1 415 523 8886 (your Twilio number)
Message: "How much is iPhone 13?"

You ask back: "Hi! Which shop are you asking about?"
OR
You recognize phone number from previous chat
```

**Pricing:**
- ₦10,000/month (simple, test market)

---

### Month 3-6: Scale with Individual Numbers

**Apply for:** 360dialog Partner Program
**Get approved:** 2-4 weeks
**Launch:** Proper multi-tenant system

**Each customer gets:**
- Own WhatsApp number: +234 801 XXX XXXX
- One-click activation
- No third-party setup

**Pricing:**
- ₦15,000/month (all-inclusive)

---

## ✅ Summary: White-Label Model

**What customer experiences:**
1. Signs up for Storehouse (₦15,000/month)
2. Clicks "Activate WhatsApp AI"
3. Gets WhatsApp number instantly: +234 801 XXX XXXX
4. Shares number with customers
5. AI works 24/7
6. **Never deals with 360dialog or any third party**

**What YOU do:**
1. Become 360dialog partner (one-time setup)
2. Build provisioning system (auto-create numbers)
3. Handle all API calls in background
4. Charge ₦15,000/month (all-inclusive)
5. Pay ₦3/chat to 360dialog
6. Profit: ₦10,000/month per customer

**With 100 customers:**
- Revenue: ₦1,500,000/month
- Costs: ₦500,000/month (WhatsApp + AI)
- **Profit: ₦1,000,000/month**

---

## 🚀 Your Next Steps

**This week:**
1. Apply for 360dialog Partner Program
   - Go to: partners.360dialog.com
   - Explain your use case
   - Wait for approval (1-2 weeks)

**While waiting:**
2. Build the provisioning UI (where customers activate)
3. Build webhook handler (route messages to right shop)
4. Test with Twilio sandbox

**After partner approval:**
5. Get master API key
6. Provision numbers via API
7. Launch to customers

---

**This is the white-label model - customers pay YOU only, never deal with third parties!** 🚀

Want me to help you apply for 360dialog Partner Program? I can draft the application!
