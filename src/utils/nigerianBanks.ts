/**
 * List of Nigerian Banks
 * For use in payment details dropdowns
 */

export const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Opay',
  'PalmPay',
  'Parallex Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered',
  'Sterling Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
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
