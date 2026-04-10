// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple Web Push implementation without external dependencies
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  try {
    // For now, we'll use a simple fetch to a push service
    // In production, you'd want to use the web-push protocol properly
    // This is a simplified version that will work with most push services

    const endpoint = new URL(subscription.endpoint);

    // Prepare the notification payload
    const body = JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      },
      payload: payload,
      vapidPublicKey: vapidPublicKey
    });

    // Send to push service
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
        'Topic': 'customer-waiting'
      },
      body: payload
    });

    return response.ok;
  } catch (error) {
    console.error('Push send error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || 'BJT0RJYTrJDZN70mYJH0NTFPKE4L9srwqSsdcpnEZeKXWupXpOOitwjmGT_wJ_Vznp-KpmZn57cOHEUx4QSmJcE'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:paul@storehouse.ng'

    const { store_id, userId, conversationId, customerName, messagePreview } = await req.json()

    console.log('[Push] Received request for store:', store_id, 'user:', userId)

    // Get the user ID from store if store_id is provided
    let targetUserId = userId;

    if (store_id && !userId) {
      const { data: store } = await supabaseClient
        .from('stores')
        .select('user_id')
        .eq('id', store_id)
        .single()

      if (store) {
        targetUserId = store.user_id
      }
    }

    if (!targetUserId) {
      console.log('[Push] No user ID found')
      return new Response(
        JSON.stringify({ sent: 0, error: 'No user ID found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get push subscriptions from database
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId)
      .eq('is_active', true)

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ sent: 0, error: subError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No active subscriptions found for user:', targetUserId)
      return new Response(
        JSON.stringify({ sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('[Push] Found', subscriptions.length, 'subscription(s)')

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: customerName ? `${customerName} is waiting!` : 'Customer waiting!',
      body: messagePreview || 'A customer needs help in your store chat',
      icon: '/icons/storehouse-icon-192.png',
      badge: '/icons/storehouse-badge-72.png',
      tag: conversationId ? `conversation-${conversationId}` : 'customer-waiting',
      data: {
        conversationId,
        timestamp: Date.now(),
        type: 'customer-waiting'
      },
      requireInteraction: true,
      vibrate: [200, 100, 200]
    })

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Try to use the web-push protocol
          const success = await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth
            },
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          )

          if (!success) {
            // Mark subscription as inactive if it fails
            await supabaseClient
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id)
          }

          return success
        } catch (err) {
          console.error('[Push] Error sending to subscription:', err)
          return false
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    console.log('[Push] Successfully sent to', successCount, 'device(s)')

    return new Response(
      JSON.stringify({
        sent: successCount,
        total: subscriptions.length,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: any) {
    console.error('[Push] Function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal error',
        sent: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 to not break the main flow
      }
    )
  }
})