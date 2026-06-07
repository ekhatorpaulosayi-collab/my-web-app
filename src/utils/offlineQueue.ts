/**
 * DEPRECATED / NEUTRALIZED (Option b single-path migration).
 *
 * This localStorage offline-sales queue caused data loss: offline sales were
 * written here ('storehouse:pending-sales:v1') but the reconnect drain reads the
 * IndexedDB `sales` store, so they never synced. Offline sales now go straight to
 * IndexedDB via handleSaveSale (IDB-first) and are synced by the app-level
 * reconnect drain (syncOfflineSales). This module is no longer imported.
 *
 * To guarantee nothing ever writes this key again (and to avoid stale data being
 * mistaken for pending work), enqueueSale is a NO-OP and the key is cleared on load.
 * Any sales already stranded in this key are intentionally discarded (test data,
 * already non-syncing) — no migration, per the approved decision.
 */

const QUEUE_KEY = 'storehouse:pending-sales:v1';

// Clear any leftover stranded queue on module load (one-time neutralization).
try {
  localStorage.removeItem(QUEUE_KEY);
} catch {
  /* ignore */
}

export interface QueuedSale {
  id: string;
  payload: any;
  timestamp: number;
  retries: number;
}

// NEUTRALIZED: never write the localStorage queue again. Kept as a no-op so any
// stray/legacy import cannot reintroduce the double-write / data-loss path.
export const enqueueSale = (_payload: any): void => {
  console.warn('[OfflineQueue] enqueueSale is neutralized (Option b single-path). Sale NOT queued to localStorage.');
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
