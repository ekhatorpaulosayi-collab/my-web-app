/**
 * Currency formatting utilities for Nigerian Naira
 */

const ngn = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

export const formatNGN = (n: number): string => {
  const safe = Math.max(0, Number.isFinite(n) ? n : 0);
  return ngn.format(safe).replace('NGN', '₦');
};

export const parseMoney = (s: string): number => {
  return Number(String(s).replace(/[^\d.-]/g, '')) || 0;
};

export const formatMoneyInput = (s: string): string => {
  const num = parseMoney(s);
  return num > 0 ? num.toLocaleString() : '';
};
