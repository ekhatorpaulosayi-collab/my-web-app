export type ChatReserveInput = {
  hasSubscription: boolean;
  grandfathered: boolean;
  used: number;
  limit: number;
  /** False when ai_chats_reset_at is before the current month. */
  periodStartedThisMonth: boolean;
};

/**
 * Same decision as increment_chat_usage. A missing subscription and a
 * grandfathered row are allowed. A new month starts at 1. The count moves
 * only while it is still under the catalogue limit.
 */
export function decideChatReserve(input: ChatReserveInput) {
  const used = Number.isFinite(input.used) ? input.used : 0;
  if (!input.hasSubscription) return { used, reserved: true };
  if (input.grandfathered || input.limit < 0) {
    return { used: input.periodStartedThisMonth ? used + 1 : 1, reserved: true };
  }
  if (!input.periodStartedThisMonth) return { used: 1, reserved: true };
  if (used >= input.limit) return { used, reserved: false };
  return { used: used + 1, reserved: true };
}

/** One statement in SQL: increment only while used is still under the limit. */
export function reserveChatUnit(used: number, limit: number) {
  const current = Number.isFinite(used) ? used : 0;
  if (current >= limit) return { used: current, reserved: false };
  return { used: current + 1, reserved: true };
}

export function releaseChatUnit(used: number) {
  const current = Number.isFinite(used) ? used : 0;
  if (current <= 0) return 0;
  return current - 1;
}

/** In-memory stand-in for the single UPDATE ... WHERE used < limit. */
export class AtomicChatQuota {
  used: number;

  constructor(public limit: number, used = 0) {
    this.used = used;
  }

  private tail: Promise<void> = Promise.resolve();

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(() => undefined, () => undefined);
    return run;
  }

  reserve() {
    return this.exclusive(async () => {
      await Promise.resolve();
      const next = reserveChatUnit(this.used, this.limit);
      this.used = next.used;
      return next.reserved;
    });
  }

  release() {
    return this.exclusive(async () => {
      this.used = releaseChatUnit(this.used);
    });
  }
}
