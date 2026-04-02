// Supabase Realtime Helper - Robust connection management
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface ChannelConfig {
  name: string;
  onConnect?: () => void;
  onError?: (error: any) => void;
  maxRetries?: number;
  retryDelay?: number;
}

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async createChannel(config: ChannelConfig): Promise<RealtimeChannel> {
    const { name, onConnect, onError, maxRetries = 5, retryDelay = 2000 } = config;

    // Clean up existing channel if it exists
    await this.removeChannel(name);

    try {
      const channel = supabase.channel(name, {
        config: {
          broadcast: { self: true },
          presence: { key: name }
        }
      });

      // Set up event handlers
      channel
        .on('system', { event: '*' }, (payload: any) => {
          console.log(`[Realtime] System event for ${name}:`, payload);

          if (payload.type === 'error') {
            this.handleChannelError(name, payload, onError, maxRetries, retryDelay);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          console.log(`[Realtime] Channel ${name} synced successfully`);
          this.retryAttempts.set(name, 0);
          onConnect?.();
        });

      // Subscribe with error handling
      const result = await channel.subscribe((status) => {
        console.log(`[Realtime] Channel ${name} status:`, status);

        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully subscribed to ${name}`);
          this.retryAttempts.set(name, 0);
          onConnect?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.handleChannelError(name, { status }, onError, maxRetries, retryDelay);
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] Channel ${name} closed, attempting reconnect...`);
          this.scheduleReconnect(name, config);
        }
      });

      this.channels.set(name, channel);
      return channel;

    } catch (error) {
      console.error(`[Realtime] Failed to create channel ${name}:`, error);
      this.handleChannelError(name, error, onError, maxRetries, retryDelay);
      throw error;
    }
  }

  private handleChannelError(
    channelName: string,
    error: any,
    onError?: (error: any) => void,
    maxRetries: number = 5,
    retryDelay: number = 2000
  ) {
    const attempts = (this.retryAttempts.get(channelName) || 0) + 1;
    this.retryAttempts.set(channelName, attempts);

    console.error(`[Realtime] Channel ${channelName} error (attempt ${attempts}/${maxRetries}):`, error);
    onError?.(error);

    if (attempts < maxRetries) {
      const delay = retryDelay * Math.min(attempts, 3); // Exponential backoff up to 3x
      console.log(`[Realtime] Retrying ${channelName} in ${delay}ms...`);

      const timeout = setTimeout(() => {
        this.reconnectChannel(channelName);
      }, delay);

      this.reconnectTimeouts.set(channelName, timeout);
    } else {
      console.error(`[Realtime] Max retries reached for ${channelName}. Please refresh the page.`);
    }
  }

  private scheduleReconnect(channelName: string, config: ChannelConfig) {
    const timeout = setTimeout(() => {
      console.log(`[Realtime] Attempting to reconnect ${channelName}...`);
      this.createChannel(config);
    }, 3000);

    this.reconnectTimeouts.set(channelName, timeout);
  }

  private async reconnectChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (!channel) return;

    try {
      await channel.unsubscribe();
      await new Promise(resolve => setTimeout(resolve, 500));
      await channel.subscribe();
    } catch (error) {
      console.error(`[Realtime] Reconnection failed for ${channelName}:`, error);
    }
  }

  async removeChannel(channelName: string) {
    // Clear any pending reconnect timeouts
    const timeout = this.reconnectTimeouts.get(channelName);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(channelName);
    }

    // Unsubscribe from channel
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        await channel.unsubscribe();
        await supabase.removeChannel(channel);
      } catch (error) {
        console.error(`[Realtime] Error removing channel ${channelName}:`, error);
      }
      this.channels.delete(channelName);
    }

    this.retryAttempts.delete(channelName);
  }

  async removeAllChannels() {
    const promises = Array.from(this.channels.keys()).map(name =>
      this.removeChannel(name)
    );
    await Promise.all(promises);
  }

  getChannel(name: string): RealtimeChannel | undefined {
    return this.channels.get(name);
  }

  isChannelSubscribed(name: string): boolean {
    const channel = this.channels.get(name);
    return channel?.state === 'joined';
  }

  getChannelStatus(name: string): string {
    const channel = this.channels.get(name);
    return channel?.state || 'not_created';
  }

  getAllChannelStatuses(): { [key: string]: string } {
    const statuses: { [key: string]: string } = {};
    this.channels.forEach((channel, name) => {
      statuses[name] = channel.state || 'unknown';
    });
    return statuses;
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Helper function for easy channel setup
export async function setupRealtimeChannel(
  channelName: string,
  subscriptions: Array<{
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    filter?: string;
    callback: (payload: any) => void;
  }>,
  options?: {
    onConnect?: () => void;
    onError?: (error: any) => void;
  }
): Promise<RealtimeChannel> {
  const channel = await realtimeManager.createChannel({
    name: channelName,
    onConnect: options?.onConnect,
    onError: options?.onError
  });

  // Add all subscriptions
  subscriptions.forEach(sub => {
    channel.on(
      'postgres_changes' as any,
      {
        event: sub.event,
        schema: sub.schema,
        table: sub.table,
        filter: sub.filter
      },
      sub.callback
    );
  });

  return channel;
}

// Auto-reconnect on window focus
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    console.log('[Realtime] Window focused, checking channel health...');
    const statuses = realtimeManager.getAllChannelStatuses();

    Object.entries(statuses).forEach(([name, status]) => {
      if (status !== 'joined') {
        console.log(`[Realtime] Channel ${name} needs reconnection (status: ${status})`);
        // Trigger reconnection logic here if needed
      }
    });
  });

  // Disable periodic health check to reduce WebSocket noise
  // Only check when window focus changes (above)
}