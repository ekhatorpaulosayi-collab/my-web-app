# 🚀 Guardrails Implementation Guide

## ✅ What's Been Done

1. ✅ Created `store-context.ts` - RAG retrieval with full guardrails
2. ✅ Added imports to `index.ts` (lines 4-17)
3. ✅ Created new `handleStorefrontChat` function in `handleStorefrontChat-NEW.ts`

---

## 📝 What YOU Need to Do

### **Step 1: Replace the Old handleStorefrontChat Function**

**Location:** `/home/ekhator1/smartstock-v2/supabase/functions/ai-chat/index.ts`

**Lines to replace:** 2124-2658 (the entire old `handleStorefrontChat` function)

**Replace with:** The contents of `handleStorefrontChat-NEW.ts`

**How to do it:**

```bash
cd /home/ekhator1/smartstock-v2/supabase/functions/ai-chat

# Option 1: Manual replacement
# 1. Open index.ts in your editor
# 2. Find line 2124 (starts with: async function handleStorefrontChat)
# 3. Delete everything until line 2658 (just before: async function updateUserPreferences)
# 4. Copy the entire contents of handleStorefrontChat-NEW.ts
# 5. Paste it in place of the deleted code
# 6. Save the file

# Option 2: Let Claude do it
# Just say "replace it for me" and I'll use the Edit tool
```

---

## 🛡️ **What the Guardrails Do**

### **1. SPAM Detection**
- Blocks: Too short messages, excessive repetition, all caps, URL spam, phone spam
- Response: "🚫 Message blocked. Please send a valid shopping question."

### **2. OFF-TOPIC Detection** (10 Categories)
- Blocks: Sports, politics, entertainment, general knowledge, medical, legal, personal, homework, coding, weather (non-delivery), competitors
- Example: "What did Arsenal play?" → "I'm ${store}'s shopping assistant! I can only help with products..."
- **3-strikes rule**: Block user after 3 off-topic attempts

### **3. RATE LIMITING**
- **15 messages max per session** → Then escalates to WhatsApp
- **5 messages max per minute** → Prevents rapid spam
- Response after limit: "📱 You've reached the chat limit! WhatsApp us: ${number}"

### **4. MULTI-LANGUAGE Support**
- Auto-detects: English, Pidgin, Yoruba, Igbo, Hausa
- Responds in customer's language
- Example: "Abeg, how much you dey sell phone?" → Bot responds in Pidgin

### **5. SMART 3-TIER Response System**
- **Tier 1 (FAQ)**: Instant, free responses for common questions
- **Tier 2 (Product Search)**: Database search with price filtering
- **Tier 3 (AI)**: GPT-4o with full store context, only for complex queries

---

## 🧪 **Testing the Guardrails**

After deployment, test these scenarios:

### **Test 1: Off-Topic (Sports)**
```
Customer: "What did Arsenal play yesterday?"
Expected: "I'm [Store]'s shopping assistant! I can only help with products... ⚽ For sports updates, try Google!"
```

### **Test 2: Spam**
```
Customer: "aaaaaaaaaaaaa"
Expected: "🚫 Message blocked. Please send a valid shopping question."
```

### **Test 3: Rate Limit**
```
Customer: Sends 16 messages in one session
Expected (on 16th): "📱 You've reached the chat limit! WhatsApp us: +234-XXX"
```

### **Test 4: Multi-Language (Pidgin)**
```
Customer: "Abeg, how much you dey sell phone?"
Expected: Bot responds in Pidgin with product prices
```

### **Test 5: Product Search with Price Filter**
```
Customer: "Show me phones under 50k"
Expected: List of phones priced under ₦50,000
```

### **Test 6: 3-Strikes Off-Topic Block**
```
Customer:
1. "What's the weather?" (Strike 1 - warning)
2. "Who is the president?" (Strike 2 - warning)
3. "Tell me a joke" (Strike 3 - BLOCKED)
Expected (3rd): "🚫 Too many off-topic messages. For assistance, WhatsApp: ${number}"
```

---

## 🚀 **Deployment Steps**

```bash
cd /home/ekhator1/smartstock-v2

# 1. Verify the changes
cat supabase/functions/ai-chat/index.ts | grep -A5 "handleStorefrontChat"

# 2. Deploy to production
supabase functions deploy ai-chat

# 3. Test with a real store
curl -X POST https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What did Arsenal play?",
    "contextType": "storefront",
    "storeSlug": "your-test-store"
  }'

# Expected response:
# {
#   "response": "I'm [Store]'s shopping assistant! ... ⚽ For sports updates, try Google!",
#   "blocked": false,
#   "reason": "off_topic",
#   "offTopicCategory": "sports"
# }
```

---

## 📊 **Monitoring After Deployment**

Track these metrics:

1. **Off-Topic Block Rate** (target: < 5%)
2. **Rate Limit Hit Rate** (target: < 2%)
3. **FAQ Match Rate** (target: > 60%)
4. **AI Fallback Rate** (target: < 30%)
5. **Blocked Users** (3-strikes)

**Check logs:**
```bash
supabase functions logs ai-chat --tail
```

Look for:
- `[Guardrail] Spam detected`
- `[Guardrail] Rate limit exceeded`
- `[Guardrail] Off-topic: sports`
- `[Guardrail] User blocked`

---

## 💰 **Cost Savings Expected**

**Before Guardrails:**
- Every message → AI call → $0.001-0.003 per message
- 10,000 messages/month = $10-30/month

**After Guardrails:**
- 60% FAQ (free) → $0
- 20% Product Search (database) → $0
- 15% AI → $0.001-0.003
- 5% Blocked (spam/off-topic) → $0

**New cost: ~$1.50-4.50/month** (85% savings!)

---

## 🎯 **Next Steps**

1. ✅ Replace handleStorefrontChat in index.ts
2. ✅ Deploy: `supabase functions deploy ai-chat`
3. ✅ Test all 6 guardrail scenarios above
4. ✅ Monitor logs for 24 hours
5. ✅ Collect merchant feedback
6. ✅ Adjust limits if needed (in store-context.ts)

---

## 🔧 **Customization Options**

Want to adjust limits? Edit `store-context.ts`:

```typescript
// Line 267: Conversation limits
checkRateLimit(sessionId, 15, 5)
//                         ↑   ↑
//                         |   Max 5 messages per minute
//                         Max 15 messages per session

// Line 309: Off-topic strikes
if (state.offTopicCount >= 3)
//                          ↑
//                          Block after 3 strikes
```

---

## ✅ **Ready to Deploy?**

Just say:
- **"replace it for me"** - I'll update index.ts automatically
- **"show me the diff"** - I'll show you what's changing
- **"I'll do it manually"** - Follow Option 1 above

Then deploy with: `supabase functions deploy ai-chat`

---

**Questions?** Just ask! 🚀
