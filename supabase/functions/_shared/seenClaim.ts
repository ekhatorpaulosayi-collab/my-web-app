/** How long a pending claim blocks a retry after the worker stops. */
export const PENDING_TTL_MS = 2 * 60 * 1000;
/** Sent rows are eligible for the throttled sweep after this age. */
export const SENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Table sweep runs about this often, or once an hour, whichever comes first. */
export const CLEANUP_EVERY = 50;
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export type ClaimResult = 'claimed' | 'replay';

export interface SeenStore {
  releaseExpiredPending(id: string, cutoffMs: number): Promise<void>;
  /** Atomic INSERT ... ON CONFLICT DO NOTHING of a pending row. True only for the inserter. */
  insertPending(id: string, at: number): Promise<boolean>;
  markSent(id: string): Promise<void>;
  releasePending(id: string): Promise<void>;
}

/**
 * One delivery wins. The others are replays. insertPending is the atomic claim;
 * a check before it would let concurrent callers all continue.
 */
export async function claimDelivery(store: SeenStore, id: string, now = Date.now()): Promise<ClaimResult> {
  await store.releaseExpiredPending(id, now - PENDING_TTL_MS);
  const inserted = await store.insertPending(id, now);
  return inserted ? 'claimed' : 'replay';
}

/** Per-isolate stand-in used until whatsapp_seen_messages exists. */
export class MemorySeenStore implements SeenStore {
  readonly rows = new Map<string, { status: 'pending' | 'sent'; at: number }>();
  private tail: Promise<void> = Promise.resolve();

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(() => undefined, () => undefined);
    return run;
  }

  releaseExpiredPending(id: string, cutoffMs: number) {
    return this.exclusive(async () => {
      const row = this.rows.get(id);
      if (row && row.status === 'pending' && row.at <= cutoffMs) this.rows.delete(id);
    });
  }

  insertPending(id: string, at: number) {
    return this.exclusive(async () => {
      await Promise.resolve();
      if (this.rows.has(id)) return false;
      this.rows.set(id, { status: 'pending', at });
      while (this.rows.size > 1000) {
        const oldest = this.rows.keys().next().value;
        if (!oldest) break;
        this.rows.delete(oldest);
      }
      return true;
    });
  }

  markSent(id: string) {
    return this.exclusive(async () => {
      const row = this.rows.get(id);
      if (!row) return;
      row.status = 'sent';
      row.at = Date.now();
    });
  }

  releasePending(id: string) {
    return this.exclusive(async () => {
      const row = this.rows.get(id);
      if (row?.status === 'pending') this.rows.delete(id);
    });
  }
}
