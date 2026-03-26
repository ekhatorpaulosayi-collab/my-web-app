// Reliable messaging hook with automatic fallback to polling when WebSocket fails
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseReliableMessagingOptions {
  conversationId: string;
  onNewMessage: (message: any) => void;
  pollingInterval?: number;
  maxRetries?: number;
}

export const useReliableMessaging = ({
  conversationId,
  onNewMessage,
  pollingInterval = 2000, // Poll every 2 seconds when WebSocket fails
  maxRetries = 3
}: UseReliableMessagingOptions) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'polling' | 'error'>('connecting');
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isActiveRef = useRef(true);

  // Polling fallback function
  const pollMessages = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      console.log('[ReliableMessaging] Polling for new messages...');

      // Fetch messages newer than lastMessageId
      let query = supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (lastMessageId) {
        // Get messages after the last known message
        const { data: lastMsg } = await supabase
          .from('ai_chat_messages')
          .select('created_at')
          .eq('id', lastMessageId)
          .single();

        if (lastMsg) {
          query = query.gt('created_at', lastMsg.created_at);
        }
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('[ReliableMessaging] Polling error:', error);
        return;
      }

      // Process new messages in chronological order
      if (messages && messages.length > 0) {
        const sortedMessages = messages.reverse(); // Back to ascending order

        sortedMessages.forEach(msg => {
          console.log('[ReliableMessaging] New message from polling:', msg.id);
          onNewMessage(msg);
          setLastMessageId(msg.id);
        });
      }
    } catch (error) {
      console.error('[ReliableMessaging] Polling exception:', error);
    }
  }, [conversationId, lastMessageId, onNewMessage]);

  // Setup WebSocket with automatic fallback
  const setupRealtimeConnection = useCallback(async () => {
    if (!isActiveRef.current) return;

    console.log('[ReliableMessaging] Setting up real-time connection...');
    setConnectionStatus('connecting');

    // Clean up existing connections
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      // Create new channel with timeout handling
      const channel = supabase
        .channel(`reliable-conv-${conversationId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('[ReliableMessaging] Real-time message received:', payload.new.id);
            onNewMessage(payload.new);
            setLastMessageId(payload.new.id);

            // Reset retry count on successful message
            retryCountRef.current = 0;
          }
        )
        .subscribe((status) => {
          console.log('[ReliableMessaging] Channel status:', status);

          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            retryCountRef.current = 0;
            console.log('[ReliableMessaging] WebSocket connected successfully');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[ReliableMessaging] WebSocket failed, switching to polling mode');
            handleWebSocketFailure();
          }
        });

      channelRef.current = channel;

      // Set a timeout to switch to polling if connection doesn't establish
      setTimeout(() => {
        if (connectionStatus === 'connecting' && isActiveRef.current) {
          console.warn('[ReliableMessaging] Connection timeout, switching to polling');
          handleWebSocketFailure();
        }
      }, 5000);

    } catch (error) {
      console.error('[ReliableMessaging] Setup error:', error);
      handleWebSocketFailure();
    }
  }, [conversationId, connectionStatus, onNewMessage, pollMessages]);

  // Handle WebSocket failure and switch to polling
  const handleWebSocketFailure = useCallback(() => {
    if (!isActiveRef.current) return;

    retryCountRef.current++;

    if (retryCountRef.current > maxRetries) {
      console.error('[ReliableMessaging] Max retries exceeded, staying in polling mode');
      setConnectionStatus('polling');
      startPolling();
    } else {
      console.log(`[ReliableMessaging] Retry ${retryCountRef.current}/${maxRetries} in 3 seconds...`);
      setConnectionStatus('polling');
      startPolling();

      // Retry WebSocket connection after delay
      setTimeout(() => {
        if (isActiveRef.current) {
          setupRealtimeConnection();
        }
      }, 3000 * retryCountRef.current); // Exponential backoff
    }
  }, [maxRetries, setupRealtimeConnection]);

  // Start polling interval
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('[ReliableMessaging] Starting polling fallback');

    // Poll immediately
    pollMessages();

    // Then set up interval
    pollingIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        pollMessages();
      }
    }, pollingInterval);
  }, [pollMessages, pollingInterval]);

  // Initialize on mount
  useEffect(() => {
    isActiveRef.current = true;

    // Get the latest message ID to track new messages
    const fetchLatestMessage = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastMessageId(data.id);
      }
    };

    fetchLatestMessage().then(() => {
      setupRealtimeConnection();
    });

    // Cleanup
    return () => {
      isActiveRef.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [conversationId]);

  return {
    connectionStatus,
    retryConnection: setupRealtimeConnection
  };
};