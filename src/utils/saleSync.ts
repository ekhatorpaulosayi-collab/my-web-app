/**
 * Which sale-sync failures will never succeed on retry.
 * Network failures and a missing session stay retryable.
 */
export function isPermanentSaleError(error: { code?: string; message?: string; permanent?: boolean } | null | undefined): boolean {
  if (!error) return false;
  if (error.permanent) return true;
  const code = String(error.code || '');
  if (code === '42501' || code === '23502' || code === '23503' || code === '23514' || code === '23505' || code === '42804') return true;
  if (code.startsWith('22')) return true;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('product selection is required') ||
    message.includes('not_allowed') ||
    message.includes('discount_exceeds_total') ||
    message.includes('invalid_quantity') ||
    message.includes('invalid_price') ||
    message.includes('invalid_channel') ||
    message.includes('invalid_client_sale_id') ||
    message.includes('invalid_sale_time') ||
    message.includes('unknown_product') ||
    message.includes('insufficient_stock') ||
    message.includes('price_mismatch')
  );
}
