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
    // Load mute preference from localStorage (use consistent key with App.jsx)
    const muted = localStorage.getItem('notifications-muted');
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
      console.log('🔍 [DEBUG-1] getWaitingConversations called with userId:', userId);
      console.log('🔍 [DEBUG-2] Timestamp:', new Date().toISOString());

      // First get user's stores
      console.log('🔍 [DEBUG-3] Fetching stores for user_id:', userId);
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId);

      if (storesError) {
        console.error('❌ [DEBUG-4] Error fetching stores:', storesError);
        return [];
      }

      console.log('✅ [DEBUG-5] Found stores:', stores?.length || 0, 'stores');
      console.log('✅ [DEBUG-6] Store IDs:', stores?.map(s => s.id));

      const storeIds = stores?.map(s => s.id) || [];

      if (storeIds.length === 0) {
        console.log('⚠️ [DEBUG-7] No stores found for user:', userId);
        // Also try using userId as storeId (fallback for single-store setup)
        console.log('🔍 [DEBUG-8] Trying userId as storeId fallback:', userId);
        storeIds.push(userId);
      }

      // Get conversations that are waiting for owner response
      // Look for conversations where waiting_for_owner_since is set but agent hasn't taken over
      console.log('🔍 [DEBUG-9] Querying conversations with store_ids:', storeIds);
      console.log('🔍 [DEBUG-10] Query conditions: waiting_for_owner_since NOT NULL, is_agent_active = false');

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
        .not('waiting_for_owner_since', 'is', null)
        .eq('is_agent_active', false)
        .order('waiting_for_owner_since', { ascending: true });

      if (convError) {
        console.error('❌ [DEBUG-11] Error fetching conversations:', convError);
        return [];
      }

      console.log('✅ [DEBUG-12] Query completed. Found:', conversations?.length || 0, 'conversations');
      if (conversations && conversations.length > 0) {
        console.log('📋 [DEBUG-13] Conversation details:', conversations.map(c => ({
          id: c.id,
          store_id: c.store_id,
          takeover_status: c.takeover_status,
          waiting_since: c.waiting_for_owner_since,
          is_waiting: c.waiting_for_owner_since !== null
        })));
      } else {
        console.log('📋 [DEBUG-14] No waiting conversations found');
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
    console.log('🔔 [DEBUG-15] handleNewWaitingConversations called with', conversations.length, 'conversations');

    const newConversations = conversations.filter(
      conv => !this.state.notifiedConversations.has(conv.id)
    );

    console.log('🔔 [DEBUG-16] New unnotified conversations:', newConversations.length);
    console.log('🔔 [DEBUG-17] Previously notified:', Array.from(this.state.notifiedConversations));

    if (newConversations.length > 0) {
      console.log('🔔 [DEBUG-18] Sending notifications for new conversations');
      // Send notifications for new conversations
      for (const conv of newConversations) {
        this.state.notifiedConversations.add(conv.id);
        this.sendBrowserNotification(conv);
        console.log('🔔 [DEBUG-19] Sent notification for:', conv.id, conv.visitor_name);
      }

      // Play initial notification sound
      if (!this.state.isMuted) {
        console.log('🔊 [DEBUG-20] Playing notification sound');
        await playNotificationSound(0.5);
      } else {
        console.log('🔇 [DEBUG-21] Sound is muted, skipping');
      }

      // Start repeating sound every 15 seconds if not already running
      if (!this.state.soundInterval && !this.state.isMuted && conversations.length > 0) {
        console.log('🔊 [DEBUG-22] Starting repeating sounds');
        this.startRepeatingSounds();
      }
    }

    // Stop sounds if no more waiting conversations
    if (conversations.length === 0 && this.state.soundInterval) {
      console.log('🔊 [DEBUG-23] No more waiting conversations, stopping sounds');
      this.stopRepeatingSounds();
    }

    // Clean up notified set for conversations that are no longer waiting
    const currentIds = new Set(conversations.map(c => c.id));
    for (const id of this.state.notifiedConversations) {
      if (!currentIds.has(id)) {
        this.state.notifiedConversations.delete(id);
        console.log('🔔 [DEBUG-24] Cleaned up notification for:', id);
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
    localStorage.setItem('notifications-muted', String(this.state.isMuted));

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
   * Check for waiting owner chats (main method for polling)
   */
  async checkForWaitingOwnerChats(userId: string): Promise<WaitingConversation[]> {
    console.log('🚀 [DEBUG-25] checkForWaitingOwnerChats MAIN METHOD called for user:', userId);

    // Get waiting conversations
    const conversations = await this.getWaitingConversations(userId);
    console.log('🚀 [DEBUG-26] Got', conversations.length, 'waiting conversations');

    // Handle notifications for new conversations
    await this.handleNewWaitingConversations(conversations);
    console.log('🚀 [DEBUG-27] Handled notifications');

    return conversations;
  }

  /**
   * Play repeating sounds manually (called by export)
   */
  playRepeatingSounds(): void {
    console.log('🔊 [DEBUG-28] playRepeatingSounds called manually');
    if (!this.state.isMuted) {
      this.startRepeatingSounds();
    }
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

// Export convenience functions for App.jsx
export const checkForWaitingCustomers = (userId: string) =>
  ownerNotificationService.checkForWaitingOwnerChats(userId);

export const playNotificationChime = () =>
  ownerNotificationService.playRepeatingSounds();

export const requestNotificationPermission = () =>
  ownerNotificationService.requestPermission();