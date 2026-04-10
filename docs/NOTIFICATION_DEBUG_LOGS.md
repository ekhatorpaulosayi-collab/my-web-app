# Owner Notification System - Debug Logging Guide

## Overview
The owner notification system includes comprehensive debug logging to help diagnose issues with the notification chain. All debug logs are currently enabled in production to facilitate troubleshooting.

## Debug Log Format

### Log Prefixes
The system uses emoji prefixes to categorize different types of debug messages:

- 🔍 **[DEBUG-N]** - General debugging information with sequential numbering
- 🔔 **[Notification]** - Notification-specific events
- 🔊 **[Sound]** - Audio notification events
- 🚀 **[Main]** - Main polling method execution
- ✅ **[Success]** - Successful operations
- ❌ **[Error]** - Error conditions
- ⚠️ **[Warning]** - Warning conditions

## Debug Log Sequence

### 1. Customer Clicks "Talk to Store Owner" Button
**Location**: `AIChatWidget.tsx`

```javascript
console.log('🔔 [TAKEOVER-DEBUG-1] Talk to Store Owner button clicked');
console.log('🔔 [TAKEOVER-DEBUG-2] Current conversation ID:', conversationId);
console.log('🔔 [TAKEOVER-DEBUG-3] Store ID:', storeData?.id);
console.log('🔔 [TAKEOVER-DEBUG-4] Store User ID:', storeData?.user_id);
console.log('✅ [TAKEOVER-DEBUG-5] Successfully set waiting_for_owner_since');
console.log('✅ [TAKEOVER-DEBUG-6] Updated conversation:', data);
```

### 2. Owner Notification Polling
**Location**: `ownerNotificationService.ts`

```javascript
// Main polling method
console.log('🚀 [DEBUG-25] checkForWaitingOwnerChats MAIN METHOD called for user:', userId);
console.log('🚀 [DEBUG-26] Got', conversations.length, 'waiting conversations');
console.log('🚀 [DEBUG-27] Handled notifications');

// Detailed query process
console.log('🔍 [DEBUG-1] getWaitingConversations called with userId:', userId);
console.log('🔍 [DEBUG-2] Timestamp:', new Date().toISOString());
console.log('🔍 [DEBUG-3] Fetching stores for user_id:', userId);
console.log('✅ [DEBUG-5] Found stores:', stores?.length || 0, 'stores');
console.log('✅ [DEBUG-6] Store IDs:', stores?.map(s => s.id));
console.log('🔍 [DEBUG-9] Querying conversations with store_ids:', storeIds);
console.log('🔍 [DEBUG-10] Query conditions: waiting_for_owner_since NOT NULL, is_agent_active = false');
console.log('✅ [DEBUG-12] Query completed. Found:', conversations?.length || 0, 'conversations');
```

### 3. Notification Handling
**Location**: `ownerNotificationService.ts`

```javascript
console.log('🔔 [DEBUG-15] handleNewWaitingConversations called with', conversations.length, 'conversations');
console.log('🔔 [DEBUG-16] New unnotified conversations:', newConversations.length);
console.log('🔔 [DEBUG-17] Previously notified:', Array.from(this.state.notifiedConversations));
console.log('🔔 [DEBUG-18] Sending notifications for new conversations');
console.log('🔔 [DEBUG-19] Sent notification for:', conv.id, conv.visitor_name);
console.log('🔊 [DEBUG-20] Playing notification sound');
console.log('🔇 [DEBUG-21] Sound is muted, skipping');
console.log('🔊 [DEBUG-22] Starting repeating sounds');
console.log('🔊 [DEBUG-23] No more waiting conversations, stopping sounds');
console.log('🔔 [DEBUG-24] Cleaned up notification for:', id);
```

### 4. Dashboard Polling
**Location**: `App.jsx`

```javascript
console.log('👀 [Polling] Checking for waiting customers...');
console.log('🚨 [Waiting] Found ${waiting.length} waiting customer(s)');
console.log('🔊 [Sound] Playing notification chime for new waiting customers');
```

## How to Use Debug Logs

### In Browser Console

1. **Filter by prefix** to focus on specific areas:
   - Filter for `[DEBUG-` to see all debug messages
   - Filter for `[TAKEOVER-` to see button click events
   - Filter for `[Waiting]` to see waiting customer detection
   - Filter for `[Sound]` to see audio events

2. **Look for the sequence**:
   - Customer action: `[TAKEOVER-DEBUG-1]` through `[TAKEOVER-DEBUG-6]`
   - Polling detection: `[DEBUG-25]` through `[DEBUG-27]`
   - Notification handling: `[DEBUG-15]` through `[DEBUG-24]`

### Common Issues and Their Debug Signatures

#### Issue: Button clicked but no notification
Look for:
```
🔔 [TAKEOVER-DEBUG-1] Talk to Store Owner button clicked
❌ [TAKEOVER-DEBUG-ERROR] Error updating conversation
```

#### Issue: Polling not finding conversations
Look for:
```
🔍 [DEBUG-9] Querying conversations with store_ids: []
⚠️ [DEBUG-7] No stores found for user:
```

#### Issue: Sound not playing
Look for:
```
🔇 [DEBUG-21] Sound is muted, skipping
```

## Test Script Usage

Run the test script to verify the notification flow:

```bash
# Check a specific conversation
node scripts/test-notification-flow.js <conversation_id>

# Check recent conversations (no ID provided)
node scripts/test-notification-flow.js
```

The script will output:
1. Current conversation state
2. Waiting status check
3. Store configuration
4. Simulated owner query results
5. Recent messages
6. Summary of notification flow status

## Production Monitoring

To monitor notifications in production:

1. **Check deployment logs**:
```bash
vercel logs smartstock-v2.vercel.app --follow
```

2. **Browser DevTools**:
   - Open Console
   - Filter for `[DEBUG` or `[TAKEOVER`
   - Watch for the numbered sequence

3. **Database verification**:
   - Check `ai_chat_conversations` table
   - Verify `waiting_for_owner_since` is set
   - Confirm `is_agent_active` is `false`

## Debug Log Lifecycle

1. **Enable**: Debug logs are currently always enabled
2. **Monitor**: Use browser console or Vercel logs
3. **Disable**: To disable in production, remove or comment out console.log statements

## Key Database Fields to Monitor

- `waiting_for_owner_since`: Timestamp when customer requested owner
- `is_agent_active`: Must be `false` for notifications to trigger
- `takeover_status`: Should be `'requested'` when waiting
- `store_id`: Links conversation to store owner

## Summary

The debug logging system provides comprehensive visibility into:
- Customer actions (button clicks)
- Database updates
- Polling queries
- Notification triggers
- Sound playback
- Error conditions

All logs use consistent formatting with emoji prefixes and sequential numbering for easy tracking of the notification flow from customer action to owner alert.