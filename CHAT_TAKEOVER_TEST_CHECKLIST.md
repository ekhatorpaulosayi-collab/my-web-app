# Chat Takeover & WhatsApp Fallback - Test Checklist

## 🚀 Quick Setup (Since Localhost is Broken)

### Option 1: Deploy to Vercel
```bash
npm run build
vercel --prod
# OR for preview
vercel
```

### Option 2: Alternative Port
```bash
# Clear ports
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Try different port
npm run dev -- --port 8080
```

### Option 3: Run Test Setup
```bash
node test-chat-takeover.js
```

---

## ✅ Test Checklist

### 1️⃣ Duplicate Message Fix Test

#### Setup:
- [ ] Open dashboard in Browser 1
- [ ] Open storefront in Browser 2 (incognito)
- [ ] Have Supabase dashboard open to monitor

#### Test Steps:
- [ ] Customer types: "I need to speak to a human"
- [ ] Dashboard shows conversation with "Take Over" button
- [ ] Click "Take Over" button
- [ ] **VERIFY:** Only ONE "👨‍💼 A human agent has joined..." message appears
- [ ] **VERIFY:** Message appears in both customer and dashboard views
- [ ] **VERIFY:** No duplicate messages in database

#### Expected Result:
```
✅ PASS: Single agent joined message
❌ FAIL: Multiple duplicate messages
```

---

### 2️⃣ Chat Takeover Flow Test

#### Pre-Test Setup:
- [ ] Clear browser cache
- [ ] Open browser developer console
- [ ] Open network tab to monitor API calls

#### Test Matrix:

| Step | Action | Expected Customer View | Expected Status | Check |
|------|--------|----------------------|-----------------|-------|
| 1 | Start chat | AI responds | `ai` | [ ] |
| 2 | Request human | "Waiting for owner" + Timer | `requested` | [ ] |
| 3 | Agent takes over | "Agent joined" message | `agent` | [ ] |
| 4 | Agent sends msg | Receives agent message | `agent` | [ ] |
| 5 | End takeover | "Agent ended" message | `ended` | [ ] |

#### Database Verification:
```sql
-- Run after each step
SELECT
  id,
  takeover_status,
  agent_id,
  is_agent_active,
  requested_at
FROM ai_chat_conversations
WHERE id = '[CONVERSATION_ID]';
```

---

### 3️⃣ WhatsApp Fallback Timer Test

#### A. WITH WhatsApp Number

##### Setup:
- [ ] Store has WhatsApp number configured
- [ ] Timer set to 1 minute (for testing)
```sql
UPDATE stores
SET whatsapp_number = '+2348012345678',
    wa_fallback_minutes = 1
WHERE id = '[STORE_ID]';
```

##### Test Steps:
- [ ] Customer requests human help
- [ ] Timer appears: "Waiting for store owner... 0:59"
- [ ] Timer counts down properly
- [ ] After 1 minute, modal appears with:
  - [ ] "Keep Waiting (1 more minute)" button
  - [ ] "Chat on WhatsApp" button
- [ ] Click "Chat on WhatsApp"
- [ ] WhatsApp opens with pre-filled message
- [ ] Database shows `takeover_status = 'moved_to_whatsapp'`

#### B. WITHOUT WhatsApp Number

##### Setup:
- [ ] Remove WhatsApp number
```sql
UPDATE stores
SET whatsapp_number = NULL
WHERE id = '[STORE_ID]';
```

##### Test Steps:
- [ ] Customer requests human help
- [ ] Timer appears normally
- [ ] After timer expires, modal shows:
  - [ ] "Keep Waiting" button ONLY
  - [ ] NO WhatsApp button
  - [ ] Message: "Store owner will be notified"
- [ ] Can successfully keep waiting

#### C. Agent Takes Over Before Timer

##### Test Steps:
- [ ] Customer requests human help
- [ ] Timer starts counting
- [ ] Within 30 seconds, agent clicks "Take Over"
- [ ] Timer IMMEDIATELY disappears
- [ ] "Agent joined" message appears
- [ ] NO fallback modal appears

---

## 🔍 Browser Console Tests

### Test 1: Check Components Loaded
```javascript
// Run in customer chat widget console
console.log('Components Check:');
console.log('- WhatsAppFallbackTimer:', typeof WhatsAppFallbackTimer);
console.log('- AIChatWidget:', typeof AIChatWidget);
console.log('- Timer visible:', !!document.querySelector('[data-timer]'));
```

### Test 2: Monitor Status Changes
```javascript
// Run this to monitor real-time status
let lastStatus = null;
setInterval(() => {
  const status = document.querySelector('[data-status]')?.textContent;
  if (status !== lastStatus) {
    console.log(`Status changed: ${lastStatus} → ${status}`);
    lastStatus = status;
  }
}, 500);
```

### Test 3: Check for Duplicates
```javascript
// Run after takeover
const messages = Array.from(document.querySelectorAll('.message-content'));
const agentJoined = messages.filter(m =>
  m.textContent.includes('human agent has joined')
);
console.log(`Found ${agentJoined.length} "agent joined" messages`);
console.log(agentJoined.length === 1 ? '✅ PASS' : '❌ FAIL: Duplicates found');
```

---

## 📊 Success Criteria

### Critical (Must Pass):
- [ ] ✅ No duplicate "agent joined" messages
- [ ] ✅ Timer starts on "requested" status
- [ ] ✅ Timer stops when agent takes over
- [ ] ✅ WhatsApp button only shows if number exists

### Important (Should Pass):
- [ ] ✅ Pre-filled WhatsApp message is correct
- [ ] ✅ Status updates properly in database
- [ ] ✅ Messages sync between dashboard and customer
- [ ] ✅ "Keep Waiting" resets timer properly

### Nice to Have:
- [ ] ✅ Smooth timer countdown animation
- [ ] ✅ Modal is mobile-responsive
- [ ] ✅ WhatsApp opens in new tab
- [ ] ✅ Clear visual feedback for all actions

---

## 🐛 Common Issues & Solutions

### Issue 1: Timer Not Appearing
```javascript
// Check if takeover_status is set correctly
SELECT takeover_status FROM ai_chat_conversations WHERE id = '[ID]';
// Should be 'requested' for timer to show
```

### Issue 2: Duplicate Messages Still Appearing
```javascript
// Check which component is creating duplicates
// Search for 'human agent has joined' in:
// - ConversationsPageFixed.tsx (line 420) - KEEP THIS ONE
// - AIChatWidget.tsx (line 770) - SHOULD BE COMMENTED
// - ChatTakeoverPanel.tsx (line 110) - SHOULD BE COMMENTED
```

### Issue 3: WhatsApp Link Not Working
```javascript
// Test the link format
const phone = '+2348012345678';
const message = 'Test message';
const link = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
console.log('WhatsApp link:', link);
window.open(link); // Should open WhatsApp
```

### Issue 4: Timer Not Stopping on Takeover
```javascript
// Ensure status changes properly
// In dashboard, after clicking "Take Over", check:
SELECT takeover_status FROM ai_chat_conversations WHERE id = '[ID]';
// Should change from 'requested' to 'agent'
```

---

## 📝 Test Report Template

```
Date: ___________
Tester: ___________
Environment: [ ] Production [ ] Staging [ ] Local

RESULTS:
1. Duplicate Message Fix: [ ] PASS [ ] FAIL
2. Takeover Flow: [ ] PASS [ ] FAIL
3. WhatsApp Timer: [ ] PASS [ ] FAIL
4. No-WhatsApp Handling: [ ] PASS [ ] FAIL

Issues Found:
1. _________________________________
2. _________________________________
3. _________________________________

Notes:
_____________________________________
_____________________________________
```

---

## 🎯 Quick SQL Queries for Testing

```sql
-- Check all conversations with takeover status
SELECT id, takeover_status, agent_id, created_at
FROM ai_chat_conversations
WHERE takeover_status != 'ai'
ORDER BY created_at DESC;

-- Check for duplicate messages
SELECT conversation_id, content, COUNT(*)
FROM ai_chat_messages
WHERE content LIKE '%human agent has joined%'
GROUP BY conversation_id, content
HAVING COUNT(*) > 1;

-- Check store WhatsApp settings
SELECT id, name, whatsapp_number, wa_fallback_minutes
FROM stores
WHERE id = '[STORE_ID]';

-- Monitor real-time changes
SELECT * FROM ai_chat_conversations
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```