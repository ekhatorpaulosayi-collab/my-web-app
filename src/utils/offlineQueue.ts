/**
 * Offline queue for pending sales
 * Stores sales locally when offline and syncs when back online
 */

const QUEUE_KEY = 'storehouse:pending-sales:v1';

export interface QueuedSale {
  id: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export const enqueueSale = (payload: any): void => {
  try {
    const queue = getQueue();
    const sale: QueuedSale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      payload,
      timestamp: Date.now(),
      retries: 0
    };
    queue.push(sale);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.info('[OfflineQueue] Sale queued:', sale.id);
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue:', err);
  }
};

export const getQueue = (): QueuedSale[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const removeFromQueue = (id: string): void => {
  try {
    const queue = getQueue().filter(s => s.id !== id);
    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_KEY);
    } else {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
    console.info('[OfflineQueue] Removed:', id);
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove:', err);
  }
};

export const incrementRetries = (id: string): void => {
  try {
    const queue = getQueue().map(s =>
      s.id === id ? { ...s, retries: s.retries + 1 } : s
    );
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineQueue] Failed to increment retries:', err);
  }
};

export const clearQueue = (): void => {
  try {
    localStorage.removeItem(QUEUE_KEY);
    console.info('[OfflineQueue] Queue cleared');
  } catch (err) {
    console.error('[OfflineQueue] Failed to clear queue:', err);
  }
};
