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
