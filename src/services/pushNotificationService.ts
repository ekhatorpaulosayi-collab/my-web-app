import { supabase } from '../lib/supabase';

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name?: string;
  browser_info?: string;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey: string | null = null;
  private isSupported = false;
  private serviceWorkerReady = false;

  private constructor() {
    // Check browser support
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    // Get VAPID public key from environment
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;

    if (!this.vapidPublicKey) {
      console.warn('[PushNotifications] VAPID public key not configured');
    }

    // Initialize service worker readiness check
    if (this.isSupported) {
      this.checkServiceWorkerReady();
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async checkServiceWorkerReady() {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorkerReady = !!registration;
      console.log('[PushNotifications] Service worker ready');
    } catch (error) {
      console.error('[PushNotifications] Service worker not ready:', error);
      this.serviceWorkerReady = false;
    }
  }

  /**
   * Check if push notifications are supported and configured
   */
  isAvailable(): boolean {
    return this.isSupported && !!this.vapidPublicKey && this.serviceWorkerReady;
  }

  /**
   * Check if user has already granted permission
   */
  hasPermission(): boolean {
    return this.isSupported && Notification.permission === 'granted';
  }

  /**
   * Check if we should prompt the user (hasn't been asked or said "later")
   */
  shouldPrompt(): boolean {
    if (!this.isAvailable()) return false;

    const lastPrompt = localStorage.getItem('push_prompt_timestamp');
    const promptResult = localStorage.getItem('push_prompt_result');

    // Never asked
    if (!lastPrompt) return true;

    // User said "later" - re-prompt after 7 days
    if (promptResult === 'later') {
      const daysSincePrompt = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
      return daysSincePrompt >= 7;
    }

    // User explicitly declined or accepted
    return false;
  }

  /**
   * Record user's response to the prompt
   */
  recordPromptResponse(response: 'enabled' | 'later' | 'declined') {
    localStorage.setItem('push_prompt_timestamp', Date.now().toString());
    localStorage.setItem('push_prompt_result', response);
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('[PushNotifications] Not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[PushNotifications] Permission result:', permission);
      return permission;
    } catch (error) {
      console.error('[PushNotifications] Error requesting permission:', error);
      return 'denied';
    }
  }

  /**
   * Get or create a push subscription
   */
  async subscribeToPush(userId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.error('[PushNotifications] Push not available');
      return false;
    }

    if (!this.vapidPublicKey) {
      console.error('[PushNotifications] VAPID public key not configured');
      return false;
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // Create new subscription if needed
      if (!subscription) {
        const urlBase64ToUint8Array = (base64String: string) => {
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
        };

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      // Extract subscription data
      const subscriptionJSON = subscription.toJSON();
      const keys = subscriptionJSON.keys as PushSubscriptionKeys;

      if (!subscriptionJSON.endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription data');
      }

      // Get device info
      const deviceName = this.getDeviceName();
      const browserInfo = this.getBrowserInfo();

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscriptionJSON.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_name: deviceName,
          browser_info: browserInfo,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('[PushNotifications] Error saving subscription:', error);
        return false;
      }

      console.log('[PushNotifications] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Error subscribing:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from database
        const subscriptionJSON = subscription.toJSON();
        if (subscriptionJSON.endpoint) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscriptionJSON.endpoint);
        }
      }

      console.log('[PushNotifications] Successfully unsubscribed');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Error unsubscribing:', error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<{ isSubscribed: boolean; subscription: PushSubscription | null }> {
    if (!this.isAvailable()) {
      return { isSubscribed: false, subscription: null };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return {
        isSubscribed: !!subscription,
        subscription
      };
    } catch (error) {
      console.error('[PushNotifications] Error checking subscription:', error);
      return { isSubscribed: false, subscription: null };
    }
  }

  /**
   * Get all subscriptions for the current user
   */
  async getUserSubscriptions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[PushNotifications] Error fetching subscriptions:', error);
      return [];
    }
  }

  /**
   * Delete a specific subscription
   */
  async deleteSubscription(subscriptionId: string) {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[PushNotifications] Error deleting subscription:', error);
      return false;
    }
  }

  /**
   * Send a test notification (for testing purposes)
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      // This would typically call an API endpoint that triggers a push
      // For now, we'll just show a local notification
      if (this.hasPermission()) {
        const notification = new Notification('Test Notification', {
          body: 'Push notifications are working correctly!',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: 'test-notification',
          requireInteraction: false
        });

        setTimeout(() => notification.close(), 5000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PushNotifications] Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Get device name for identification
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Try to identify device type
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return `iOS Device (${platform})`;
    } else if (/Android/.test(userAgent)) {
      return `Android Device`;
    } else if (/Windows/.test(platform)) {
      return `Windows PC`;
    } else if (/Mac/.test(platform)) {
      return `Mac`;
    } else if (/Linux/.test(platform)) {
      return `Linux PC`;
    } else {
      return `${platform || 'Unknown Device'}`;
    }
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.indexOf('Firefox') > -1) {
      return 'Firefox';
    } else if (userAgent.indexOf('Chrome') > -1) {
      if (userAgent.indexOf('Edg') > -1) {
        return 'Edge';
      }
      return 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      return 'Safari';
    } else {
      return 'Unknown Browser';
    }
  }

  /**
   * Check if we're in a PWA context (for iOS)
   */
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Check if this is iOS Safari that needs PWA installation
   */
  needsPWAInstall(): boolean {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    return isIOS && isSafari && !this.isPWA();
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();