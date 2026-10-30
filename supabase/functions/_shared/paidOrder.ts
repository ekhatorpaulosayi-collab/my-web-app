const OPEN_ORDER = new Set(['pending', 'paid', 'verified']);

/** A Paystack reference may fulfil only the server order that was priced for it. */
export function bindPaidOrder(input: {
  reference: string;
  paystackStatus: string;
  paystackAmount: number;
  paystackCurrency: string;
  order: null | { status: string; total_amount_kobo: number; primary_store_id: string };
}): { ok: true; mode: 'delegate' | 'fulfil' } | { ok: false; error: string } {
  if (input.reference.startsWith('ord_')) return { ok: true, mode: 'delegate' };
  if (input.paystackStatus !== 'success') return { ok: false, error: 'paystack_verify_failed' };
  if (!input.order) return { ok: false, error: 'no_server_order' };
  if (String(input.paystackCurrency || '').toUpperCase() !== 'NGN') return { ok: false, error: 'wrong_currency' };
  if (!Number.isInteger(input.paystackAmount) || input.paystackAmount !== input.order.total_amount_kobo) {
    return { ok: false, error: 'amount_mismatch' };
  }
  if (!input.order.primary_store_id) return { ok: false, error: 'missing_store' };
  if (!OPEN_ORDER.has(String(input.order.status || ''))) return { ok: false, error: 'order_not_open' };
  return { ok: true, mode: 'fulfil' };
}
