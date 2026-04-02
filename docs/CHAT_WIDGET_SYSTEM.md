# CHAT WIDGET SYSTEM - COMPLETE OPERATIONS MANUAL
**CRITICAL SINGLE SOURCE OF TRUTH**

## EMERGENCY PROCEDURES

### CRITICAL: If Chat Is Broken in Production

1. **IMMEDIATE ACTION - Kill Switch**
```sql
-- Run this in Supabase SQL Editor to disable chat globally
UPDATE stores SET chat_widget_enabled = false;
```

2. **Rollback Last Deployment**
```bash
vercel rollback smartstock-v2.vercel.app
```

3. **Check Last Changes**
```bash
git diff HEAD~1 src/components/AIChatWidget.tsx
git diff HEAD~1 supabase/functions/ai-chat/index.ts
```

## SYSTEM ARCHITECTURE

### Core Philosophy
- **NO WEBSOCKETS**: Using polling due to Supabase free tier limits
- **OPTIMISTIC UI**: Customer messages show immediately with `isLocal: true`
- **DEDUPLICATION**: UUID and content matching prevents duplicates
- **SINGLE INSERTION POINT**: ONLY edge function inserts messages

### Message Flow Diagram
```
Customer Types Message
    ↓
1. Optimistic Add (isLocal: true)
    ↓
2. Send to Edge Function
    ↓
3. Edge Function Saves to DB
    ↓
4. Polling Replaces Optimistic with DB Version

WhatsApp Fallback Flow:
Customer Requests Owner → Timer Starts (5 min default)
    ↓
Timer Uses Server Timestamp (survives refresh)
    ↓
Timer Expires → Poll-Before-Modal Check
    ↓
If Owner Took Over → Hide Modal
If Not → Show WhatsApp/Keep Waiting Options
    ↓
During Modal → Auto-dismiss if owner joins
```

## THE THREE SACRED setMessages CALLS

**NEVER ADD MORE THAN THESE THREE**:

1. **Line 736**: Polling merge (adds new messages from server)
2. **Line 920**: Optimistic customer message (immediate UI feedback)
3. **Line 1617**: Clear conversation button

### Why Only Three?
- More setMessages = race conditions = duplicates
- Each additional call exponentially increases duplicate risk
- Polling + optimistic + clear covers ALL use cases

## CRITICAL FILES

### 1. AIChatWidget.tsx (/src/components/AIChatWidget.tsx)
**Purpose**: Customer-facing chat widget
**Key Functions**:
- `pollForMessages` (line 699-736): Fetches new messages every 3 seconds
- `handleSubmit` (line 897-1087): Sends customer messages
- `mergeMessages` (line 732): Deduplicates using UUID/content
- `requestHumanAgent` (line 849-902): Request store owner takeover

**CRITICAL RULES**:
- NEVER load full message history on conversationId change
- ALWAYS use timestamp cursor for polling: `.gt('created_at', lastMessageTimestamp)`
- NEVER set messages from edge function response
- ALWAYS update `waiting_for_owner_since` when owner is requested

### 2. Edge Function (supabase/functions/ai-chat/index.ts)
**Purpose**: Handles AI responses and message saving
**Key Sections**:
- Line 2435: Saves customer message to database
- Lines 2716-2721: Saves AI response to database
- Lines 2536-2556: Agent takeover detection

**CRITICAL RULES**:
- This is the ONLY place that inserts messages
- NEVER return message content during agent takeover
- ALWAYS save messages with proper conversation_id

### 3. WhatsAppFallbackTimer (src/components/chat/WhatsAppFallbackTimer.tsx)
**Purpose**: Handle WhatsApp fallback when owner doesn't respond
**Key Functions**:
- `fetchTimerState`: Gets `waiting_for_owner_since` from database
- `checkStatusBeforeModal`: Poll-before-modal pattern
- `resetTimer`: Updates `waiting_for_owner_since` to restart timer
- Auto-dismiss polling: Detects owner takeover during modal

**CRITICAL RULES**:
- ALWAYS use server timestamp for countdown calculation
- ALWAYS do fresh status check before showing modal
- ALWAYS poll for owner takeover while modal is showing
- Handle no-WhatsApp case gracefully (only show "Keep waiting")

### 4. ChatTracking Service (src/services/chatTrackingService.ts)
**Purpose**: Tracks conversation metadata ONLY
**What it does**:
- Creates/updates conversation records
- Updates visitor information
- Sets store_id and session_id

**What it MUST NOT do**:
- ❌ NEVER insert messages (edge function does this)
- ❌ NEVER modify message content
- ❌ NEVER duplicate edge function work

## COMMON BUGS AND FIXES

### Bug 1: Messages Appearing Twice
**Symptom**: AI responses show up duplicated
**Diagnosis**:
```sql
SELECT id, content, created_at FROM ai_chat_messages
WHERE conversation_id = 'xxx'
ORDER BY created_at DESC LIMIT 10;
```
**Root Causes**:
1. Multiple setMessages calls
2. Edge function AND ChatTracking both inserting
3. Missing timestamp cursor in polling

**Fix**:
1. Ensure only 3 setMessages calls exist
2. Remove message insertion from ChatTracking
3. Always use `.gt('created_at', lastMessageTimestamp)`

### Bug 2: First Message Gets Duplicated
**Symptom**: First customer message appears twice
**Root Cause**: Timestamp set before edge function call
**Fix**: Update timestamp AFTER edge function returns (lines 1078-1087)

### Bug 3: Agent Takeover Message Spam
**Symptom**: "Human agent is handling" repeats endlessly
**Root Cause**: Edge function returning message content during takeover
**Fix**: Return only `{ agentActive: true }` flag

### Bug 4: Messages Not Showing
**Symptom**: Messages saved but not visible
**Root Cause**: Polling without valid timestamp
**Fix**: Add guard at lines 699-704:
```typescript
if (!lastMessageTimestamp) {
  console.log('[AIChatWidget] No timestamp available for polling, skipping');
  return;
}
```

## DIAGNOSTIC PROCEDURES

### 1. Check Message Duplication
```sql
-- Find duplicate messages in last hour
SELECT content, COUNT(*) as count, array_agg(id) as ids
FROM ai_chat_messages
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY content, conversation_id
HAVING COUNT(*) > 1;
```

### 2. Verify Single Insertion Point
```bash
# Should only find edge function
grep -r "insert.*ai_chat_messages" supabase/functions/
grep -r "insert.*ai_chat_messages" src/
```

### 3. Count setMessages Calls
```bash
# Should return exactly 3
grep -c "setMessages" src/components/AIChatWidget.tsx
```

### 4. Check Polling Health
```javascript
// Run in browser console on store page
(() => {
  const originalFetch = window.fetch;
  let pollCount = 0;
  window.fetch = function(...args) {
    if (args[0].includes('ai_chat_messages')) {
      console.log(`[POLL ${++pollCount}]`, new Date().toISOString());
    }
    return originalFetch.apply(this, args);
  };
})();
```

## DEPLOYMENT CHECKLIST

### Before Deploying
1. [ ] Run integrity check: `bash scripts/check-chat-integrity.sh`
2. [ ] Verify only 3 setMessages calls
3. [ ] Check no message insertion in ChatTracking
4. [ ] Test locally with multiple messages

### Deployment Commands
```bash
# Standard deployment
npm run build && vercel --prod --force --yes

# With monitoring
npm run build && vercel --prod --force --yes | tee deploy.log
```

### After Deployment
1. [ ] Test first message (no duplication)
2. [ ] Test second message (no duplication)
3. [ ] Test agent takeover (if applicable)
4. [ ] Monitor for 15 minutes

## ROLLBACK PROCEDURES

### Immediate Rollback
```bash
# List recent deployments
vercel ls smartstock-v2.vercel.app

# Rollback to previous
vercel rollback smartstock-v2.vercel.app
```

### Git Rollback
```bash
# Find last working commit
git log --oneline src/components/AIChatWidget.tsx

# Revert to specific commit
git checkout <commit-hash> -- src/components/AIChatWidget.tsx
npm run build && vercel --prod --force --yes
```

## MONITORING QUERIES

### Real-time Message Health
```sql
-- Messages in last 5 minutes
SELECT
  conversation_id,
  COUNT(*) as message_count,
  COUNT(DISTINCT content) as unique_messages
FROM ai_chat_messages
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY conversation_id
HAVING COUNT(*) != COUNT(DISTINCT content);
```

### Conversation Status
```sql
-- Active conversations with message counts
SELECT
  c.id,
  c.session_id,
  c.is_agent_active,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message
FROM ai_chat_conversations c
LEFT JOIN ai_chat_messages m ON m.conversation_id = c.id
WHERE c.created_at > NOW() - INTERVAL '1 hour'
GROUP BY c.id
ORDER BY last_message DESC;
```

## PERFORMANCE OPTIMIZATIONS

### Polling Optimization
- Start at 3-second intervals
- Slow to 5 seconds after 30 seconds of inactivity
- Stop polling when conversation ends

### Message Deduplication
- Use UUID as primary key
- Content matching as secondary check
- Never trust client-side message arrays

### Database Indexes
```sql
-- Ensure these indexes exist
CREATE INDEX idx_messages_conversation_created
ON ai_chat_messages(conversation_id, created_at DESC);

CREATE INDEX idx_conversations_session
ON ai_chat_conversations(session_id);
```

## TESTING SCENARIOS

### Scenario 1: Basic Chat Flow
1. Open store page in incognito
2. Send "Hello"
3. Verify AI response appears once
4. Send "Tell me about your products"
5. Verify response appears once

### Scenario 2: Rapid Messages
1. Send 5 messages quickly
2. Each should appear once
3. No messages should duplicate
4. Polling should catch up

### Scenario 3: Network Issues
1. Send message
2. Disconnect network
3. Reconnect
4. Message should not duplicate

### Scenario 4: WhatsApp Fallback Timer
1. Click "Request Store Owner"
2. Timer starts counting down from 5 minutes
3. Refresh page - timer should resume from correct time
4. Let timer expire
5. Modal appears (or doesn't if owner took over)
6. "Keep waiting" resets timer
7. "Chat on WhatsApp" opens WhatsApp link

### Scenario 5: Owner Takeover During Timer
1. Customer requests owner
2. Timer starts
3. Owner takes over before timer expires
4. Timer should disappear
5. AI should stop responding

### Scenario 6: No WhatsApp Number Edge Case
1. Store has no whatsapp_number set
2. Customer requests owner
3. Timer runs
4. When expired, only "Keep waiting" button shows
5. No WhatsApp option available

## ENVIRONMENT VARIABLES

### Required for Chat
```env
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
OPENAI_API_KEY=<your-openai-key>
```

### Edge Function Secrets
```bash
supabase secrets set OPENAI_API_KEY=<your-key>
```

## KILL SWITCH IMPLEMENTATION

### Add Column (if not exists)
```sql
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS chat_widget_enabled BOOLEAN DEFAULT true;
```

### Check in Widget
```typescript
// Add to AIChatWidget.tsx
const { data: store } = await supabase
  .from('stores')
  .select('chat_widget_enabled')
  .eq('store_slug', storeSlug)
  .single();

if (!store?.chat_widget_enabled) {
  return <div>Chat temporarily unavailable</div>;
}
```

## HISTORICAL CONTEXT

### March 28, 2026 - The Great Deduplication
- **Problem**: Messages appearing 2-3 times
- **Discovery**: Both edge function AND ChatTracking inserting
- **Solution**: Removed insertion from ChatTracking
- **Result**: 100% fix rate

### Previous Fixes
- Removed 12 unnecessary setMessages calls
- Added timestamp cursor to polling
- Fixed agent takeover message spam
- Corrected first message timestamp logic

## COMMAND REFERENCE

### Quick Diagnostics
```bash
# Check for duplicate insertion points
grep -n "insert.*into.*ai_chat_messages" $(find . -name "*.ts" -o -name "*.tsx")

# Count setMessages calls
grep -c "setMessages" src/components/AIChatWidget.tsx

# Find recent changes
git log -p --since="1 day ago" src/components/AIChatWidget.tsx
```

### Database Queries
```sql
-- Clear test messages
DELETE FROM ai_chat_messages WHERE content LIKE 'TEST%';

-- Reset conversation
UPDATE ai_chat_conversations
SET is_agent_active = false
WHERE id = '<conversation-id>';
```

## SMART HUMAN TAKEOVER SYSTEM

### Smart Button Timing (v1.7)
The "Request Store Owner" button now appears intelligently based on conversation context:

1. **Customer Message Count**: Button appears after customer sends 3+ messages
2. **AI Help Detection**: Button appears immediately if AI indicates it needs human help
3. **Business Hours Awareness**: Button ONLY appears during configured business hours

### Business Hours Configuration
- Store must have `business_hours` and `days_of_operation` configured
- Format: `business_hours = "9:00 AM - 5:00 PM"`, `days_of_operation = "Monday, Tuesday, Wednesday"`
- If not configured: No human takeover available (opt-in feature)
- Outside hours: AI suggests WhatsApp instead of showing button

## OWNER NOTIFICATION SYSTEM

### Overview
When a customer clicks "Request Store Owner" (after meeting smart timing criteria), the system notifies the store owner through multiple channels to ensure quick response time.

### Components

#### 1. **OwnerNotificationManager** (`src/components/dashboard/OwnerNotificationManager.tsx`)
- Main component that manages all notification features
- Polls every 5 seconds for conversations with `takeover_status = 'requested'`
- Shows red banner at top of dashboard
- Provides mute/unmute toggle
- Integrates browser notifications and sound alerts

#### 2. **OwnerNotificationService** (`src/services/ownerNotificationService.ts`)
- Singleton service managing notification state
- Handles browser notification permissions
- Plays notification sounds (initial + repeat every 15s)
- Tracks which conversations have been notified
- Manages mute state in localStorage

#### 3. **NotificationSound** (`src/utils/notificationSound.ts`)
- Web Audio API based sound generator
- Creates pleasant two-tone chime (C5 and E5)
- No external audio files needed
- Volume control and auto-cleanup

#### 4. **ConversationsSimplifiedFixed** (`src/components/dashboard/ConversationsSimplifiedFixed.tsx`)
- Updated with urgent sorting logic
- Conversations with `takeover_status = 'requested'` appear at top
- Visual indicators: red border, pulsing dot, "WAITING" badge
- Shows elapsed time since customer started waiting

### Features

1. **Visual Notifications**
   - Red banner at top of page
   - Pulsing red dot on conversation
   - "Customer waiting for Xm Ys" text
   - Dashboard badge with count

2. **Audio Notifications**
   - Initial chime when customer requests owner
   - Repeat chime every 15 seconds while waiting
   - Mute/unmute toggle (persisted in localStorage)

3. **Browser Notifications**
   - Native browser notification with customer's last message
   - Click to navigate to conversations page
   - Auto-dismiss after 10 seconds

4. **Smart Polling**
   - Checks every 5 seconds for waiting customers
   - Cleans up when owner takes over
   - Stops sounds when no customers waiting

### Configuration

#### Default Wait Time
Changed from 5 minutes to 2 minutes:
```sql
-- Database default
ALTER TABLE stores
ALTER COLUMN wa_fallback_minutes SET DEFAULT 2;
```

#### Files Updated for 2-minute Default
- `src/components/AIChatWidget.tsx:408`
- `src/components/chat/WhatsAppFallbackTimer.tsx:31`
- `src/components/settings/WhatsAppFallbackSettings.tsx:18`
- `src/components/BusinessSettings.tsx:257`

### Testing Owner Notifications

1. **Trigger notification**:
   - Open chat widget as customer
   - Type message and wait 2 minutes
   - Click "Request Store Owner"

2. **Verify notifications**:
   - Red banner appears at top
   - Browser notification pops up
   - Sound plays (initial + every 15s)
   - Conversation moves to top with "WAITING" badge

3. **Test mute toggle**:
   - Click bell icon to mute
   - Sounds stop, browser notifications disabled
   - Preference persists on refresh

4. **Test takeover cleanup**:
   - Click "Take Over Chat" as owner
   - Banner disappears
   - Sounds stop
   - Conversation updates to "Agent Active"

### Owner Notification Debugging
1. **Check debug logs in browser console**:
   - Look for `[OwnerNotification] Polling...`
   - Look for `[OwnerNotification] Query result:`
   - Check if stores are found for the user

2. **Verify takeover_status is set**:
   ```sql
   SELECT takeover_status, waiting_for_owner_since
   FROM ai_chat_conversations
   WHERE store_id IN (SELECT id FROM stores WHERE user_id = 'your-user-id');
   ```

3. **Common issues**:
   - Store ID mismatch (user_id vs store id)
   - takeover_status not being set to 'requested'
   - OwnerNotificationManager not rendered in dashboard

## CONTACT FOR EMERGENCIES

If chat is completely broken and rollback doesn't work:
1. Disable via kill switch (SQL above)
2. Check this document's emergency procedures
3. Review recent commits
4. Test in local environment first

---

**REMEMBER**:
- Only 3 setMessages calls allowed
- Only edge function inserts messages
- Always use timestamp cursors for polling
- When in doubt, check this document first
- Default wait time is now 2 minutes (not 5)
- Owner notifications use polling (5s interval)
- "Request Store Owner" button requires 3+ messages OR AI help needed
- Business hours must be configured for human takeover

Last Updated: March 29, 2026
Version: 1.7.0
Status: PRODUCTION READY