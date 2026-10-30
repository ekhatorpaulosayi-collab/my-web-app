/**
 * Store delivery_fee is a shopper-facing naira string such as "₦1,500".
 * Money elsewhere is integer kobo. "Free" and blank values are zero.
 */
export function deliveryFeeKobo(fee: unknown): number {
  if (typeof fee === 'number') {
    if (!Number.isFinite(fee) || fee <= 0) return 0;
    return Math.round(fee * 100);
  }
  const text = String(fee ?? '').trim();
  if (!text || /free/i.test(text)) return 0;
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const naira = Number(match[1]);
  if (!Number.isFinite(naira) || naira <= 0) return 0;
  return Math.round(naira * 100);
}

export function orderTotalKobo(itemsAfterDiscountKobo: number, deliveryFee: unknown): number {
  const items = Number.isFinite(itemsAfterDiscountKobo) ? itemsAfterDiscountKobo : 0;
  return Math.max(0, Math.round(items) + deliveryFeeKobo(deliveryFee));
}
