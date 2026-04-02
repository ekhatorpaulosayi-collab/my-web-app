// Supabase Channel Cleanup Utility - Prevents channel conflicts
import { supabase } from '../lib/supabase';

// Global channel cleanup - call this periodically
export function cleanupAllChannels() {
  const channels = supabase.getChannels();
  console.log(`[ChannelCleanup] Found ${channels.length} active channels`);

  channels.forEach((channel, index) => {
    // Check if channel is in error state or closed
    if (channel.state === 'errored' || channel.state === 'closed') {
      console.log(`[ChannelCleanup] Removing failed channel ${index}: ${channel.topic} (${channel.state})`);
      try {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch (error) {
        console.error(`[ChannelCleanup] Error removing channel ${channel.topic}:`, error);
      }
    }
  });
}

// Cleanup specific conversation channels
export function cleanupConversationChannels(conversationId?: string) {
  const channels = supabase.getChannels();

  channels.forEach(channel => {
    if (conversationId) {
      // Remove only channels for this specific conversation
      if (channel.topic?.includes(`conversation-${conversationId}`) ||
          channel.topic?.includes(`messages-${conversationId}`)) {
        console.log(`[ChannelCleanup] Removing conversation channel: ${channel.topic}`);
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (error) {
          console.error(`[ChannelCleanup] Error removing channel ${channel.topic}:`, error);
        }
      }
    } else {
      // Remove all conversation-related channels
      if (channel.topic?.includes('conversation-') ||
          channel.topic?.includes('messages-') ||
          channel.topic?.includes('chat-')) {
        console.log(`[ChannelCleanup] Removing channel: ${channel.topic}`);
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (error) {
          console.error(`[ChannelCleanup] Error removing channel ${channel.topic}:`, error);
        }
      }
    }
  });
}

// Cleanup duplicate channels
export function removeDuplicateChannels() {
  const channels = supabase.getChannels();
  const seenTopics = new Set<string>();

  channels.forEach(channel => {
    if (channel.topic) {
      if (seenTopics.has(channel.topic)) {
        console.log(`[ChannelCleanup] Removing duplicate channel: ${channel.topic}`);
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (error) {
          console.error(`[ChannelCleanup] Error removing duplicate channel:`, error);
        }
      } else {
        seenTopics.add(channel.topic);
      }
    }
  });
}

// Auto-cleanup on window events
if (typeof window !== 'undefined') {
  // Cleanup on page hide/unload
  window.addEventListener('pagehide', () => {
    console.log('[ChannelCleanup] Page hide event, cleaning up channels...');
    cleanupAllChannels();
  });

  window.addEventListener('beforeunload', () => {
    console.log('[ChannelCleanup] Before unload, cleaning up channels...');
    cleanupAllChannels();
  });

  // Periodic cleanup every 60 seconds
  setInterval(() => {
    const channels = supabase.getChannels();
    const erroredChannels = channels.filter(ch =>
      ch.state === 'errored' || ch.state === 'closed'
    );

    if (erroredChannels.length > 0) {
      console.log(`[ChannelCleanup] Found ${erroredChannels.length} errored channels, cleaning up...`);
      cleanupAllChannels();
    }

    // Also remove duplicates
    removeDuplicateChannels();
  }, 60000);
}

// Export a function to get channel health status
export function getChannelHealth(): {
  total: number;
  healthy: number;
  errored: number;
  closed: number;
  topics: string[];
} {
  const channels = supabase.getChannels();

  return {
    total: channels.length,
    healthy: channels.filter(ch => ch.state === 'joined').length,
    errored: channels.filter(ch => ch.state === 'errored').length,
    closed: channels.filter(ch => ch.state === 'closed').length,
    topics: channels.map(ch => ch.topic || 'unknown')
  };
}