/**
 * Formatting utilities for Storehouse
 * Provides consistent number and currency formatting across the app
 */

const ngnFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const intFormatter = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function currencyNGN(kobo: number | undefined | null): string {
  // Handle invalid values gracefully
  if (kobo === undefined || kobo === null || isNaN(kobo) || kobo < 0) {
    return '₦0';
  }
  const naira = kobo / 100;
  return ngnFormatter.format(naira);
}

const ngnFormatter2dp = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Storefront receipt / order-confirmation money: customers pay exact
// gross-up amounts (e.g. the ₦203.05 from the F3 fee-absorb formula), so
// dropping the kobo misstates what was charged. Show 2dp ONLY when the
// amount has non-zero kobo; whole-naira amounts stay clean (no ".00").
// Scoped to customer-facing storefront receipts — the app-wide
// currencyNGN (whole naira) is unchanged.
export function currencyNGNExact(kobo: number | undefined | null): string {
  if (kobo === undefined || kobo === null || isNaN(kobo) || kobo < 0) {
    return '₦0';
  }
  const naira = kobo / 100;
  return (kobo % 100 === 0 ? ngnFormatter : ngnFormatter2dp).format(naira);
}

export function formatInt(num: number): string {
  return intFormatter.format(num);
}
