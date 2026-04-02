# Fix for Realtime WebSocket CHANNEL_ERROR

## Problem Summary
The WebSocket connection fails with CHANNEL_ERROR even though:
- Database has realtime enabled ✅
- Tables have REPLICA IDENTITY FULL ✅
- RLS policies are permissive ✅

## Root Cause
The issue is with the WebSocket connection setup, not the database configuration.

## Solution Steps

### 1. Check Supabase Dashboard Settings
Go to your Supabase Dashboard and verify:

1. **Authentication → Settings**:
   - Enable Anonymous Sign-ins ✅
   - This is CRITICAL for public chat widgets

2. **Database → Replication**:
   - Verify `ai_chat_conversations` is listed ✅
   - Verify `ai_chat_messages` is listed ✅
   - If not visible, toggle them on

3. **Settings → API**:
   - Check that Realtime is enabled ✅
   - Note the WebSocket URL (wss://...)

### 2. Fix the Client Code (AIChatWidget.tsx)

The current implementation has issues with channel naming and subscription setup.

**Current problematic code (lines 745-746):**
```typescript
conversationChannel = supabase
  .channel(`conversation_${conversationId}_${Date.now()}`) // Problem: Date.now()
```

**Fixed approach:**
```typescript
// Remove Date.now() - use stable channel names
conversationChannel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ai_chat_conversations',
    filter: `id=eq.${conversationId}`,
  }, handler)
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[AIChatWidget] Realtime connected');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[AIChatWidget] Channel error - falling back to polling');
      startPolling(); // Start polling immediately
    }
  });
```

### 3. Fix Supabase Client Configuration

**Update `/src/lib/supabase.js`:**
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Add timeout and reconnect settings
    timeout: 10000,
    heartbeatIntervalMs: 30000,
  },
  global: {
    headers: {
      'x-client-info': 'storehouse-app',
    },
  },
});
```

### 4. Alternative: Use Polling Only (Temporary Fix)

If WebSocket continues to fail, disable realtime and use polling:

**In AIChatWidget.tsx, comment out subscriptions and use polling:**
```typescript
// Skip WebSocket subscriptions entirely
// conversationChannel = supabase.channel(...)

// Start polling immediately
useEffect(() => {
  if (conversationId) {
    startPolling();
  }
  return () => {
    if (pollInterval) clearInterval(pollInterval);
  };
}, [conversationId]);
```

## Testing the Fix

1. **Check browser console for**:
   - `[AIChatWidget] Realtime connected` (success)
   - `[AIChatWidget] Channel error` (still failing)

2. **Check Network tab**:
   - Look for WebSocket connection to `wss://...supabase.co`
   - Should show status 101 (Switching Protocols)
   - If shows 403/401, it's an auth issue

3. **Test real-time updates**:
   - Open chat widget in one tab
   - Send message from agent dashboard in another
   - Message should appear instantly (realtime) or within 2-3 seconds (polling)

## Final Checklist

- [ ] Anonymous auth enabled in Supabase Dashboard
- [ ] Realtime enabled for both tables in Dashboard
- [ ] Channel names don't use Date.now()
- [ ] Polling starts as fallback when WebSocket fails
- [ ] Browser console shows connection status

## If Still Failing

The issue might be:
1. **Firewall/Proxy blocking WebSocket**: Test from different network
2. **Browser extensions blocking**: Try incognito mode
3. **Supabase project limits**: Check project usage/quotas
4. **CORS issues**: Check allowed origins in Supabase Dashboard

## Workaround
The code already has polling fallback (lines 901-970) which runs every 2-3 seconds.
This ensures messages work even without WebSocket. The polling is automatically
activated when CHANNEL_ERROR occurs.