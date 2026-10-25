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
