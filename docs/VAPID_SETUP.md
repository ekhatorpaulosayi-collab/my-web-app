# VAPID Keys Setup for Web Push Notifications

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server when sending Web Push notifications. They ensure that only your server can send push notifications to your users.

## Generate New Keys

If you need to generate new VAPID keys, run:

```bash
node scripts/generate-vapid-keys.cjs
```

## Environment Variable Setup

### 1. Vercel Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

```
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

The public key needs the `VITE_` prefix so it's available in the frontend build.

### 2. Supabase Edge Function Secrets

Add these secrets for the edge function:

```bash
# Add all three secrets
supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
supabase secrets set VAPID_SUBJECT=mailto:paul@storehouse.ng
```

### 3. Local Development (.env.local)

For local development, add to your `.env.local` file:

```
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

## Security Notes

⚠️ **IMPORTANT**:
- **NEVER** commit the private key to git
- The private key should ONLY be stored as a Supabase secret
- The public key is safe to expose in the frontend
- Keep a secure backup of both keys - if you lose them, you'll need to re-subscribe all users

## Testing Push Notifications

1. Open the dashboard and look for the push notification prompt
2. Click "Enable" to subscribe
3. Go to Settings → Notifications to test sending a push
4. Check browser DevTools → Application → Service Workers for debugging

## Troubleshooting

### Push notifications not working?

1. Check that the VAPID keys are properly set in environment variables
2. Verify service worker is registered: `navigator.serviceWorker.ready`
3. Check browser console for permission errors
4. Ensure HTTPS is enabled (required for push)
5. For iOS: User must add the PWA to home screen first

### Common Errors

- **401 Unauthorized**: VAPID keys mismatch or incorrect
- **410 Gone**: Subscription expired, need to re-subscribe
- **413 Payload Too Large**: Message content too big (limit ~4KB)

## Browser Support

- ✅ Chrome, Edge, Firefox (Desktop & Android)
- ✅ Safari (macOS & iOS 16.4+, requires PWA on home screen)
- ❌ WebView browsers
- ❌ iOS Safari (without adding to home screen)

## Key Rotation

If you need to rotate keys (security breach or key compromise):

1. Generate new VAPID keys
2. Update all environment variables
3. Clear the `push_subscriptions` table
4. Users will be prompted to re-subscribe with new keys

## Related Files

- `/scripts/generate-vapid-keys.cjs` - Key generation script
- `/src/services/pushNotificationService.ts` - Client-side subscription
- `/public/sw.js` - Service worker push handler
- `/supabase/functions/ai-chat/index.ts` - Server-side push sending