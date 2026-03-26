# 🧪 WhatsApp Fallback Timer - Testing & Verification Guide

## 📋 Quick Verification Checklist

### 1️⃣ **Database Verification**
Run this SQL in Supabase SQL Editor to check if the columns exist:
```sql
-- Check if wa_fallback_minutes column exists
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'stores'
  AND column_name = 'wa_fallback_minutes';

-- Check if moved_to_whatsapp_at column exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_chat_conversations'
  AND column_name = 'moved_to_whatsapp_at';

-- Check a sample store's WhatsApp settings
SELECT
  id,
  name,
  whatsapp_number,
  wa_fallback_minutes
FROM stores
LIMIT 5;
```

### 2️⃣ **Frontend Component Verification**
Check browser console for these debug messages:

**In Store Settings Page:**
- ✅ `[WhatsAppFallbackSettings] Timer value changed: X`
- ✅ `[BusinessSettings] Saving wa_fallback_minutes: X`

**In Chat Widget (Storefront):**
- ✅ `[AIChatWidget] Fetching store data for: [store-slug]`
- ✅ `[AIChatWidget] Store data loaded: {hasWhatsApp: true/false, fallbackMinutes: X}`
- ✅ `[AIChatWidget] Takeover status from response: requested`
- ✅ `[WhatsAppFallbackTimer] Timer started: X seconds`

### 3️⃣ **Manual Testing Steps**

#### Test 1: Store Settings Configuration
1. Go to **Business Settings** page
2. Look for **⏱️ WhatsApp Fallback Timer** section
3. Adjust the slider or click preset buttons
4. Click **Save Changes**
5. Refresh page and verify setting persisted

#### Test 2: Timer Activation (Storefront)
1. Go to a store's public page
2. Open chat widget
3. Type: "I need to speak to a human" or "talk to owner"
4. Verify you see: **"Waiting for store owner... X:XX"** yellow timer
5. Wait for timer to expire
6. Verify modal appears with options

#### Test 3: WhatsApp Redirect
1. Let timer expire on a store WITH WhatsApp number
2. Click **"Chat on WhatsApp"** button
3. Verify WhatsApp opens with pre-filled message:
   ```
   Hi, I was chatting on your Storehouse page and was asking about '[your question]'. Can you help?
   ```

#### Test 4: Store Without WhatsApp
1. Test on a store WITHOUT WhatsApp number configured
2. Let timer expire
3. Verify only **"Keep Waiting"** button appears
4. Verify info message: "💡 The store owner will be notified about your request"

#### Test 5: Owner Takeover (Timer Cancel)
1. Start timer by requesting human help
2. Have store owner take over chat before timer expires
3. Verify timer disappears immediately
4. Verify chat continues normally

### 4️⃣ **Visual Indicators**

#### ✅ Working Correctly If You See:

**In Settings:**
![Settings Working]
- Slider with value display
- Preset buttons (1, 3, 5, 10, 15 min)
- Description text updates based on selection

**In Chat (Timer Active):**
```
┌─────────────────────────────────┐
│ 🕐 Waiting for store owner... 4:32 │
└─────────────────────────────────┘
```

**When Timer Expires:**
```
┌──────────────────────────────────────┐
│        ⏰ Store owner hasn't         │
│           responded yet              │
│                                      │
│  Would you like to continue waiting │
│      or chat on WhatsApp?           │
│                                      │
│ [🔄 Keep Waiting (5 more minutes)]  │
│ [💬 Chat on WhatsApp]               │
└──────────────────────────────────────┘
```

**In Conversations Dashboard:**
- Green "WhatsApp" badge on transferred chats

### 5️⃣ **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| Timer not appearing | 1. Check if store has `wa_fallback_minutes` set<br>2. Verify `takeover_status = 'requested'`<br>3. Check console for errors |
| WhatsApp button missing | Store doesn't have `whatsapp_number` configured |
| Timer not counting | Check browser console for JavaScript errors |
| Settings not saving | Check network tab for API errors, verify database permissions |

### 6️⃣ **Debug Mode Test**

Add this to any page to force-show the timer for testing:

```javascript
// Run in browser console to test timer
localStorage.setItem('DEBUG_WHATSAPP_TIMER', 'true');
location.reload();
```

### 7️⃣ **API Verification**

Check these endpoints are responding:

```bash
# Check store data is loading
curl -X GET "https://[your-supabase-url]/rest/v1/stores?slug=eq.[store-slug]&select=whatsapp_number,wa_fallback_minutes" \
  -H "apikey: [your-anon-key]"

# Check conversation status updates
curl -X GET "https://[your-supabase-url]/rest/v1/ai_chat_conversations?id=eq.[conversation-id]&select=takeover_status,moved_to_whatsapp_at" \
  -H "apikey: [your-anon-key]"
```

## 🎯 Success Criteria

The implementation is working if:
- ✅ Timer appears when requesting human help
- ✅ Timer counts down from configured minutes
- ✅ Modal appears when timer expires
- ✅ WhatsApp button opens wa.me link with context
- ✅ Timer cancels when owner takes over
- ✅ Dashboard shows WhatsApp indicator
- ✅ Settings persist after save

## 📊 Test Report Template

```markdown
## WhatsApp Fallback Timer - Test Report
Date: [DATE]
Tester: [NAME]
Environment: [local/staging/production]

### Database Check
- [ ] wa_fallback_minutes column exists
- [ ] moved_to_whatsapp_at column exists
- [ ] Sample stores have settings

### Component Tests
- [ ] Settings page shows timer config
- [ ] Timer saves successfully
- [ ] Chat widget loads store data
- [ ] Timer starts on request
- [ ] Timer expires correctly
- [ ] WhatsApp redirect works
- [ ] Dashboard indicator shows

### Issues Found
[List any issues]

### Status: [PASS/FAIL]
```

## 🔍 Live Monitoring

To monitor the feature in production:

1. **Check Supabase Logs:**
```sql
-- See recent WhatsApp transfers
SELECT
  id,
  store_id,
  takeover_status,
  moved_to_whatsapp_at,
  created_at
FROM ai_chat_conversations
WHERE moved_to_whatsapp_at IS NOT NULL
ORDER BY moved_to_whatsapp_at DESC
LIMIT 10;

-- Count transfers per store
SELECT
  s.name as store_name,
  COUNT(c.id) as whatsapp_transfers
FROM ai_chat_conversations c
JOIN stores s ON c.store_id = s.id
WHERE c.moved_to_whatsapp_at IS NOT NULL
GROUP BY s.name
ORDER BY whatsapp_transfers DESC;
```

2. **Check Browser Console:**
All debug messages are prefixed with component names for easy filtering.

3. **Network Tab:**
Filter by "supabase" to see all API calls related to the feature.

---

💡 **Tip:** Save this file and use it as a checklist every time you deploy to ensure the feature is working correctly!