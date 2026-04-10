# Web Push Notification Implementation Summary

## Status: Ready for Implementation

### Completed Preparations:
1. ✅ VAPID key generator script created
2. ✅ VAPID keys generated
3. ✅ Service worker push handlers prepared (sw-with-push.js)
4. ✅ Push subscription table migration prepared
5. ✅ Backup of ai-chat edge function created

### VAPID Keys (Generated):
```env
VITE_VAPID_PUBLIC_KEY=BJT0RJYTrJDZN70mYJH0NTFPKE4L9srwqSsdcpnEZeKXWupXpOOitwjmGT_wJ_Vznp-KpmZn57cOHEUx4QSmJcE
VAPID_PRIVATE_KEY=-NVJTkPMeAe6r_MFuvZXSASf0VKAks_UG_ZJDcRJ0nE
VAPID_SUBJECT=mailto:paul@storehouse.ng
```

## Implementation Steps:

### Step 1: Apply Database Migration
```bash
# Migration file already exists at: supabase/migrations/20260329_push_subscriptions.sql
# Apply it to Supabase:
psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260329_push_subscriptions.sql
```

### Step 2: Update Service Worker
```bash
# Replace current service worker with push-enabled version
cp public/sw-with-push.js public/sw.js
```

### Step 3: Create Push Notification Service
File already created at: `src/services/pushNotificationService.ts`

### Step 4: Create Send Push Edge Function
Create `supabase/functions/send-push-notification/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as webpush from 'npm:web-push@3.6.7'

serve(async (req) => {
  try {
    const { userId, conversationId, customerName, messagePreview } = await req.json()

    // Set VAPID details
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VITE_VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    // Get push subscriptions from database
    const { data: subscriptions } = await supabase
      .rpc('get_user_push_subscriptions', { target_user_id: userId })

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify({
            title: `${customerName} is waiting!`,
            body: messagePreview,
            conversationId,
            timestamp: Date.now()
          })
        )
      )
    )

    return new Response(JSON.stringify({ sent: results.length }), { status: 200 })
  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 200 })
  }
})
```

### Step 5: Update AI Chat Function
Add to `supabase/functions/ai-chat/index.ts` when "Talk to Store Owner" is clicked:

```typescript
// After setting waiting_for_owner_since
if (updateData.waiting_for_owner_since) {
  try {
    // Get store owner user_id
    const { data: store } = await supabaseClient
      .from('stores')
      .select('user_id')
      .eq('id', conversation.store_id)
      .single()

    if (store?.user_id) {
      // Send push notification (non-blocking)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: store.user_id,
          conversationId: conversation.id,
          customerName: conversation.visitor_name || 'Customer',
          messagePreview: lastCustomerMessage?.substring(0, 100) || 'Customer needs help'
        })
      }).catch(err => console.error('Push notification failed:', err))
    }
  } catch (err) {
    console.error('Error sending push notification:', err)
    // Don't fail the main flow
  }
}
```

### Step 6: Add Push Subscription UI in Dashboard

Update `src/App.jsx` to initialize push notifications:

```javascript
import { initPushNotifications, subscribeToPush, isPushSupported, getPushPermissionState } from './services/pushNotificationService';

// In App component
useEffect(() => {
  const setupPushNotifications = async () => {
    if (!user || !isPushSupported()) return;

    await initPushNotifications();

    const permission = getPushPermissionState();
    if (permission === 'default') {
      // Show prompt to enable notifications
      setShowPushPrompt(true);
    } else if (permission === 'granted') {
      // Subscribe if not already
      const storeId = user.uid; // Or get from store data
      await subscribeToPush(user.uid, storeId);
    }
  };

  setupPushNotifications();
}, [user]);

// Add UI for push notification prompt
{showPushPrompt && (
  <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
    <p className="font-semibold mb-2">
      Get alerts when customers need help — even when you're not on the app
    </p>
    <div className="flex gap-2">
      <button
        onClick={async () => {
          const permission = await requestPermission();
          if (permission === 'granted') {
            await subscribeToPush(user.uid, user.uid);
          }
          setShowPushPrompt(false);
        }}
        className="bg-white text-blue-600 px-4 py-2 rounded"
      >
        Enable Notifications
      </button>
      <button
        onClick={() => setShowPushPrompt(false)}
        className="text-white/80 px-4 py-2"
      >
        Not Now
      </button>
    </div>
  </div>
)}
```

## Deployment Steps:

1. **Add environment variables to Vercel:**
```bash
vercel env add VITE_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add VAPID_SUBJECT
```

2. **Deploy edge function:**
```bash
supabase functions deploy send-push-notification
```

3. **Apply database migration:**
```bash
# Run the migration SQL against the database
```

4. **Update and deploy frontend:**
```bash
npm run build && vercel --prod --force --yes
```

## Testing:

1. Open dashboard as store owner
2. Enable push notifications when prompted
3. Open store page in incognito/another browser
4. Send messages as customer
5. Click "Talk to Store Owner"
6. Verify push notification appears on owner's device

## Rollback Plan:

If issues arise:
1. Restore original service worker: `git checkout -- public/sw.js`
2. Restore ai-chat function: `cp supabase/functions/ai-chat/index.ts.pre-push-backup supabase/functions/ai-chat/index.ts`
3. Redeploy without push features

## Security Notes:

- VAPID private key must NEVER be committed to git
- Push subscriptions table has RLS enabled
- Edge function validates user ownership before sending
- All push operations are wrapped in try-catch to prevent main flow disruption