/**
 * Pure decisions shared by the Paystack webhook, affiliate ledger, and AI chat.
 * No Deno or Supabase imports, so unit tests can load this file with tsx.
 */

export function chargeSuccessOutcome(paymentRecorded: boolean, inventoryFailed: boolean): {
  httpStatus: number;
  queueInventory: boolean;
} {
  if (!paymentRecorded) {
    return { httpStatus: 500, queueInventory: false };
  }
  return { httpStatus: 200, queueInventory: inventoryFailed };
}

export type SignupAction = 'count_in_rpc' | 'increment_fallback' | 'already_counted';

/** Repeating mark_signup must not add another total_signups. */
export function markSignupAction(input: {
  rpcAvailable: boolean;
  rpcCounted: boolean;
  claimedClick: boolean;
}): SignupAction {
  if (!input.rpcAvailable) {
    return input.claimedClick ? 'increment_fallback' : 'already_counted';
  }
  return input.rpcCounted ? 'count_in_rpc' : 'already_counted';
}

export function aiSpendGate(input: { rpcMissing: boolean; reserved: boolean }): 'ok' | 'capped' | 'uninstalled' {
  if (input.rpcMissing) return 'uninstalled';
  return input.reserved ? 'ok' : 'capped';
}

export function isBuiltInChatOrigin(origin: string, extraOrigins: string[] = []): boolean {
  const allowed = new Set([
    'https://www.storehouse.ng',
    'https://storehouse.ng',
    ...extraOrigins.filter(Boolean),
  ]);
  if (allowed.has(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin) || origin === 'http://localhost' || origin === 'https://localhost') return true;
  if (origin === 'capacitor://localhost') return true;
  if (/^https:\/\/[a-z0-9-]+\.storehouse\.ng$/.test(origin)) return true;
  return false;
}

/** Verified custom_domain values become https origins (apex and www). */
export function originsForVerifiedDomain(customDomain: string): string[] {
  const host = String(customDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return [];
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) return [];
  return [`https://${host}`, `https://www.${host}`];
}
