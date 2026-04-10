import { supabase } from '../lib/supabase';

// VAPID public key (from environment variable)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BJT0RJYTrJDZN70mYJH0NTFPKE4L9srwqSsdcpnEZeKXWupXpOOitwjmGT_wJ_Vznp-KpmZn57cOHEUx4QSmJcE';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current push notification permission state
 */
export function getPushPermissionState(): NotificationPermission {
  return Notification.permission;
}

/**
 * Request push notification permission from user
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported on this device');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Push] Permission result:', permission);
  return permission;
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Initialize push notifications and register service worker
 */
export async function initPushNotifications(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported');
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Push] Service Worker registered:', registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker is ready');

    return registration;
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string, storeId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported');
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker ready, getting subscription');

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push] No existing subscription, creating new one');

      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('[Push] New subscription created:', subscription);
    } else {
      console.log('[Push] Using existing subscription');
    }

    // Extract keys from subscription
    const subscriptionJSON = subscription.toJSON();
    const p256dh = subscriptionJSON.keys?.p256dh;
    const auth = subscriptionJSON.keys?.auth;

    if (!p256dh || !auth) {
      console.error('[Push] Missing subscription keys');
      return false;
    }

    // Get device info
    const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
    const browserInfo = navigator.userAgent;

    // Save subscription to database
    console.log('[Push] Saving subscription to database');
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        store_id: storeId,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth,
        device_name: deviceName,
        browser_info: browserInfo,
        last_used_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('[Push] Error saving subscription:', error);
      return false;
    }

    console.log('[Push] Subscription saved successfully');
    return true;
  } catch (error) {
    console.error('[Push] Error subscribing to push:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Mark as inactive in database
      const endpoint = subscription.endpoint;
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', endpoint);

      console.log('[Push] Unsubscribed successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Error checking subscription:', error);
    return false;
  }
}

/**
 * Send test notification (for testing only)
 */
export async function sendTestNotification(userId: string): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId: userId,
        customerName: 'Test Customer',
        messagePreview: 'This is a test notification',
        conversationId: 'test-' + Date.now()
      })
    });

    const data = await response.json();
    console.log('[Push] Test notification result:', data);
  } catch (error) {
    console.error('[Push] Error sending test notification:', error);
  }
}
