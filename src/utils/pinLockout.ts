export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000;

export interface PinLockState {
  attempts: number;
  lockedUntil: number;
}

/** Next state after a wrong PIN. An active lock does not add another attempt. */
export function nextPinFailure(state: PinLockState, now: number): PinLockState & { locked: boolean } {
  if (state.lockedUntil > now) {
    return { attempts: state.attempts, lockedUntil: state.lockedUntil, locked: true };
  }
  const baseAttempts = state.lockedUntil > 0 && state.lockedUntil <= now ? 0 : state.attempts;
  const attempts = baseAttempts + 1;
  const locked = attempts >= PIN_MAX_ATTEMPTS;
  return {
    attempts,
    lockedUntil: locked ? now + PIN_LOCK_MS : 0,
    locked,
  };
}
