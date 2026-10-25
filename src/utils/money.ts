/**
 * Line revenue in kobo. sellKobo is the unit price.
 * discountKobo is optional and is the same unit (kobo), matching the live
 * sale write in App.jsx (final_amount and discount_amount stored as kobo).
 * A missing quantity counts as 1 so a one-item sale is not dropped.
 */
export function lineTotalKobo(sale: {
  sellKobo?: number | null;
  qty?: number | null;
  discountKobo?: number | null;
}): number {
  const unit = Number(sale.sellKobo) || 0;
  const qty = sale.qty == null ? 1 : Number(sale.qty) || 0;
  const discount = Number(sale.discountKobo) || 0;
  return Math.max(0, Math.round(unit * qty) - Math.round(discount));
}

/** Naira number (not a formatted string) for totals that already divide kobo by 100. */
export function lineRevenueNaira(sale: {
  sellKobo?: number | null;
  qty?: number | null;
  discountKobo?: number | null;
}): number {
  return lineTotalKobo(sale) / 100;
}

/**
 * Net revenue in kobo. final_amount / finalKobo is already after discount.
 * Otherwise unit price × quantity, minus discount. Never a float naira sum.
 */
export function saleRevenueKobo(sale: {
  sellKobo?: number | null;
  qty?: number | null;
  quantity?: number | null;
  unit_price?: number | null;
  discountKobo?: number | null;
  discount_amount?: number | null;
  finalKobo?: number | null;
  final_amount?: number | null;
}): number {
  const finalAmount = sale.finalKobo ?? sale.final_amount;
  if (finalAmount != null && finalAmount !== ('' as unknown) && Number.isFinite(Number(finalAmount))) {
    return Math.max(0, Math.round(Number(finalAmount)));
  }
  return lineTotalKobo({
    sellKobo: sale.sellKobo ?? sale.unit_price,
    qty: sale.qty ?? sale.quantity,
    discountKobo: sale.discountKobo ?? sale.discount_amount,
  });
}

/**
 * Ajo pot in integer kobo. 7 × ₦1,500.50 = 1,050,350 kobo (₦10,503.50).
 * The database RPC uses the same rounding. Do not use float multiplication
 * on the naira amount for the stored pot.
 */
export function ajoPotKobo(unitNaira: number, memberCount: number): number {
  const unitKobo = Math.round(Number(unitNaira) * 100);
  const members = Math.max(0, Math.trunc(Number(memberCount) || 0));
  return unitKobo * members;
}

export function formatNaira(value: unknown): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '₦0';
  const s = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
  // Ensure the symbol is ₦ (some environments render NGN)
  return s.replace('NGN', '₦');
}

export function safeMoney(value: unknown): string {
  try { return formatNaira(value); }
  catch { return `₦${Number(value ?? 0).toLocaleString()}`; }
}
