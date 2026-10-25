/**
 * Mirrors generate_invoice_number() in
 * supabase/migrations/20261023_02_invoice_numbers_stores_columns_staff.sql.
 * The database function is the source of truth (it also takes an advisory lock).
 * This pure helper is what the tests lock, so a numbering change has to update both.
 */

const INVOICE_NUMBER = /^INV-(\d+)$/;

export function nextInvoiceNumber(existingNumbers: readonly string[]): string {
  let max = 0;
  for (const value of existingNumbers) {
    const match = INVOICE_NUMBER.exec(value);
    if (!match) continue;
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `INV-${String(max + 1).padStart(3, '0')}`;
}

/** Two merchants may both hold INV-001. Uniqueness is (user, number), not the number alone. */
export function invoiceNumberKey(userId: string, invoiceNumber: string): string {
  return `${userId}::${invoiceNumber}`;
}
