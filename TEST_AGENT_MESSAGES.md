# QUICK TEST GUIDE: Agent Message Visibility

## 🎯 Test URL
**Production**: https://smartstock-v2-3p3grphn1-pauls-projects-cfe953d7.vercel.app

---

## ✅ TEST STEPS

### Step 1: Open Customer Chat
1. Go to your store URL (e.g., `/store/paulglobal`)
2. Look for the chat widget (bottom-right corner)
3. Click to open the chat

### Step 2: Send Customer Message
1. Type: "Hello, I need help"
2. Press Send
3. Wait for AI response

### Step 3: Agent Takeover (in Dashboard)
1. Open new tab: `/dashboard/conversations`
2. Find the conversation you just started
3. Click on it to select
4. Click **"Take Over Chat"** button (green)

### Step 4: Send Agent Message
1. Type a test message: "Hi, I'm a human agent. How can I help?"
2. Click Send
3. Note the time you sent it

### Step 5: Check Customer View
1. Go back to the customer chat tab
2. **CRITICAL CHECK**: You should see:
   - ✅ Your customer message
   - ✅ AI response
   - ✅ System message: "A human agent has joined the chat"
   - ✅ **Agent message: "Hi, I'm a human agent. How can I help?"**

---

## 🔍 WHAT TO LOOK FOR

### ✅ SUCCESS Indicators:
- Agent messages appear in customer chat within 2-3 seconds
- Messages have green background (agent color)
- Shows "👤 Agent" label
- No console errors about channels

### ❌ FAILURE Indicators:
- Agent messages only visible in dashboard
- Customer chat shows no new messages after takeover
- Console shows "CHANNEL_ERROR" messages
- Messages have wrong color/formatting

---

## 🛠️ IF TEST FAILS

### Quick Fix #1: Clear Cache
```bash
# In browser console
localStorage.clear();
location.reload();
```

### Quick Fix #2: Check RLS Policy
```sql
-- Run this in Supabase SQL editor
SELECT * FROM pg_policies
WHERE tablename = 'ai_chat_messages'
AND policyname LIKE '%view%';
-- Should show a permissive SELECT policy
```

### Quick Fix #3: Test RPC Function
```javascript
// In browser console (while on the app)
const { data, error } = await supabase.rpc('send_agent_message', {
  p_conversation_id: 'YOUR-CONVERSATION-ID',
  p_message: 'Test from console',
  p_agent_id: 'YOUR-USER-ID'
});
console.log('Result:', data, error);
```

---

## 📊 MONITORING CHECKLIST

- [ ] No "2 realtime channels failed" error
- [ ] Messages appear within 2 seconds
- [ ] Agent label shows correctly
- [ ] System messages appear
- [ ] End takeover works
- [ ] Messages persist after refresh

---

## 🎉 EXPECTED RESULT

After following all steps, the customer chat should show:

```
👤 Customer [09:30:06]
Hello, I need help

🤖 AI [09:30:08]
Hi! Welcome to our store. How can I assist you today?

⚡ System [09:31:00]
A human agent has joined the chat

👤 Agent [09:31:05]
Hi, I'm a human agent. How can I help?
```

**ALL messages should be visible to the customer!**

---

Last tested: March 26, 2026
Deployment: https://smartstock-v2-3p3grphn1-pauls-projects-cfe953d7.vercel.app