/**
 * Enhanced Offline Queue
 * Extends existing queue to support products, customers, and other operations
 * Backward compatible with existing sales queue
 */

// Queue keys for different operation types
const QUEUE_KEYS = {
  sales: 'storehouse:pending-sales:v1',
  products: 'storehouse:pending-products:v1',
  customers: 'storehouse:pending-customers:v1',
} as const;

export type QueueType = keyof typeof QUEUE_KEYS;

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  retries: number;
  lastError?: string;
}

/**
 * Generic queue operations
 */
class OfflineQueue {
  private getQueueKey(queueType: QueueType): string {
    return QUEUE_KEYS[queueType];
  }

  /**
   * Add operation to queue
   */
  enqueue(queueType: QueueType, type: 'create' | 'update' | 'delete', payload: any): string {
    try {
      const queue = this.getQueue(queueType);
      const operation: QueuedOperation = {
        id: `${queueType}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0
      };

      queue.push(operation);
      this.saveQueue(queueType, queue);

      console.info(`[OfflineQueue] ${queueType} ${type} queued:`, operation.id);

      // Dispatch custom event so UI can update
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated', {
        detail: { queueType, operation }
      }));

      return operation.id;
    } catch (err) {
      console.error(`[OfflineQueue] Failed to enqueue ${queueType}:`, err);
      throw err;
    }
  }

  /**
   * Get all operations in queue
   */
  getQueue(queueType: QueueType): QueuedOperation[] {
    try {
      const key = this.getQueueKey(queueType);
      const raw = localStorage.getItem(key);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error(`[OfflineQueue] Failed to get ${queueType} queue:`, err);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queueType: QueueType, queue: QueuedOperation[]): void {
    try {
      const key = this.getQueueKey(queueType);
      if (queue.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(queue));
      }
    } catch (err) {
      console.error(`[OfflineQueue] Failed to save ${queueType} queue:`, err);
      throw err;
    }
  }

  /**
   * Remove operation from queue
   */
  remove(queueType: QueueType, id: string): void {
    try {
      const queue = this.getQueue(queueType).filter(op => op.id !== id);
      this.saveQueue(queueType, queue);

      console.info(`[OfflineQueue] Removed ${queueType}:`, id);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated', {
        detail: { queueType, operationId: id, removed: true }
      }));
    } catch (err) {
      console.error(`[OfflineQueue] Failed to remove ${queueType}:`, err);
    }
  }

  /**
   * Update operation (e.g., increment retries, add error)
   */
  update(queueType: QueueType, id: string, updates: Partial<QueuedOperation>): void {
    try {
      const queue = this.getQueue(queueType).map(op =>
        op.id === id ? { ...op, ...updates } : op
      );
      this.saveQueue(queueType, queue);

      console.info(`[OfflineQueue] Updated ${queueType}:`, id, updates);
    } catch (err) {
      console.error(`[OfflineQueue] Failed to update ${queueType}:`, err);
    }
  }

  /**
   * Increment retry count
   */
  incrementRetries(queueType: QueueType, id: string, error?: string): void {
    const queue = this.getQueue(queueType);
    const operation = queue.find(op => op.id === id);
    if (operation) {
      this.update(queueType, id, {
        retries: operation.retries + 1,
        lastError: error
      });
    }
  }

  /**
   * Clear all operations in queue
   */
  clear(queueType: QueueType): void {
    try {
      const key = this.getQueueKey(queueType);
      localStorage.removeItem(key);
      console.info(`[OfflineQueue] Cleared ${queueType} queue`);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated', {
        detail: { queueType, cleared: true }
      }));
    } catch (err) {
      console.error(`[OfflineQueue] Failed to clear ${queueType} queue:`, err);
    }
  }

  /**
   * Get total count of all pending operations
   */
  getTotalCount(): number {
    return (
      this.getQueue('sales').length +
      this.getQueue('products').length +
      this.getQueue('customers').length
    );
  }

  /**
   * Get operations that need retry (exceeded max retries)
   */
  getFailedOperations(queueType: QueueType, maxRetries: number = 3): QueuedOperation[] {
    return this.getQueue(queueType).filter(op => op.retries >= maxRetries);
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Backward compatibility - existing code uses these functions
 */
export const enqueueSale = (payload: any): string => {
  return offlineQueue.enqueue('sales', 'create', payload);
};

export const getQueue = (): QueuedOperation[] => {
  return offlineQueue.getQueue('sales');
};

export const removeFromQueue = (id: string): void => {
  offlineQueue.remove('sales', id);
};

export const incrementRetries = (id: string): void => {
  offlineQueue.incrementRetries('sales', id);
};

export const clearQueue = (): void => {
  offlineQueue.clear('sales');
};
