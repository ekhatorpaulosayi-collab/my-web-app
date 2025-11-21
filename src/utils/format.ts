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

export function formatInt(num: number): string {
  return intFormatter.format(num);
}
