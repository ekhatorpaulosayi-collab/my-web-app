import { supabase } from '../lib/supabase';
import { playNotificationSound } from '../utils/notificationSound';

export interface WaitingConversation {
  id: string;
  store_id: string;
  visitor_name: string;
  takeover_status: string;
  waiting_for_owner_since: string;
  last_customer_message?: string;
  updated_at: string;
}

interface NotificationState {
  notifiedConversations: Set<string>;
  soundInterval: NodeJS.Timeout | null;
  isMuted: boolean;
  hasPermission: boolean;
  lastPollTime: Date;
}

class OwnerNotificationService {
  private state: NotificationState = {
    notifiedConversations: new Set(),
    soundInterval: null,
    isMuted: false,
    hasPermission: false,
    lastPollTime: new Date()
  };

  constructor() {
    // Load mute preference from localStorage
    const muted = localStorage.getItem('notifications_muted');
    this.state.isMuted = muted === 'true';

    // Check notification permission status
    if ('Notification' in window) {
      this.state.hasPermission = Notification.permission === 'granted';
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('[OwnerNotifications] Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.state.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.state.hasPermission = permission === 'granted';
      return this.state.hasPermission;
    }

    return false;
  }

  /**
   * Get waiting conversations for owner's stores
   */
  async getWaitingConversations(userId: string): Promise<WaitingConversation[]> {
    try {
      console.log('[OwnerNotifications] Getting waiting conversations for user:', userId);

      // First get user's stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId);

      if (storesError) {
        console.error('[OwnerNotifications] Error fetching stores:', storesError);
        return [];
      }

      console.log('[OwnerNotifications] Found stores for user:', stores?.length || 0, 'stores');
      console.log('[OwnerNotifications] Store IDs:', stores?.map(s => s.id));

      const storeIds = stores?.map(s => s.id) || [];

      if (storeIds.length === 0) {
        console.log('[OwnerNotifications] No stores found for user:', userId);
        return [];
      }

      // Get conversations that are waiting for owner response
      console.log('[OwnerNotifications] Querying conversations with takeover_status=requested for stores:', storeIds);
      const { data: conversations, error: convError } = await supabase
        .from('ai_chat_conversations')
        .select(`
          id,
          store_id,
          visitor_name,
          takeover_status,
          waiting_for_owner_since,
          updated_at
        `)
        .in('store_id', storeIds)
        .eq('takeover_status', 'requested')
        .eq('is_agent_active', false)
        .order('waiting_for_owner_since', { ascending: true });

      if (convError) {
        console.error('[OwnerNotifications] Error fetching conversations:', convError);
        return [];
      }

      console.log('[OwnerNotifications] Found conversations:', conversations?.length || 0, 'conversations');
      if (conversations && conversations.length > 0) {
        console.log('[OwnerNotifications] Conversation details:', conversations.map(c => ({
          id: c.id,
          store_id: c.store_id,
          takeover_status: c.takeover_status,
          waiting_since: c.waiting_for_owner_since
        })));
      }

      // Get last customer message for each conversation
      const conversationsWithMessages = await Promise.all((conversations || []).map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from('ai_chat_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          last_customer_message: lastMessage?.content || 'Customer is waiting...'
        };
      }));

      return conversationsWithMessages;
    } catch (error) {
      console.error('[OwnerNotifications] Error in getWaitingConversations:', error);
      return [];
    }
  }

  /**
   * Calculate time elapsed since customer started waiting
   */
  getElapsedTime(waitingSince: string): string {
    const start = new Date(waitingSince);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Send browser notification for new waiting customer
   */
  private sendBrowserNotification(conversation: WaitingConversation): void {
    if (!this.state.hasPermission || this.state.isMuted) {
      return;
    }

    try {
      const notification = new Notification('Customer waiting for you', {
        body: conversation.last_customer_message || 'A customer needs your help',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: conversation.id,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to conversations page
        window.location.href = '/dashboard/conversations';
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('[OwnerNotifications] Error sending browser notification:', error);
    }
  }

  /**
   * Handle new waiting conversations
   */
  async handleNewWaitingConversations(conversations: WaitingConversation[]): Promise<void> {
    const newConversations = conversations.filter(
      conv => !this.state.notifiedConversations.has(conv.id)
    );

    if (newConversations.length > 0) {
      // Send notifications for new conversations
      for (const conv of newConversations) {
        this.state.notifiedConversations.add(conv.id);
        this.sendBrowserNotification(conv);
      }

      // Play initial notification sound
      if (!this.state.isMuted) {
        await playNotificationSound(0.5);
      }

      // Start repeating sound every 15 seconds if not already running
      if (!this.state.soundInterval && !this.state.isMuted && conversations.length > 0) {
        this.startRepeatingSounds();
      }
    }

    // Stop sounds if no more waiting conversations
    if (conversations.length === 0 && this.state.soundInterval) {
      this.stopRepeatingSounds();
    }

    // Clean up notified set for conversations that are no longer waiting
    const currentIds = new Set(conversations.map(c => c.id));
    for (const id of this.state.notifiedConversations) {
      if (!currentIds.has(id)) {
        this.state.notifiedConversations.delete(id);
      }
    }
  }

  /**
   * Start repeating notification sounds
   */
  private startRepeatingSounds(): void {
    this.stopRepeatingSounds(); // Clear any existing interval

    this.state.soundInterval = setInterval(async () => {
      if (!this.state.isMuted) {
        await playNotificationSound(0.3); // Quieter for repeats
      }
    }, 15000);
  }

  /**
   * Stop repeating notification sounds
   */
  private stopRepeatingSounds(): void {
    if (this.state.soundInterval) {
      clearInterval(this.state.soundInterval);
      this.state.soundInterval = null;
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.state.isMuted = !this.state.isMuted;
    localStorage.setItem('notifications_muted', String(this.state.isMuted));

    if (this.state.isMuted) {
      this.stopRepeatingSounds();
    }

    return this.state.isMuted;
  }

  /**
   * Get current mute state
   */
  isMuted(): boolean {
    return this.state.isMuted;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopRepeatingSounds();
    this.state.notifiedConversations.clear();
  }
}

// Create singleton instance
export const ownerNotificationService = new OwnerNotificationService();