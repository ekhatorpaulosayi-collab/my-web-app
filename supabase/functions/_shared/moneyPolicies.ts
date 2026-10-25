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

/**
 * A call with no Origin is rejected, including a signed-in browser and a
 * native client. A header that claims to be the Capacitor app is not an
 * exception: anyone can send it. A present Origin is allowed only when it
 * is on the allowlist. `capacitor://localhost` is a built-in origin when
 * the Origin header is actually present. `authenticated` does not unlock
 * a missing Origin.
 */
export function chatCallAllowed(input: {
  origin: string | null;
  originAllowed: boolean;
  authenticated: boolean;
}): boolean {
  void input.authenticated;
  if (!input.origin) return false;
  return input.originAllowed;
}

/**
 * A custom domain is on the allowlist only when the store row has
 * custom_domain_verified = true. An empty domain_verification_token is not
 * verification. The DNS TXT function is the only writer of that flag.
 */
export function customDomainIsVerified(row: {
  custom_domain?: string | null;
  custom_domain_verified?: boolean | null;
}): boolean {
  const domain = String(row.custom_domain || '').trim();
  return Boolean(domain) && row.custom_domain_verified === true;
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
