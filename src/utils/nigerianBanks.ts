/**
 * List of Nigerian Banks
 * For use in payment details dropdowns
 */

// Nigerian fintechs (Opay, Kuda, Moniepoint, PalmPay) are included
// alongside traditional banks. Their Paystack codes are 5-6 digits;
// resolve-bank-account validates bank_code with /^\d{3,6}$/.

export interface BankWithCode {
  name: string;
  code: string;
}

/**
 * Nigerian banks with their 3-digit Paystack bank codes.
 * Used by the Paystack subaccount wizard.
 * Codes verified against Paystack's /bank registry.
 */
const REAL_NIGERIAN_BANKS: BankWithCode[] = [
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
  { name: 'Kuda Microfinance Bank', code: '50211' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'Opay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
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

// Dev-only synthetic bank entry. Paystack accepts code=001 +
// account_number=0000000000 as a test combo that bypasses the
// 3-resolves-per-day quota on real banks. Tree-shaken out of
// production builds by Vite (import.meta.env.DEV is a static
// boolean replaced at build time).
const testBanks: BankWithCode[] = import.meta.env.DEV
  ? [{ name: 'Paystack Test Bank (dev only)', code: '001' }]
  : [];

export const NIGERIAN_BANKS_WITH_CODES: BankWithCode[] = [
  ...testBanks,
  ...REAL_NIGERIAN_BANKS,
];

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
