/**
 * List of Nigerian Banks
 * For use in payment details dropdowns
 */

// NOTE: Nigerian fintechs (Opay, Kuda, Moniepoint, PalmPay, etc.)
// are intentionally omitted from this list.
// Their Paystack bank codes are 5-6 digits (e.g. Opay=999992,
// Kuda=50211) but the resolve-bank-account edge function
// currently validates bank_code with regex /^\d{3}$/ which only
// accepts 3-digit codes.
//
// To add fintechs: first relax the regex in
// supabase/functions/resolve-bank-account/index.ts:33 and the
// corresponding check in create-paystack-subaccount, then add
// entries below.
//
// Pending fix in Session 3 proper.

export interface BankWithCode {
  name: string;
  code: string;
}

/**
 * Nigerian banks with their 3-digit Paystack bank codes.
 * Used by the Paystack subaccount wizard.
 * Codes verified against Paystack's /bank registry.
 */
export const NIGERIAN_BANKS_WITH_CODES: BankWithCode[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Legacy name-only bank list. Retained for back-compat with
 * StoreSettings.tsx and OnlineStoreSetup.tsx which predate the
 * Paystack subaccount work and only need bank names.
 *
 * Derived from NIGERIAN_BANKS_WITH_CODES so the two lists stay
 * in sync, plus an 'Other' option that existed historically.
 */
export const NIGERIAN_BANKS: string[] = [
  ...NIGERIAN_BANKS_WITH_CODES.map((b) => b.name),
  'Other',
].sort();

/**
 * Validate Nigerian account number
 * Must be exactly 10 digits
 */
export function validateAccountNumber(accountNumber: string): boolean {
  const cleaned = accountNumber.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Format account number for display
 * Example: 0123456789 → 0123456789 (no formatting needed, just validation)
 */
export function formatAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/\D/g, '').slice(0, 10);
}
