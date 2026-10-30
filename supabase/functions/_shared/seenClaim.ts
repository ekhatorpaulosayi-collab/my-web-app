/** How long a pending claim blocks a retry after the worker stops heartbeating. */
export const PENDING_TTL_MS = 2 * 60 * 1000;
/** Refresh a live pending row often enough that the AI step cannot outlast it. */
export const HEARTBEAT_MS = 30_000;
/** Sent rows are eligible for the throttled sweep after this age. */
export const SENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Table sweep runs about this often, or once an hour, whichever comes first. */
export const CLEANUP_EVERY = 50;
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export type SeenStatus = 'pending' | 'sent';
/** claimed: this worker replies. replay: already sent. pending: another worker still has it. */
export type ClaimResult = 'claimed' | 'replay' | 'pending';

export interface SeenStore {
  releaseExpiredPending(id: string, cutoffMs: number): Promise<void>;
  /** Atomic INSERT ... ON CONFLICT DO NOTHING of a pending row. True only for the inserter. */
  insertPending(id: string, at: number): Promise<boolean>;
  statusOf(id: string): Promise<SeenStatus | null>;
  touchPending(id: string, at: number): Promise<void>;
  markSent(id: string): Promise<void>;
  releasePending(id: string): Promise<void>;
}

/**
 * One delivery wins. A row that is still pending is not a replay: the caller
 * answers 503 so the provider retries. 200 is only for status sent.
 */
export async function claimDelivery(store: SeenStore, id: string, now = Date.now()): Promise<ClaimResult> {
  await store.releaseExpiredPending(id, now - PENDING_TTL_MS);
  const inserted = await store.insertPending(id, now);
  if (inserted) return 'claimed';
  const status = await store.statusOf(id);
  return status === 'sent' ? 'replay' : 'pending';
}

/** A no-id retry that crossed the bucket boundary still matches the previous key. */
export async function claimWithPrevious(
  store: SeenStore,
  id: string,
  previousId: string,
  now = Date.now(),
): Promise<ClaimResult> {
  if (previousId) {
    await store.releaseExpiredPending(previousId, now - PENDING_TTL_MS);
    const earlier = await store.statusOf(previousId);
    if (earlier === 'sent') return 'replay';
    if (earlier === 'pending') return 'pending';
  }
  return claimDelivery(store, id, now);
}

/** Keep seen_at moving while the reply is still being built. */
export function startClaimHeartbeat(touch: () => Promise<void>, intervalMs = HEARTBEAT_MS) {
  const timer = setInterval(() => {
    touch().catch(() => undefined);
  }, intervalMs);
  const handle = timer as { unref?: () => void };
  if (typeof handle.unref === 'function') handle.unref();
  return () => clearInterval(timer);
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

  statusOf(id: string) {
    return this.exclusive(async () => this.rows.get(id)?.status ?? null);
  }

  touchPending(id: string, at: number) {
    return this.exclusive(async () => {
      const row = this.rows.get(id);
      if (row?.status === 'pending') row.at = at;
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
